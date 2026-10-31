import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@/generated/prisma/client";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { createEmptyDraftPayload } from "./draft-schema";
import { FakeA7CloudClient } from "./testing/a7-fake-cloud";

// Explicit opt-in, fixed disposable loopback target, and no project env file.
const run = process.env.AYAWARTA_A7_DB_TEST === "1";
const isolatedUrl = "postgresql://postgres@127.0.0.1:55435/ayawarta_a7";
const state = vi.hoisted(() => ({ db: null as unknown, failFinalizeOnce: false }));

vi.mock("@/lib/server/db", () => ({ prisma: state.db, default: state.db }));
vi.mock("@/features/auth/service", () => ({
  requireAdminSession: async () => ({ id: state.db ? (state as { actorId?: string }).actorId : "", email: "a7@example.invalid", name: "A7 Admin", role: "ADMIN" }),
}));
vi.mock("@/lib/server/env", () => ({ getServerEnv: () => ({
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "uhwi7xvb", CLOUDINARY_API_KEY: "a7-dummy", CLOUDINARY_API_SECRET: "a7-dummy",
}) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("cloudinary", () => ({ v2: {
  config: () => { throw new Error("A7 forbids real Cloudinary configuration"); },
  api: { resource: () => { throw new Error("A7 forbids real Cloudinary reads"); } },
  uploader: { upload_stream: () => { throw new Error("A7 forbids real Cloudinary uploads"); } },
} }));
vi.mock("./media-cloudinary", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./media-cloudinary")>()),
  RealAdminMediaCloudClient: (await import("./testing/a7-fake-cloud")).FakeA7CloudClient,
}));

type DbTransaction = Prisma.TransactionClient;

/** The one-shot fault happens after remote readback, before DB media linking. */
function withFinalizeFault(db: PrismaClient): PrismaClient {
  return new Proxy(db, {
    get(target, key) {
      if (key === "$transaction") return (callback: (tx: DbTransaction) => Promise<unknown>, options: { isolationLevel: "Serializable" | "ReadCommitted" }) =>
        db.$transaction((tx) => callback(new Proxy(tx, {
          get(transaction, transactionKey) {
            if (transactionKey === "mediaAsset") return new Proxy(transaction.mediaAsset, {
              get(delegate, method) {
                if (method === "create") return (input: Parameters<typeof delegate.create>[0]) => {
                  if (state.failFinalizeOnce) {
                    state.failFinalizeOnce = false;
                    throw new Error("A7 injected media-link failure");
                  }
                  return delegate.create(input);
                };
                return Reflect.get(delegate, method);
              },
            });
            return Reflect.get(transaction, transactionKey);
          },
        })), options);
      return Reflect.get(target, key);
    },
  }) as PrismaClient;
}

describe.skipIf(!run)("A7 isolated route-to-publication flow with fake provider", () => {
  it("retries, recovers a remote-success DB fault, and publishes only verified saved media", async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(isolatedUrl) });
    try {
      const target = await db.$queryRaw<Array<{ address: string; port: number; database: string }>>`
        SELECT inet_server_addr()::text AS address, inet_server_port() AS port, current_database() AS database
      `;
      expect(target).toHaveLength(1);
      expect(target[0]).toMatchObject({ port: 55435, database: "ayawarta_a7" });
      expect(target[0].address).toMatch(/^127\.0\.0\.1(?:\/32)?$/);

      const actorId = `a7-admin-${randomUUID()}`;
      (state as { actorId?: string }).actorId = actorId;
      state.db = withFinalizeFault(db);
      state.failFinalizeOnce = false;
      FakeA7CloudClient.reset();
      vi.stubEnv("AYAWARTA_A5_MEDIA", "enabled");
      vi.stubEnv("AYAWARTA_A5_APPROVED_CLOUD", "uhwi7xvb");
      vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "uhwi7xvb");
      vi.stubGlobal("fetch", () => { throw new Error("A7 forbids outbound HTTP"); });

      // Dynamic imports occur after the target check and the default DB/provider mocks.
      const { POST } = await import("@/app/admin/api/drafts/[id]/media/route");
      const { createInvitationDraftAction, recoverDraftMediaAction, saveInvitationDraftAction,
        reviewInvitationDraftAction, publishInvitationDraftAction } = await import("@/app/admin/actions");
      await db.user.create({ data: { id: actorId, email: `${actorId}@a7.local`, name: "A7 Admin", passwordHash: "isolated-test-only", role: "ADMIN" } });
      const payload = createEmptyDraftPayload();
      payload.slug = `a7-${randomUUID().slice(0, 12)}`;
      payload.weddingDate = "2027-06-12T02:00:00.000Z";
      payload.partners.groom.name = "Damar";
      payload.partners.bride.name = "Raras";
      payload.events = [{ key: "event-1", name: "Upacara Pernikahan", displayDate: "12 Juni 2027", displayTime: "09.00 WIB",
        location: "Bandung", address: "Bandung", mapUrl: "https://maps.example.com" }];
      const created = await createInvitationDraftAction(payload);
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      const draftId = created.data.id;
      const draftVersion = created.data.draftVersion;

      async function postImage(slot: string, key: string, body: Buffer) {
        const request = new Request(`http://localhost:3001/admin/api/drafts/${draftId}/media`, {
          method: "POST",
          headers: { origin: "http://localhost:3001", "content-type": "image/png", "x-ayawarta-media-slot": slot,
            "x-ayawarta-draft-version": String(draftVersion), "idempotency-key": key },
          body: new Uint8Array(body),
        });
        const response = await POST(request, { params: Promise.resolve({ id: draftId }) });
        return { status: response.status, result: await response.json() as { ok: boolean; code?: string; recoveryId?: string;
          data?: { provisionId: string; asset: { id: string } } } };
      }

      const sample = (color: string) => sharp({ create: { width: 32, height: 40, channels: 3, background: color } }).png().toBuffer();
      const heroBytes = await sample("#c98091");
      const heroKey = randomUUID();
      const first = await postImage("hero", heroKey, heroBytes);
      expect(first).toMatchObject({ status: 200, result: { ok: true } });
      const heroId = first.result.data!.asset.id;
      expect(FakeA7CloudClient.uploadCount).toBe(1);
      const repeated = await postImage("hero", heroKey, heroBytes);
      expect(repeated.result.data!.asset.id).toBe(heroId);
      expect(FakeA7CloudClient.uploadCount).toBe(1);
      expect(await postImage("hero", heroKey, await sample("#274d82"))).toMatchObject({ status: 409, result: { code: "conflict" } });
      expect(FakeA7CloudClient.uploadCount).toBe(1);

      state.failFinalizeOnce = true;
      const groom = await postImage("groom", randomUUID(), await sample("#b29674"));
      expect(groom).toMatchObject({ status: 503, result: { ok: false, code: "dependency_failure", recoveryId: expect.any(String) } });
      expect(FakeA7CloudClient.uploadCount).toBe(2);
      const pending = await db.draftMediaProvision.findUniqueOrThrow({ where: { id: groom.result.recoveryId } });
      expect(pending).toMatchObject({ state: "RESERVED", mediaAssetId: null });
      expect(await db.mediaAsset.count({ where: { publicId: pending.publicId } })).toBe(0);
      const recovered = await recoverDraftMediaAction({ draftId, provisionId: pending.id, expectedDraftVersion: draftVersion });
      expect(recovered).toMatchObject({ ok: true, data: { provisionId: pending.id } });
      if (!recovered.ok) return;
      const linked = await db.draftMediaProvision.findUniqueOrThrow({ where: { id: pending.id }, include: { mediaAsset: true } });
      expect(linked).toMatchObject({ state: "VERIFIED", mediaAssetId: recovered.data.asset.id,
        mediaAsset: { id: recovered.data.asset.id, publicId: pending.publicId } });
      expect(await db.mediaAsset.count({ where: { publicId: pending.publicId } })).toBe(1);
      expect(FakeA7CloudClient.uploadCount).toBe(2);
      const bride = await postImage("bride", randomUUID(), await sample("#d9c8ab"));
      expect(bride.result.ok).toBe(true);
      expect(FakeA7CloudClient.uploadCount).toBe(3);

      expect(await db.invitation.count({ where: { slug: payload.slug } })).toBe(0);
      payload.heroAssetId = heroId;
      payload.partners.groom.photoAssetId = recovered.data.asset.id;
      payload.partners.bride.photoAssetId = bride.result.data!.asset.id;
      const saved = await saveInvitationDraftAction({ id: draftId, expectedDraftVersion: draftVersion, payload });
      expect(saved).toMatchObject({ ok: true, data: { draftVersion: draftVersion + 1 } });
      if (!saved.ok) return;
      const review = await reviewInvitationDraftAction({ id: draftId });
      expect(review).toMatchObject({ ok: true, data: { invitationId: null, publishedVersion: null, slug: payload.slug } });
      const published = await publishInvitationDraftAction({ id: draftId, expectedDraftVersion: saved.data.draftVersion,
        expectedPublishedVersion: null, confirmationSlug: payload.slug });
      expect(published).toMatchObject({ ok: true, data: { slug: payload.slug, version: 1 } });

      const live = await db.invitation.findUniqueOrThrow({ where: { slug: payload.slug } });
      expect(live).toMatchObject({ publishedVersion: 1, ownerId: actorId, heroAssetId: heroId });
      const publication = await db.invitationPublication.findUniqueOrThrow({
        where: { invitationId_version: { invitationId: live.id, version: 1 } }, include: { media: true },
      });
      expect(publication).toMatchObject({ source: "PUBLISH", actorId, schemaVersion: 1 });
      expect(publication.contentDigest).toMatch(/^[a-f0-9]{64}$/);
      expect(publication.media.map((item) => item.mediaAssetId).sort()).toEqual([
        heroId, recovered.data.asset.id, bride.result.data!.asset.id,
      ].sort());
      expect(await db.invitationDraft.findUniqueOrThrow({ where: { id: draftId } })).toMatchObject({
        invitationId: live.id, basePublishedVersion: 1, draftVersion: saved.data.draftVersion + 1,
      });
      expect(await publishInvitationDraftAction({ id: draftId, expectedDraftVersion: saved.data.draftVersion,
        expectedPublishedVersion: null, confirmationSlug: payload.slug })).toMatchObject({ ok: false, code: "conflict" });
      expect(await db.invitationPublication.count({ where: { invitationId: live.id } })).toBe(1);
    } finally {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
      FakeA7CloudClient.reset();
      state.db = null;
      state.failFinalizeOnce = false;
      await db.$disconnect();
    }
  });
});

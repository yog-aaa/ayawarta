import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { createEmptyDraftPayload } from "./draft-schema";
import { FakeA7CloudClient } from "./testing/a7-fake-cloud";

// Explicit opt-in and a fixed disposable target. Never use .env.local for writes.
const run = process.env.AYAWARTA_SIGER_T5_DB_TEST === "1";
const isolatedUrl = "postgresql://postgres@127.0.0.1:55436/ayawarta_siger";
const state = vi.hoisted(() => ({ db: null as PrismaClient | null, actorId: "" }));

vi.mock("@/lib/server/db", () => ({ prisma: state.db, default: state.db }));
vi.mock("@/features/auth/service", () => ({
  requireAdminSession: async () => ({
    id: state.actorId, email: "siger-t5@example.invalid", name: "Siger T5 Admin", role: "ADMIN",
  }),
}));
vi.mock("@/lib/server/env", () => ({ getServerEnv: () => ({
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "uhwi7xvb", CLOUDINARY_API_KEY: "a7-dummy", CLOUDINARY_API_SECRET: "a7-dummy",
}) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("T5_NOT_FOUND"); } }));
vi.mock("cloudinary", () => ({ v2: {
  config: () => { throw new Error("T5 forbids real Cloudinary configuration"); },
  api: { resource: () => { throw new Error("T5 forbids real Cloudinary reads"); } },
  uploader: { upload_stream: () => { throw new Error("T5 forbids real Cloudinary uploads"); } },
} }));
vi.mock("./media-cloudinary", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./media-cloudinary")>()),
  RealAdminMediaCloudClient: (await import("./testing/a7-fake-cloud")).FakeA7CloudClient,
}));
vi.mock("@/features/invitations/repository", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/features/invitations/repository")>();
  return { ...original, invitationRepository: {
    findBySlug: (slug: string) => {
      if (!state.db) throw new Error("T5 database not verified");
      return original.createInvitationRepository(state.db).findBySlug(slug);
    },
  } };
});

describe.skipIf(!run)("T5 isolated Siger draft to public route", () => {
  it("publishes only the saved, verified Siger content and renders its public route", async () => {
    if (process.env.VERCEL_ENV === "production" || process.env.AYAWARTA_DEPLOYMENT_TARGET === "production") {
      throw new Error("T5 test refuses a production process");
    }
    const db = new PrismaClient({ adapter: new PrismaPg(isolatedUrl) });
    try {
      const target = await db.$queryRaw<Array<{ address: string; port: number; database: string }>>`
        SELECT inet_server_addr()::text AS address, inet_server_port() AS port, current_database() AS database
      `;
      expect(target).toHaveLength(1);
      expect(target[0]).toMatchObject({ port: 55436, database: "ayawarta_siger" });
      expect(target[0].address).toMatch(/^127\.0\.0\.1(?:\/32)?$/);
      const migrations = await db.$queryRaw<Array<{ count: number }>>`
        SELECT count(*)::int AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL
      `;
      expect(migrations[0]?.count).toBe(6);
      expect(await db.user.count()).toBe(0);
      expect(await db.invitation.count()).toBe(0);
      expect(await db.invitationDraft.count()).toBe(0);
      expect(await db.mediaAsset.count()).toBe(0);

      state.db = db;
      state.actorId = `t5-admin-${randomUUID()}`;
      FakeA7CloudClient.reset();
      vi.stubEnv("DATABASE_URL", isolatedUrl);
      vi.stubEnv("DATABASE_URL_POOLED", isolatedUrl);
      vi.stubEnv("AYAWARTA_A5_MEDIA", "enabled");
      vi.stubEnv("AYAWARTA_A5_APPROVED_CLOUD", "uhwi7xvb");
      vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "uhwi7xvb");
      vi.stubEnv("AYAWARTA_SIGER_PUBLISH", "disabled");
      vi.stubEnv("VERCEL_ENV", "development");
      vi.stubEnv("AYAWARTA_DEPLOYMENT_TARGET", "local");
      vi.stubGlobal("fetch", () => { throw new Error("T5 forbids outbound HTTP"); });

      // Imports happen only after the database identity and empty fixture are verified.
      const { POST } = await import("@/app/admin/api/drafts/[id]/media/route");
      const { createInvitationDraftAction, saveInvitationDraftAction,
        reviewInvitationDraftAction, publishInvitationDraftAction } = await import("@/app/admin/actions");
      const { default: InvitationPage } = await import("@/app/[slug]/page");
      const { invitationRepository } = await import("@/features/invitations/repository");

      await db.user.create({ data: { id: state.actorId, email: `${state.actorId}@t5.local`,
        name: "T5 Admin", passwordHash: "isolated-test-only", role: "ADMIN" } });
      const payload = createEmptyDraftPayload();
      payload.slug = `siger-t5-${randomUUID().slice(0, 12)}`;
      payload.meta = { theme: "siger-priangan", variant: "ivory" };
      payload.weddingDate = "2027-06-12T02:00:00.000Z";
      payload.greeting = "Selamat datang di perayaan kami.";
      payload.prayer = "Semoga hari ini membawa kebahagiaan.";
      payload.partners.groom.name = "Damar T5";
      payload.partners.bride.name = "Raras T5";
      payload.events = [{ key: "event-1", name: "Upacara Pernikahan", displayDate: "12 Juni 2027",
        displayTime: "09.00 WIB", location: "Tempat contoh", address: "Alamat contoh, Bandung",
        mapUrl: "https://maps.example.com/t5" }];
      payload.sections.gallery = true;
      payload.sections.loveStory = true;
      payload.galleryItems = [{ key: "gallery-1", assetId: null,
        altText: "Foto Damar dan Raras di taman", caption: "Kenangan di taman" }];
      payload.loveStories = [{ key: "story-1", title: "Pertemuan", content: "Cerita panjang pasangan." }];

      const created = await createInvitationDraftAction(payload);
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      const draftId = created.data.id;
      const draftVersion = created.data.draftVersion;
      expect(await invitationRepository.findBySlug(payload.slug)).toBeNull();
      await expect(InvitationPage({ params: Promise.resolve({ slug: payload.slug }) })).rejects.toThrow("T5_NOT_FOUND");

      async function postImage(slot: string, color: string) {
        const bytes = await sharp({ create: { width: 32, height: 40, channels: 3, background: color } }).png().toBuffer();
        const request = new Request(`http://localhost:3001/admin/api/drafts/${draftId}/media`, {
          method: "POST", headers: { origin: "http://localhost:3001", "content-type": "image/png",
            "x-ayawarta-media-slot": slot, "x-ayawarta-draft-version": String(draftVersion),
            "idempotency-key": randomUUID() }, body: new Uint8Array(bytes),
        });
        const response = await POST(request, { params: Promise.resolve({ id: draftId }) });
        const result = await response.json() as { ok: boolean; data?: { asset: { id: string } } };
        expect(response.status).toBe(200);
        expect(result.ok).toBe(true);
        return result.data!.asset.id;
      }

      payload.heroAssetId = await postImage("hero", "#c98091");
      payload.partners.groom.photoAssetId = await postImage("groom", "#b29674");
      payload.partners.bride.photoAssetId = await postImage("bride", "#d9c8ab");
      payload.galleryItems[0].assetId = await postImage("gallery:gallery-1", "#789270");
      expect(FakeA7CloudClient.uploadCount).toBe(4);
      expect(await invitationRepository.findBySlug(payload.slug)).toBeNull();

      const saved = await saveInvitationDraftAction({ id: draftId, expectedDraftVersion: draftVersion, payload });
      expect(saved.ok).toBe(true);
      if (!saved.ok) return;
      const gated = await reviewInvitationDraftAction({ id: draftId });
      expect(gated).toMatchObject({ ok: false, code: "validation" });
      expect(await db.invitation.count()).toBe(0);

      vi.stubEnv("AYAWARTA_SIGER_PUBLISH", "enabled");
      const review = await reviewInvitationDraftAction({ id: draftId });
      expect(review).toMatchObject({ ok: true, data: { slug: payload.slug,
        invitationId: null, publishedVersion: null } });
      const published = await publishInvitationDraftAction({ id: draftId,
        expectedDraftVersion: saved.data.draftVersion, expectedPublishedVersion: null,
        confirmationSlug: payload.slug });
      expect(published).toMatchObject({ ok: true, data: { slug: payload.slug, version: 1 } });

      const live = await db.invitation.findUniqueOrThrow({ where: { slug: payload.slug },
        include: { galleryItems: true, events: true, loveStories: true } });
      expect(live).toMatchObject({ theme: "siger-priangan", variant: "ivory", publishedVersion: 1,
        ownerId: state.actorId, greeting: payload.greeting, prayer: payload.prayer,
        galleryItems: [{ altText: payload.galleryItems[0].altText, caption: payload.galleryItems[0].caption }] });
      expect(live.events).toHaveLength(1);
      expect(live.loveStories).toHaveLength(1);
      const publication = await db.invitationPublication.findUniqueOrThrow({
        where: { invitationId_version: { invitationId: live.id, version: 1 } }, include: { media: true },
      });
      expect(publication).toMatchObject({ source: "PUBLISH", actorId: state.actorId, schemaVersion: 1 });
      expect(publication.contentDigest).toMatch(/^[a-f0-9]{64}$/);
      expect(publication.media.map((row) => row.mediaAssetId).sort()).toEqual([
        payload.heroAssetId, payload.partners.groom.photoAssetId,
        payload.partners.bride.photoAssetId, payload.galleryItems[0].assetId,
      ].sort());

      const publicHtml = renderToStaticMarkup(await InvitationPage({ params: Promise.resolve({ slug: payload.slug }),
        searchParams: Promise.resolve({ to: "Tamu T5" }) }));
      expect(publicHtml).toContain("Damar T5 &amp; Raras T5");
      expect(publicHtml).toContain(payload.greeting);
      expect(publicHtml).toContain(payload.prayer);
      expect(publicHtml).toContain(payload.galleryItems[0].altText);
      expect(publicHtml).toContain(payload.galleryItems[0].caption);
      expect(publicHtml).toContain("Tamu T5");
      expect(publicHtml).toContain("Alamat contoh, Bandung");
      expect(publicHtml).not.toContain("Pratinjau ilustratif");
      expect(await invitationRepository.findBySlug("siger-t5-unknown")).toBeNull();
    } finally {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
      FakeA7CloudClient.reset();
      state.db = null;
      state.actorId = "";
      await db.$disconnect();
    }
  });
});

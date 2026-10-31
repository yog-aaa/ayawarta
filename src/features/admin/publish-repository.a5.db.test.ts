import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@/generated/prisma/client";
import { describe, expect, it, vi } from "vitest";
import { createEmptyDraftPayload } from "./draft-schema";
import { createDraftMediaRepository } from "./draft-media-repository";
import { createDraftRepository } from "./draft-repository";
import { createPublishRepository } from "./publish-repository";

// Fixed disposable cluster only; this test never reads project env credentials.
const run = process.env.AYAWARTA_A5_DB_TEST === "1";
const isolatedUrl = "postgresql://postgres@127.0.0.1:55434/ayawarta_a5";

describe.skipIf(!run)("A5 isolated first-publication transaction", () => {
  it("rolls back late snapshot failure, then publishes once and reopens its verified retained draft", async () => {
    vi.stubEnv("AYAWARTA_A5_MEDIA", "enabled");
    vi.stubEnv("AYAWARTA_A5_APPROVED_CLOUD", "uhwi7xvb");
    vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "uhwi7xvb");
    const db = new PrismaClient({ adapter: new PrismaPg(isolatedUrl) });
    const suffix = randomUUID().slice(0, 12);
    const actorId = `a5-admin-${suffix}`;
    const slug = `a5-first-${suffix}`;
    try {
      await db.user.create({ data: { id: actorId, email: `${suffix}@a5.local`, name: "A5 Test", passwordHash: "isolated-test-only", role: "ADMIN" } });
      const payload = createEmptyDraftPayload();
      payload.slug = slug;
      payload.weddingDate = "2027-06-12T02:00:00.000Z";
      payload.partners.groom.name = "Damar";
      payload.partners.bride.name = "Raras";
      payload.events = [{ key: "event-1", name: "Upacara Pernikahan", displayDate: "12 Juni 2027", displayTime: "09.00 WIB", location: "Bandung", address: "Bandung", mapUrl: "https://maps.example.com" }];
      const draft = await createDraftRepository(db).createNewDraft({ proposedSlug: slug, payload: payload as unknown as Prisma.InputJsonValue, actorId });
      const mediaRepo = createDraftMediaRepository(db);
      for (const [slot, assign] of [
        ["cover", (id: string) => { payload.heroAssetId = id; }],
        ["groom", (id: string) => { payload.partners.groom.photoAssetId = id; }],
        ["bride", (id: string) => { payload.partners.bride.photoAssetId = id; }],
      ] as const) {
        const sha256 = slot === "cover" ? "a".repeat(64) : slot === "groom" ? "b".repeat(64) : "c".repeat(64);
        const reserved = await mediaRepo.reserve({ draftId: draft.id, slot, idempotencyKey: randomUUID(), expectedDraftVersion: 1, sha256, format: "webp", width: 800, height: 1000, bytes: 1234, actorId });
        const row = await mediaRepo.finalizeVerified({ draftId: draft.id, provisionId: reserved.provision.id, cloudinaryAssetId: randomUUID(), publicId: reserved.provision.publicId,
          secureUrl: `https://res.cloudinary.com/uhwi7xvb/image/upload/v1/${reserved.provision.publicId}.webp`, resourceType: "IMAGE", format: "webp", width: 800, height: 1000, bytes: 1234, originalName: `Foto ${slot}.webp` });
        assign(row.mediaAssetId!);
      }
      const saved = await createDraftRepository(db).saveDraftIfVersion({ id: draft.id, expectedDraftVersion: 1, proposedSlug: slug, payload: payload as unknown as Prisma.InputJsonValue, actorId });
      const input = { id: draft.id, expectedDraftVersion: saved.draftVersion, expectedPublishedVersion: null, confirmationSlug: slug, actorId };
      const injected = { $transaction: (callback: (tx: Prisma.TransactionClient) => Promise<unknown>, options: { isolationLevel: "Serializable" }) =>
        db.$transaction((tx) => callback(new Proxy(tx, { get(target, key) {
          if (key === "invitationPublication") return new Proxy(target.invitationPublication, { get(delegate, method) {
            if (method === "create") return async () => { throw new Error("injected first snapshot failure"); };
            return Reflect.get(delegate, method);
          } });
          return Reflect.get(target, key);
        } })), options) } as unknown as PrismaClient;
      await expect(createPublishRepository(injected).publish(input)).rejects.toThrow("injected first snapshot failure");
      expect(await db.invitation.count({ where: { slug } })).toBe(0);
      expect(await db.invitationPublication.count({ where: { invitation: { slug } } })).toBe(0);
      expect(await db.invitationDraft.findUniqueOrThrow({ where: { id: draft.id } })).toMatchObject({ invitationId: null, draftVersion: saved.draftVersion });

      const result = await createPublishRepository(db).publish(input);
      expect(result).toEqual({ slug, version: 1, publicPath: `/${slug}` });
      const live = await db.invitation.findUniqueOrThrow({ where: { slug }, include: { events: true, partners: true } });
      expect(live).toMatchObject({ publishedVersion: 1, ownerId: actorId });
      expect(live.events.map((event) => event.position)).toEqual([1]);
      expect(await db.invitationPublication.count({ where: { invitationId: live.id, source: "PUBLISH" } })).toBe(1);
      const retained = await db.invitationDraft.findUniqueOrThrow({ where: { id: draft.id } });
      expect(retained).toMatchObject({ invitationId: live.id, basePublishedVersion: 1, draftVersion: saved.draftVersion + 1 });
      await expect(createPublishRepository(db).publish(input)).rejects.toMatchObject({ code: "conflict" });
      expect(await db.invitationPublication.count({ where: { invitationId: live.id } })).toBe(1);
      await expect(createDraftRepository(db).createDraftForPublished({ invitationId: live.id, expectedPublishedVersion: 1, payload: retained.payload as Prisma.InputJsonValue, actorId })).resolves.toMatchObject({ id: draft.id });
    } finally {
      await db.$disconnect();
      vi.unstubAllEnvs();
    }
  });
});

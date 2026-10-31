import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@/generated/prisma/client";
import { describe, expect, it } from "vitest";
import { invitationDetailInclude } from "@/features/invitations/query";
import { createDraftRepository } from "./draft-repository";
import { draftFromPublished } from "./draft-service";
import { buildPublicationSnapshot, digestPublicationSnapshot, publicationMediaIds } from "./publication-snapshot";
import { createPublishRepository } from "./publish-repository";

// Explicit opt-in and a fixed disposable target. This test never loads .env.local.
const run = process.env.AYAWARTA_A4_DB_TEST === "1";
const isolatedUrl = process.env.AYAWARTA_A4_DB_TEST_TARGET === "a5"
  ? "postgresql://postgres@127.0.0.1:55434/ayawarta_a5"
  : "postgresql://postgres@127.0.0.1:55433/ayawarta_a4";

async function removeOwnFixture(db: PrismaClient, invitationId: string, actorId: string, mediaIds: string[]) {
  // Publication rows intentionally reject deletion. Disable triggers only inside
  // this disposable database transaction while removing known test-owned IDs.
  await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
    await tx.invitationPublicationMedia.deleteMany({ where: { publication: { invitationId } } });
    await tx.invitationPublication.deleteMany({ where: { invitationId } });
    await tx.invitationDraft.deleteMany({ where: { invitationId } });
    await tx.invitation.deleteMany({ where: { id: invitationId } });
    await tx.mediaAsset.deleteMany({ where: { id: { in: mediaIds } } });
    await tx.user.deleteMany({ where: { id: actorId } });
  });
}

describe.skipIf(!run)("A4 isolated PostgreSQL transaction", () => {
  it("rolls back aggregate and history on late fault, then publishes one verified version", async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(isolatedUrl) });
    const suffix = randomUUID().slice(0, 12);
    const invitationId = `a4-inv-${suffix}`;
    const actorId = `a4-admin-${suffix}`;
    // Only the four seeded slugs may have a BASELINE v1 publication.
    const slug = "default-preview";
    const mediaIds = ["hero", "groom", "bride", "gallery"].map((kind) => `a4-${kind}-${suffix}`);
    const [heroAssetId, groomPhotoId, bridePhotoId, galleryAssetId] = mediaIds;
    try {
      const prior = await db.invitation.findUnique({ where: { slug }, include: { owner: true } });
      if (prior?.owner?.id.startsWith("a4-admin-") && prior.owner.email.endsWith("@a4.local")) {
        const oldSuffix = prior.owner.id.slice("a4-admin-".length);
        await removeOwnFixture(db, prior.id, prior.owner.id,
          ["hero", "groom", "bride", "gallery"].map((kind) => `a4-${kind}-${oldSuffix}`));
      } else if (prior) {
        throw new Error("Isolated legacy fixture slug is already occupied");
      }
      await db.user.create({ data: { id: actorId, email: `${suffix}@a4.local`, name: "A4 Test", passwordHash: "isolated-test-only", role: "ADMIN" } });
      await db.mediaAsset.createMany({ data: mediaIds.map((id) => ({
        id, publicId: `ayawarta/local-a4/${slug}/${id}`, folder: `ayawarta/local-a4/${slug}`,
        secureUrl: `https://res.cloudinary.com/a4-test/image/upload/${id}.jpg`, resourceType: "IMAGE",
        format: "jpg", bytes: 1000, width: 600, height: 600,
      })) });
      await db.invitation.create({ data: {
        id: invitationId, slug, theme: "classic-rose", variant: "red", weddingDate: new Date("2026-12-20T08:00:00.000Z"),
        heroAssetId, ownerId: actorId, publishedVersion: 1,
        sections: { create: { couple: true, events: true, gallery: true, loveStory: false, gifts: false, wishes: true } },
        partners: { create: [
          { role: "GROOM", name: "Bima", parents: "Orang tua Bima", photoAssetId: groomPhotoId },
          { role: "BRIDE", name: "Anisa", parents: "Orang tua Anisa", photoAssetId: bridePhotoId },
        ] },
        events: { create: [{ position: 1, name: "Resepsi", displayDate: "20 Desember 2026", displayTime: "08:00 WIB", location: "Gedung", address: "Bandung", mapUrl: "https://maps.app.goo.gl/test" }] },
        galleryItems: { create: [{ position: 1, assetId: galleryAssetId, altText: "Pasangan di taman", caption: null }] },
      } });
      const draftRepo = createDraftRepository(db);
      await draftRepo.recordBaselinePublication(invitationId);
      const before = await db.invitation.findUniqueOrThrow({ where: { id: invitationId }, include: invitationDetailInclude });
      const beforeDigest = digestPublicationSnapshot(buildPublicationSnapshot(before));
      const payload = draftFromPublished(before);
      payload.partners.groom.name = "Bima Baru";
      const draft = await draftRepo.createDraftForPublished({ invitationId, expectedPublishedVersion: 1, payload: payload as unknown as Prisma.InputJsonValue, actorId });

      const injected = {
        $transaction: (callback: (tx: Prisma.TransactionClient) => Promise<unknown>, options: { isolationLevel: "Serializable" }) =>
          db.$transaction((tx) => callback(new Proxy(tx, {
            get(target, key) {
              if (key === "invitationPublication") return new Proxy(target.invitationPublication, {
                get(delegate, method) {
                  if (method === "create") return async () => { throw new Error("injected snapshot failure"); };
                  return Reflect.get(delegate, method);
                },
              });
              return Reflect.get(target, key);
            },
          })), options),
      } as unknown as PrismaClient;
      const input = { id: draft.id, expectedDraftVersion: 1, expectedPublishedVersion: 1, confirmationSlug: slug, actorId };
      await expect(createPublishRepository(injected).publish(input)).rejects.toThrow("injected snapshot failure");
      const afterFault = await db.invitation.findUniqueOrThrow({ where: { id: invitationId }, include: invitationDetailInclude });
      expect(digestPublicationSnapshot(buildPublicationSnapshot(afterFault))).toBe(beforeDigest);
      expect((await db.invitationPublication.count({ where: { invitationId } }))).toBe(1);
      expect((await db.invitationDraft.findUniqueOrThrow({ where: { id: draft.id } })).draftVersion).toBe(1);

      const success = await createPublishRepository(db).publish(input);
      expect(success).toEqual({ slug, version: 2, publicPath: `/${slug}` });
      const after = await db.invitation.findUniqueOrThrow({ where: { id: invitationId }, include: invitationDetailInclude });
      expect(after.publishedVersion).toBe(2);
      expect(after.partners.find((partner) => partner.role === "GROOM")?.name).toBe("Bima Baru");
      expect(after.events.map((event) => event.position)).toEqual([1]);
      const publication = await db.invitationPublication.findUniqueOrThrow({
        where: { invitationId_version: { invitationId, version: 2 } },
        include: { media: { select: { mediaAssetId: true } } },
      });
      const afterSnapshot = buildPublicationSnapshot(after);
      expect(publication.contentDigest).toBe(digestPublicationSnapshot(afterSnapshot));
      expect(publication.media.map((row) => row.mediaAssetId).sort()).toEqual(publicationMediaIds(afterSnapshot));
      const retained = await db.invitationDraft.findUniqueOrThrow({ where: { id: draft.id } });
      expect(retained).toMatchObject({ draftVersion: 2, basePublishedVersion: 2 });
      await expect(createPublishRepository(db).publish({ ...input, expectedDraftVersion: 2, expectedPublishedVersion: 2 })).rejects.toMatchObject({ code: "validation" });
      expect(await db.invitationPublication.count({ where: { invitationId } })).toBe(2);
    } finally {
      await removeOwnFixture(db, invitationId, actorId, mediaIds);
      await db.$disconnect();
    }
  });
});

import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@/generated/prisma/client";
import { describe, expect, it } from "vitest";
import { createEmptyDraftPayload } from "./draft-schema";
import {
  createDraftMediaRepository,
  findVerifiedDraftMedia,
  verifyDraftMediaReceipt,
} from "./draft-media-repository";

const run = process.env.AYAWARTA_A5_DB_TEST === "1";
const isolatedUrl = "postgresql://postgres@127.0.0.1:55434/ayawarta_a5";

describe.skipIf(!run)("A5 isolated PostgreSQL provenance", () => {
  it("reserves, retries, verifies and locks draft ownership in the database", async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(isolatedUrl) });
    try {
      const target = await db.$queryRaw<Array<{ address: string; port: number; database: string }>>`
        SELECT inet_server_addr()::text AS address, inet_server_port() AS port, current_database() AS database
      `;
      expect(target).toHaveLength(1);
      expect(target[0].address).toMatch(/^127\.0\.0\.1(?:\/32)?$/);
      expect(target[0].port).toBe(55434);
      expect(target[0].database).toBe("ayawarta_a5");

      const suffix = randomUUID().slice(0, 12);
      const actorId = `a5-user-${suffix}`;
      const draftId = `a5-draft-${suffix}`;
      await db.user.create({ data: {
        id: actorId, email: `${suffix}@a5.local`, name: "A5 Test", passwordHash: "isolated-test-only",
      } });
      const payload = createEmptyDraftPayload();
      payload.slug = `a5-test-${suffix}`;
      payload.galleryItems = [{ key: "gallery-1", assetId: null, altText: "", caption: "" }];
      await db.invitationDraft.create({ data: {
        id: draftId, proposedSlug: payload.slug, payload: payload as unknown as Prisma.InputJsonValue,
        createdById: actorId, updatedById: actorId,
      } });

      const repo = createDraftMediaRepository(db);
      const input = {
        draftId, slot: "gallery:gallery-1", idempotencyKey: randomUUID(), sha256: "a".repeat(64),
        format: "webp", width: 800, height: 600, bytes: 25000, actorId, expectedDraftVersion: 1,
      };
      const first = await repo.reserve(input);
      expect(first.created).toBe(true);
      expect(first.provision.state).toBe("RESERVED");
      expect((await repo.reserve(input)).created).toBe(false);
      expect(await repo.listPendingForDraft(draftId)).toEqual([expect.objectContaining({
        id: first.provision.id, slot: input.slot, idempotencyKey: input.idempotencyKey,
      })]);
      await expect(db.draftMediaProvision.create({ data: {
        id: randomUUID(), draftId, slot: "cover", idempotencyKey: randomUUID(),
        preparedSha256: "b".repeat(64), publicId: "wrong-path",
        format: "webp", width: 800, height: 600, bytes: 25000, createdById: actorId,
      } })).rejects.toThrow();
      await expect(db.draftMediaProvision.create({ data: {
        id: randomUUID(), draftId, slot: "cover", idempotencyKey: randomUUID(),
        preparedSha256: "b".repeat(64), publicId: `ayawarta/production/invitations/draft-${draftId}/images/invalid-bbbbbbbbbbbbbbbb`,
        format: "webp", width: 800, height: 600, bytes: 25000, createdById: actorId,
        state: "VERIFIED",
      } })).rejects.toThrow();
      await expect(repo.reserve({ ...input, sha256: "b".repeat(64) })).rejects.toMatchObject({ code: "conflict" });
      await expect(repo.reserve({ ...input, expectedDraftVersion: 2 })).rejects.toMatchObject({ code: "conflict" });

      const secureUrl = `https://res.cloudinary.com/uhwi7xvb/image/upload/v123/${first.provision.publicId}.webp`;
      const verified = await repo.finalizeVerified({
        draftId, provisionId: first.provision.id, cloudinaryAssetId: `a5-cloud-${suffix}`,
        publicId: first.provision.publicId, secureUrl, resourceType: "IMAGE",
        format: "webp", width: 800, height: 600, bytes: 25000, originalName: "first.webp",
      });
      expect(verified.state).toBe("VERIFIED");
      expect(verified.mediaAssetId).toBeTruthy();
      expect(verifyDraftMediaReceipt(verified, "uhwi7xvb")).toBe(true);
      const renamedRetry = await repo.finalizeVerified({
        draftId, provisionId: first.provision.id, cloudinaryAssetId: `a5-cloud-${suffix}`,
        publicId: first.provision.publicId, secureUrl, resourceType: "IMAGE",
        format: "webp", width: 800, height: 600, bytes: 25000, originalName: "renamed.webp",
      });
      expect(renamedRetry.mediaAssetId).toBe(verified.mediaAssetId);
      expect(await db.mediaAsset.count({ where: { publicId: first.provision.publicId } })).toBe(1);
      expect((await findVerifiedDraftMedia(db, draftId, [verified.mediaAssetId!])).map((row) => row.id)).toEqual([verified.id]);

      const otherDraftId = `a5-other-${suffix}`;
      await db.invitationDraft.create({ data: {
        id: otherDraftId, proposedSlug: `other-${suffix}`,
        payload: { ...payload, slug: `other-${suffix}` } as unknown as Prisma.InputJsonValue,
        createdById: actorId, updatedById: actorId,
      } });
      expect(await findVerifiedDraftMedia(db, otherDraftId, [verified.mediaAssetId!])).toEqual([]);
      await expect(db.draftMediaProvision.update({
        where: { id: verified.id }, data: { slot: "bride" },
      })).rejects.toThrow();
      await expect(db.draftMediaProvision.delete({ where: { id: verified.id } })).rejects.toThrow();
      await expect(db.mediaAsset.delete({ where: { id: verified.mediaAssetId! } })).rejects.toThrow();
      await expect(db.invitationDraft.delete({ where: { id: draftId } })).rejects.toThrow();
    } finally {
      await db.$disconnect();
    }
  });
});

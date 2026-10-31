import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import {
  createDraftMediaRepository,
  draftMediaPublicId,
  findVerifiedDraftMedia,
  verifyDraftMediaReceipt,
  type ReserveDraftMediaInput,
} from "./draft-media-repository";
import { createEmptyDraftPayload } from "./draft-schema";

const SHA = "a".repeat(64);
const ID = "11111111-1111-4111-8111-111111111111";
const KEY = "22222222-2222-4222-8222-222222222222";
const DRAFT = "draft-1";
const CLOUD = "uhwi7xvb";
const NOW = new Date("2026-10-31T00:00:00.000Z");

const reservation: ReserveDraftMediaInput = {
  draftId: DRAFT,
  slot: "cover",
  idempotencyKey: KEY,
  sha256: SHA,
  format: "webp",
  width: 800,
  height: 1200,
  bytes: 30000,
  actorId: "admin-1",
  expectedDraftVersion: 1,
};

function provision(state: "RESERVED" | "VERIFIED" = "RESERVED") {
  const publicId = draftMediaPublicId(DRAFT, ID, SHA);
  const secureUrl = `https://res.cloudinary.com/${CLOUD}/image/upload/v123/${publicId}.webp`;
  const mediaAsset = state === "VERIFIED" ? {
    id: "media-1",
    publicId,
    secureUrl,
    folder: publicId.slice(0, publicId.lastIndexOf("/")),
    resourceType: "IMAGE",
    format: "webp",
    bytes: 30000,
    width: 800,
    height: 1200,
    originalName: "original.webp",
  } : null;
  return {
    id: ID,
    draftId: DRAFT,
    slot: "cover",
    idempotencyKey: KEY,
    preparedSha256: SHA,
    publicId,
    format: "webp",
    width: 800,
    height: 1200,
    bytes: 30000,
    state,
    cloudinaryAssetId: state === "VERIFIED" ? "cloud-asset-1" : null,
    mediaAssetId: mediaAsset?.id ?? null,
    verifiedAt: state === "VERIFIED" ? NOW : null,
    createdById: "admin-1",
    createdAt: NOW,
    updatedAt: NOW,
    mediaAsset,
  };
}

function mockedDb(existing: ReturnType<typeof provision> | null = null, draftVersion = 1) {
  const payload = createEmptyDraftPayload();
  payload.galleryItems = [{ key: "gallery-1", assetId: null, altText: "", caption: "" }];
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    invitationDraft: { findUnique: vi.fn().mockResolvedValue({ invitationId: null, draftVersion, payload }) },
    draftMediaProvision: {
      findUnique: vi.fn().mockResolvedValue(existing),
      findFirst: vi.fn().mockResolvedValue(existing),
      create: vi.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        ...provision(), ...data, state: "RESERVED", mediaAsset: null,
      })),
      update: vi.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        ...provision("VERIFIED"), ...data,
      })),
    },
    mediaAsset: { create: vi.fn().mockResolvedValue({ id: "media-1" }) },
  };
  const db = { $transaction: vi.fn().mockImplementation(async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx)) } as unknown as PrismaClient;
  return { db, tx };
}

describe("draft media provenance repository", () => {
  it("reserves a draft-scoped immutable public ID before upload", async () => {
    const { db, tx } = mockedDb();
    const result = await createDraftMediaRepository(db).reserve(reservation);
    expect(result.created).toBe(true);
    expect(result.provision.publicId).toMatch(/^ayawarta\/production\/invitations\/draft-draft-1\/images\/[0-9a-f-]{36}-a{16}$/);
    expect(tx.draftMediaProvision.create).toHaveBeenCalledTimes(1);
    expect(tx.mediaAsset.create).not.toHaveBeenCalled();
  });

  it("reuses the same key only for the same slot and prepared content", async () => {
    const { db, tx } = mockedDb(provision());
    const repo = createDraftMediaRepository(db);
    expect(await repo.reserve(reservation)).toMatchObject({ created: false });
    expect(tx.draftMediaProvision.create).not.toHaveBeenCalled();
    await expect(repo.reserve({ ...reservation, sha256: "b".repeat(64) })).rejects.toMatchObject({ code: "conflict" });
    await expect(repo.reserve({ ...reservation, slot: "bride" })).rejects.toMatchObject({ code: "conflict" });
  });

  it("rejects stale draft version before reserving or retrying", async () => {
    const { db, tx } = mockedDb(provision(), 2);
    await expect(createDraftMediaRepository(db).reserve(reservation)).rejects.toMatchObject({ code: "conflict" });
    expect(tx.draftMediaProvision.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a gallery slot removed from the current saved draft", async () => {
    const { db, tx } = mockedDb();
    await expect(createDraftMediaRepository(db).reserve({ ...reservation, slot: "gallery:deleted-row" }))
      .rejects.toMatchObject({ code: "conflict" });
    expect(tx.draftMediaProvision.create).not.toHaveBeenCalled();
  });

  it("finalization rejects a different remote public ID and never creates a MediaAsset", async () => {
    const { db, tx } = mockedDb(provision());
    await expect(createDraftMediaRepository(db).finalizeVerified({
      draftId: DRAFT, provisionId: ID, cloudinaryAssetId: "cloud-asset-1",
      publicId: "another-public-id", secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1/another-public-id.webp",
      resourceType: "IMAGE", format: "webp", width: 800, height: 1200, bytes: 30000, originalName: null,
    })).rejects.toMatchObject({ code: "conflict" });
    expect(tx.mediaAsset.create).not.toHaveBeenCalled();
  });

  it("a renamed identical retry returns the verified asset without another insert", async () => {
    const existing = provision("VERIFIED");
    const { db, tx } = mockedDb(existing);
    const result = await createDraftMediaRepository(db).finalizeVerified({
      draftId: DRAFT, provisionId: ID, cloudinaryAssetId: "cloud-asset-1",
      publicId: existing.publicId, secureUrl: existing.mediaAsset!.secureUrl,
      resourceType: "IMAGE", format: "webp", width: 800, height: 1200, bytes: 30000,
      originalName: "same-content-renamed.webp",
    });
    expect(result.mediaAssetId).toBe("media-1");
    expect(tx.mediaAsset.create).not.toHaveBeenCalled();
    expect(tx.draftMediaProvision.update).not.toHaveBeenCalled();
  });

  it("verifies full receipt binding and rejects forged delivery URLs", () => {
    const valid = provision("VERIFIED");
    expect(verifyDraftMediaReceipt(valid as never, CLOUD)).toBe(true);
    expect(verifyDraftMediaReceipt({ ...valid, mediaAsset: { ...valid.mediaAsset!, secureUrl: valid.mediaAsset!.secureUrl.replace("v123/", "v123/%2e%2e/") } } as never, CLOUD)).toBe(false);
    expect(verifyDraftMediaReceipt({ ...valid, mediaAsset: { ...valid.mediaAsset!, secureUrl: valid.mediaAsset!.secureUrl.replace("res.cloudinary.com", "res.cloudinary.com:444") } } as never, CLOUD)).toBe(false);
    expect(verifyDraftMediaReceipt({ ...valid, cloudinaryAssetId: null } as never, CLOUD)).toBe(false);
  });

  it("scopes first-publication lookup to the exact draft and requested verified media IDs", async () => {
    const findMany = vi.fn().mockResolvedValue([provision("VERIFIED")]);
    const db = { draftMediaProvision: { findMany } } as unknown as PrismaClient;
    await findVerifiedDraftMedia(db, DRAFT, ["media-1", "media-1"]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { draftId: DRAFT, state: "VERIFIED", mediaAssetId: { in: ["media-1"] } },
      take: 100,
    }));
  });
});

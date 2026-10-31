import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { CANONICAL_TARGET_CLOUD_NAME } from "@/features/media/canonical-catalog";
import { validateCloudinaryAssetBinding } from "@/features/media/cloudinary-uploader";
import { parseDraftForSave } from "./draft-schema";

export type DraftMediaErrorCode = "not_found" | "conflict" | "invalid_state";

export class DraftMediaError extends Error {
  constructor(public readonly code: DraftMediaErrorCode, message: string) {
    super(message);
    this.name = "DraftMediaError";
  }
}

export interface ReserveDraftMediaInput {
  draftId: string;
  slot: string;
  idempotencyKey: string;
  sha256: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  actorId: string;
  expectedDraftVersion: number;
}

export interface FinalizeDraftMediaInput {
  draftId: string;
  provisionId: string;
  cloudinaryAssetId: string;
  publicId: string;
  secureUrl: string;
  resourceType: "IMAGE";
  format: string;
  width: number;
  height: number;
  bytes: number;
  originalName: string | null;
}

const SLOT_PATTERN = /^(?:cover|groom|bride|gallery:[A-Za-z0-9_-]{1,80})$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const IMAGE_FORMATS = new Set(["webp", "jpg", "jpeg", "png"]);

function positiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function assertReservation(input: ReserveDraftMediaInput): void {
  if (!input.draftId || !input.actorId || !SLOT_PATTERN.test(input.slot) ||
      !UUID_PATTERN.test(input.idempotencyKey) || !SHA256_PATTERN.test(input.sha256) ||
      !IMAGE_FORMATS.has(input.format) || !positiveInteger(input.bytes) ||
      !positiveInteger(input.width) || !positiveInteger(input.height) ||
      !positiveInteger(input.expectedDraftVersion)) {
    throw new DraftMediaError("invalid_state", "Draft media reservation metadata is invalid");
  }
}

export function draftMediaPublicId(draftId: string, provisionId: string, sha256: string): string {
  if (!draftId || !UUID_PATTERN.test(provisionId) || !SHA256_PATTERN.test(sha256)) {
    throw new DraftMediaError("invalid_state", "Draft media public ID inputs are invalid");
  }
  return `ayawarta/production/invitations/draft-${draftId}/images/${provisionId}-${sha256.slice(0, 16)}`;
}

type Provision = Prisma.DraftMediaProvisionGetPayload<{ include: { mediaAsset: true } }>;

function sameReservation(existing: Provision, input: ReserveDraftMediaInput): boolean {
  return existing.slot === input.slot && existing.preparedSha256 === input.sha256 &&
    existing.format === input.format && existing.width === input.width &&
    existing.height === input.height && existing.bytes === input.bytes;
}

function validateFinalization(provision: Provision, input: FinalizeDraftMediaInput): void {
  if (input.publicId !== provision.publicId || !input.cloudinaryAssetId ||
      input.resourceType !== "IMAGE" || input.format !== provision.format ||
      input.width !== provision.width || input.height !== provision.height ||
      input.bytes !== provision.bytes ||
      !validVersionedImageUrl(input.secureUrl, CANONICAL_TARGET_CLOUD_NAME, input.publicId, input.format)) {
    throw new DraftMediaError("conflict", "Verified upload differs from its reserved identity or content");
  }
}

function validVersionedImageUrl(secureUrl: string, cloudName: string, publicId: string, format: string): boolean {
  if (!validateCloudinaryAssetBinding({
    secureUrl,
    expectedCloudName: cloudName,
    expectedResourceType: "image",
    expectedPublicId: publicId,
    expectedFormat: format,
  }).valid) return false;
  const suffix = `/${publicId}.${format}`;
  const path = new URL(secureUrl).pathname;
  const prefix = `/${cloudName}/image/upload/`;
  return path.startsWith(prefix) && path.endsWith(suffix) &&
    /^v[0-9]+$/.test(path.slice(prefix.length, -suffix.length));
}

/** Receipt check used before selecting or publishing an uploaded asset. */
export function verifyDraftMediaReceipt(provision: Provision, cloudName: string): boolean {
  if (provision.state !== "VERIFIED" || !provision.cloudinaryAssetId ||
      !provision.mediaAssetId || !provision.verifiedAt || !provision.mediaAsset ||
      provision.mediaAsset.id !== provision.mediaAssetId ||
      provision.mediaAsset.publicId !== provision.publicId ||
      provision.mediaAsset.resourceType !== "IMAGE" ||
      provision.mediaAsset.format !== provision.format ||
      provision.mediaAsset.bytes !== provision.bytes ||
      provision.mediaAsset.width !== provision.width ||
      provision.mediaAsset.height !== provision.height ||
      !cloudName || !SHA256_PATTERN.test(provision.preparedSha256) ||
      !UUID_PATTERN.test(provision.id) ||
      provision.publicId !== draftMediaPublicId(provision.draftId, provision.id, provision.preparedSha256)) {
    return false;
  }
  return validVersionedImageUrl(
    provision.mediaAsset.secureUrl, cloudName, provision.publicId, provision.format,
  );
}

/** Transaction-compatible ownership query for first publication. Missing IDs are never filled from other drafts. */
export async function findVerifiedDraftMedia(
  db: PrismaClient | Prisma.TransactionClient,
  draftId: string,
  assetIds: readonly string[],
): Promise<Provision[]> {
  const uniqueIds = [...new Set(assetIds)];
  if (!draftId || uniqueIds.length > 100 || uniqueIds.some((id) => !id)) {
    throw new DraftMediaError("invalid_state", "Draft media lookup is invalid");
  }
  if (uniqueIds.length === 0) return [];
  return db.draftMediaProvision.findMany({
    where: { draftId, state: "VERIFIED", mediaAssetId: { in: uniqueIds } },
    include: { mediaAsset: true },
    take: 100,
  });
}

async function defaultDatabase(): Promise<PrismaClient> {
  const { prisma } = await import("@/lib/server/db");
  return prisma;
}

/** The caller authorizes the admin; this boundary enforces draft ownership and write ordering. */
export function createDraftMediaRepository(customDb?: PrismaClient) {
  const getDb = () => customDb ? Promise.resolve(customDb) : defaultDatabase();

  return {
    async reserve(input: ReserveDraftMediaInput): Promise<{ provision: Provision; created: boolean }> {
      assertReservation(input);
      const db = await getDb();
      return db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "InvitationDraft" WHERE "id" = ${input.draftId} FOR UPDATE`;
        const draft = await tx.invitationDraft.findUnique({
          where: { id: input.draftId }, select: { invitationId: true, draftVersion: true, payload: true },
        });
        if (!draft) throw new DraftMediaError("not_found", "Draft not found");
        if (draft.invitationId) throw new DraftMediaError("invalid_state", "Media provisioning is limited to unpublished drafts");
        if (draft.draftVersion !== input.expectedDraftVersion) {
          throw new DraftMediaError("conflict", "Draft changed before media reservation");
        }
        const parsed = parseDraftForSave(draft.payload);
        if (!parsed.ok || (input.slot.startsWith("gallery:") &&
            !parsed.payload.galleryItems.some((item) => item.key === input.slot.slice("gallery:".length)))) {
          throw new DraftMediaError("conflict", "Upload slot is not present in the saved draft");
        }

        const existing = await tx.draftMediaProvision.findUnique({
          where: { draftId_idempotencyKey: { draftId: input.draftId, idempotencyKey: input.idempotencyKey } },
          include: { mediaAsset: true },
        });
        if (existing) {
          if (!sameReservation(existing, input)) throw new DraftMediaError("conflict", "Upload retry key belongs to different content or slot");
          return { provision: existing, created: false };
        }

        const id = randomUUID();
        const provision = await tx.draftMediaProvision.create({
          data: {
            id,
            draftId: input.draftId,
            slot: input.slot,
            idempotencyKey: input.idempotencyKey,
            preparedSha256: input.sha256,
            publicId: draftMediaPublicId(input.draftId, id, input.sha256),
            format: input.format,
            width: input.width,
            height: input.height,
            bytes: input.bytes,
            createdById: input.actorId,
          },
          include: { mediaAsset: true },
        });
        return { provision, created: true };
      }, { isolationLevel: "ReadCommitted" });
    },

    async findByDraftAndKey(draftId: string, idempotencyKey: string): Promise<Provision | null> {
      const db = await getDb();
      return db.draftMediaProvision.findUnique({
        where: { draftId_idempotencyKey: { draftId, idempotencyKey } },
        include: { mediaAsset: true },
      });
    },

    async findByIdForDraft(draftId: string, provisionId: string): Promise<Provision | null> {
      const db = await getDb();
      return db.draftMediaProvision.findFirst({
        where: { id: provisionId, draftId },
        include: { mediaAsset: true },
      });
    },

    async finalizeVerified(input: FinalizeDraftMediaInput): Promise<Provision> {
      const db = await getDb();
      return db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "InvitationDraft" WHERE "id" = ${input.draftId} FOR UPDATE`;
        const draft = await tx.invitationDraft.findUnique({ where: { id: input.draftId }, select: { invitationId: true } });
        if (!draft) throw new DraftMediaError("not_found", "Draft not found");
        if (draft.invitationId) throw new DraftMediaError("invalid_state", "Draft is already published");
        const provision = await tx.draftMediaProvision.findFirst({
          where: { id: input.provisionId, draftId: input.draftId }, include: { mediaAsset: true },
        });
        if (!provision) throw new DraftMediaError("not_found", "Upload reservation not found");
        validateFinalization(provision, input);
        if (provision.state === "VERIFIED") {
          if (provision.cloudinaryAssetId !== input.cloudinaryAssetId ||
              provision.mediaAsset?.secureUrl !== input.secureUrl) {
            throw new DraftMediaError("conflict", "Verified upload identity changed");
          }
          return provision;
        }
        const mediaAsset = await tx.mediaAsset.create({
          data: {
            publicId: provision.publicId,
            secureUrl: input.secureUrl,
            folder: provision.publicId.slice(0, provision.publicId.lastIndexOf("/")),
            resourceType: "IMAGE",
            format: input.format,
            bytes: input.bytes,
            width: input.width,
            height: input.height,
            originalName: input.originalName,
          },
        });
        return tx.draftMediaProvision.update({
          where: { id: provision.id },
          data: {
            state: "VERIFIED",
            cloudinaryAssetId: input.cloudinaryAssetId,
            mediaAssetId: mediaAsset.id,
            verifiedAt: new Date(),
          },
          include: { mediaAsset: true },
        });
      }, { isolationLevel: "ReadCommitted" });
    },

    async listVerifiedForDraft(draftId: string): Promise<Provision[]> {
      const db = await getDb();
      return db.draftMediaProvision.findMany({
        where: { draftId, state: "VERIFIED" },
        include: { mediaAsset: true },
        orderBy: { createdAt: "asc" },
        take: 100,
      });
    },

    async listPendingForDraft(draftId: string): Promise<Array<{ id: string; slot: string; idempotencyKey: string; createdAt: Date }>> {
      const db = await getDb();
      return db.draftMediaProvision.findMany({
        where: { draftId, state: "RESERVED" },
        select: { id: true, slot: true, idempotencyKey: true, createdAt: true },
        orderBy: { createdAt: "asc" },
        take: 60,
      });
    },
  };
}

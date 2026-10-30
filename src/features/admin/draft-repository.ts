import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { invitationDetailInclude } from "@/features/invitations/query";
import { mapPrismaToInvitation } from "@/features/invitations/mapper";
import {
  buildPublicationSnapshot,
  digestPublicationSnapshot,
  publicationMediaIds,
  verifyPublicationSnapshot,
} from "./publication-snapshot";

export type DraftPersistenceErrorCode =
  | "not_found"
  | "conflict"
  | "baseline_required"
  | "invalid_state";

export class DraftPersistenceError extends Error {
  constructor(public readonly code: DraftPersistenceErrorCode, message: string) {
    super(message);
    this.name = "DraftPersistenceError";
  }
}

export type NewDraftInput = {
  proposedSlug: string;
  payload: Prisma.InputJsonValue;
  actorId: string;
};

export type ExistingDraftInput = Omit<NewDraftInput, "proposedSlug"> & {
  invitationId: string;
  expectedPublishedVersion: number;
};

export type SaveDraftInput = NewDraftInput & {
  id: string;
  expectedDraftVersion: number;
};

type Database = PrismaClient;

async function defaultDatabase(): Promise<Database> {
  const { prisma } = await import("@/lib/server/db");
  return prisma;
}

function payloadSlug(payload: Prisma.InputJsonValue): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const slug = (payload as Record<string, unknown>).slug;
  return typeof slug === "string" ? slug : null;
}

function assertPayloadSlug(payload: Prisma.InputJsonValue, proposedSlug: string): void {
  if (payloadSlug(payload) !== proposedSlug) {
    throw new DraftPersistenceError("invalid_state", "Draft slug and payload slug differ");
  }
}

function assertPositiveVersion(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new DraftPersistenceError("invalid_state", `${label} must be a positive integer`);
  }
}

function assertVerifiedBaseline(
  publication: {
    source: "BASELINE" | "PUBLISH";
    schemaVersion: number;
    snapshot: Prisma.JsonValue;
    contentDigest: string;
    media: Array<{ mediaAssetId: string }>;
  } | null,
  invitationId: string
): void {
  if (!publication || publication.source !== "BASELINE" || publication.schemaVersion !== 1 ||
      !verifyPublicationSnapshot(publication.snapshot, publication.contentDigest, invitationId, 1)) {
    throw new DraftPersistenceError("baseline_required", "Verified publication baseline is required before editing");
  }
  const pinned = publication.media.map((item) => item.mediaAssetId).sort();
  const referenced = publicationMediaIds(publication.snapshot);
  if (JSON.stringify(pinned) !== JSON.stringify(referenced)) {
    throw new DraftPersistenceError("baseline_required", "Publication baseline media pins are incomplete");
  }
}

/** Server-only persistence boundary; callers must authorize the admin before invoking it. */
export function createDraftRepository(customDb?: Database) {
  const getDb = () => customDb ? Promise.resolve(customDb) : defaultDatabase();

  return {
    async createNewDraft(input: NewDraftInput) {
      assertPayloadSlug(input.payload, input.proposedSlug);
      const db = await getDb();
      return db.invitationDraft.create({
        data: {
          proposedSlug: input.proposedSlug,
          payload: input.payload,
          schemaVersion: 1,
          draftVersion: 1,
          basePublishedVersion: null,
          createdById: input.actorId,
          updatedById: input.actorId,
        },
      });
    },

    async createDraftForPublished(input: ExistingDraftInput) {
      assertPositiveVersion(input.expectedPublishedVersion, "Published version");
      const db = await getDb();
      return db.$transaction(async (tx) => {
        const live = await tx.invitation.findUnique({
          where: { id: input.invitationId },
          include: invitationDetailInclude,
        });
        if (!live) throw new DraftPersistenceError("not_found", "Invitation not found");
        if (live.publishedVersion !== input.expectedPublishedVersion) {
          throw new DraftPersistenceError("conflict", "Published invitation changed");
        }
        if (payloadSlug(input.payload) !== live.slug) {
          throw new DraftPersistenceError("invalid_state", "Published invitation slug is immutable");
        }

        const baseline = await tx.invitationPublication.findUnique({
          where: { invitationId_version: { invitationId: live.id, version: 1 } },
          include: { media: { select: { mediaAssetId: true } } },
        });
        assertVerifiedBaseline(baseline, live.id);

        const currentPublication = live.publishedVersion === 1 ? baseline :
          await tx.invitationPublication.findUnique({
            where: { invitationId_version: { invitationId: live.id, version: live.publishedVersion } },
            include: { media: { select: { mediaAssetId: true } } },
          });
        if (!currentPublication || currentPublication.schemaVersion !== 1 ||
            (live.publishedVersion > 1 && currentPublication.source !== "PUBLISH") ||
            !verifyPublicationSnapshot(currentPublication.snapshot, currentPublication.contentDigest, live.id, live.publishedVersion)) {
          throw new DraftPersistenceError("invalid_state", "Current publication snapshot is missing or invalid");
        }
        mapPrismaToInvitation(live);
        const currentSnapshot = buildPublicationSnapshot(live);
        if (digestPublicationSnapshot(currentSnapshot) !== currentPublication.contentDigest ||
            JSON.stringify(currentPublication.media.map((item) => item.mediaAssetId).sort()) !==
            JSON.stringify(publicationMediaIds(currentSnapshot))) {
          throw new DraftPersistenceError("conflict", "Published content differs from its verified publication snapshot");
        }

        const existing = await tx.invitationDraft.findUnique({ where: { invitationId: live.id } });
        if (existing) {
          if (existing.basePublishedVersion !== live.publishedVersion || existing.proposedSlug !== live.slug) {
            throw new DraftPersistenceError("conflict", "Existing draft was based on another published version");
          }
          return existing;
        }

        try {
          return await tx.invitationDraft.create({
            data: {
              invitationId: live.id,
              proposedSlug: live.slug,
              payload: input.payload,
              schemaVersion: 1,
              draftVersion: 1,
              basePublishedVersion: live.publishedVersion,
              createdById: input.actorId,
              updatedById: input.actorId,
            },
          });
        } catch (error) {
          if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
            throw new DraftPersistenceError("conflict", "Another draft was created concurrently");
          }
          throw error;
        }
      }, { isolationLevel: "Serializable" });
    },

    async findDraftById(id: string) {
      const db = await getDb();
      return db.invitationDraft.findUnique({ where: { id } });
    },

    async findPublishedById(invitationId: string) {
      const db = await getDb();
      return db.invitation.findUnique({
        where: { id: invitationId },
        include: invitationDetailInclude,
      });
    },

    async saveDraftIfVersion(input: SaveDraftInput) {
      assertPositiveVersion(input.expectedDraftVersion, "Draft version");
      assertPayloadSlug(input.payload, input.proposedSlug);
      const db = await getDb();
      return db.$transaction(async (tx) => {
        const current = await tx.invitationDraft.findUnique({ where: { id: input.id } });
        if (!current) throw new DraftPersistenceError("not_found", "Draft not found");
        if (current.draftVersion !== input.expectedDraftVersion) {
          throw new DraftPersistenceError("conflict", "Draft changed since it was opened");
        }
        if (current.invitationId) {
          const live = await tx.invitation.findUnique({
            where: { id: current.invitationId },
            select: { slug: true, publishedVersion: true },
          });
          if (!live) throw new DraftPersistenceError("not_found", "Published invitation not found");
          if (live.publishedVersion !== current.basePublishedVersion) {
            throw new DraftPersistenceError("conflict", "Published invitation changed since drafting began");
          }
          if (input.proposedSlug !== live.slug) {
            throw new DraftPersistenceError("invalid_state", "Published invitation slug is immutable");
          }
        }

        const changed = await tx.invitationDraft.updateMany({
          where: { id: input.id, draftVersion: input.expectedDraftVersion },
          data: {
            proposedSlug: input.proposedSlug,
            payload: input.payload,
            draftVersion: { increment: 1 },
            updatedById: input.actorId,
          },
        });
        if (changed.count !== 1) {
          throw new DraftPersistenceError("conflict", "Draft changed concurrently");
        }
        const saved = await tx.invitationDraft.findUnique({ where: { id: input.id } });
        if (!saved) throw new DraftPersistenceError("not_found", "Draft disappeared after save");
        return saved;
      }, { isolationLevel: "Serializable" });
    },

    async findPublications(invitationId: string) {
      const db = await getDb();
      return db.invitationPublication.findMany({
        where: { invitationId },
        orderBy: { version: "desc" },
      });
    },

    async findAllowedMediaAssetIds(invitationId: string): Promise<Set<string>> {
      const db = await getDb();
      const invitation = await db.invitation.findUnique({
        where: { id: invitationId },
        select: {
          heroAssetId: true,
          musicAssetId: true,
          partners: { select: { photoAssetId: true } },
          galleryItems: { select: { assetId: true } },
        },
      });
      if (!invitation) throw new DraftPersistenceError("not_found", "Invitation not found");
      return new Set([
        invitation.heroAssetId,
        ...(invitation.musicAssetId ? [invitation.musicAssetId] : []),
        ...invitation.partners.map((partner) => partner.photoAssetId),
        ...invitation.galleryItems.map((item) => item.assetId),
      ]);
    },

    async recordBaselinePublication(invitationId: string) {
      const db = await getDb();
      return db.$transaction(async (tx) => {
        // The seed uses the same row lock before its rewrite guard. This prevents
        // either operation from crossing between the other's check and write.
        await tx.$queryRaw`SELECT "id" FROM "Invitation" WHERE "id" = ${invitationId} FOR UPDATE`;
        const live = await tx.invitation.findUnique({
          where: { id: invitationId },
          include: invitationDetailInclude,
        });
        if (!live) throw new DraftPersistenceError("not_found", "Invitation not found");
        if (live.publishedVersion !== 1) {
          throw new DraftPersistenceError("invalid_state", "Only initial publication version can be baselined");
        }

        // Reuse the public mapper as a completeness check before sealing history.
        mapPrismaToInvitation(live);
        const snapshot = buildPublicationSnapshot(live);
        const contentDigest = digestPublicationSnapshot(snapshot);
        const mediaIds = publicationMediaIds(snapshot);
        const existing = await tx.invitationPublication.findUnique({
          where: { invitationId_version: { invitationId, version: 1 } },
          include: { media: { select: { mediaAssetId: true } } },
        });
        if (existing) {
          if (existing.source !== "BASELINE" || existing.schemaVersion !== 1 ||
              existing.contentDigest !== contentDigest ||
              !verifyPublicationSnapshot(existing.snapshot, existing.contentDigest, invitationId, 1) ||
              JSON.stringify(existing.media.map((item) => item.mediaAssetId).sort()) !== JSON.stringify(mediaIds)) {
            throw new DraftPersistenceError("conflict", "Existing baseline does not match current published content");
          }
          return existing;
        }

        return tx.invitationPublication.create({
          data: {
            invitationId,
            version: 1,
            source: "BASELINE",
            snapshot: snapshot as unknown as Prisma.InputJsonValue,
            schemaVersion: 1,
            contentDigest,
            actorId: null,
            media: { create: mediaIds.map((mediaAssetId) => ({ mediaAssetId })) },
          },
          include: { media: { select: { mediaAssetId: true } } },
        });
      }, { isolationLevel: "Serializable" });
    },
  };
}

export const draftRepository = createDraftRepository();

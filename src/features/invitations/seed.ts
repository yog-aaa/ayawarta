import "server-only";

import { readValidatedUploadReport, reconcileUploadReport } from "./seed-report-reader";
import {
  mapCanonicalAssetToMediaAssetInput,
  mapUploadAssetToMediaAssetInput,
  type MediaAssetUpsertInput,
  SEED_INVITATIONS,
  type SeedInvitationDefinition,
} from "./seed-data";
import {
  CANONICAL_PRODUCTION_MEDIA,
  type CanonicalMediaAsset,
  validateCanonicalMediaCatalog,
} from "@/features/media/canonical-catalog";
import { bootstrapAdminUser, type BootstrapAdminResult } from "@/features/auth/bootstrap";
import type { ValidatedCloudinaryUploadReport } from "@/features/media/schema";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

export interface SeedTableCounts {
  user: number;
  mediaAsset: number;
  invitation: number;
  invitationSections: number;
  partner: number;
  event: number;
  galleryItem: number;
  loveStory: number;
  giftAccount: number;
}

export interface SeedResult {
  mediaAssetsUpserted: number;
  invitationsUpserted: number;
  adminBootstrapped: boolean;
  adminOutcome?: "created" | "updated";
  tableCounts: SeedTableCounts;
}

export interface SeedFaultInjectionOptions {
  failAfterMediaUpsertCount?: number;
  failOnInvitationSlug?: string;
}

export interface SeedAdminCredentials {
  email: string;
  password: string;
}

export interface SeedOptions {
  reportPath?: string;
  report?: ValidatedCloudinaryUploadReport;
  canonicalMedia?: readonly CanonicalMediaAsset[];
  repoRoot?: string;
  bootstrapAdmin?: boolean;
  adminCredentials?: SeedAdminCredentials;
  requireAdminBootstrap?: boolean;
  logger?: Pick<Console, "log" | "warn" | "error">;
  testFaultInjection?: SeedFaultInjectionOptions;
}

export class SeedExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeedExecutionError";
  }
}

/**
 * Validates all required media asset target public IDs across all seed invitations
 * against the report or canonical media inputs before any database transactions begin (SEED-01 / SEED-03).
 */
export function validateSeedMediaRequirements(
  mediaSource:
    | ValidatedCloudinaryUploadReport
    | readonly MediaAssetUpsertInput[]
    | readonly CanonicalMediaAsset[],
  invitations: readonly SeedInvitationDefinition[] = SEED_INVITATIONS
): void {
  const assetMap = new Map<string, { resourceType: string }>();
  if ("assets" in mediaSource && Array.isArray(mediaSource.assets)) {
    for (const a of mediaSource.assets) {
      assetMap.set(a.targetPublicId, {
        resourceType: a.resourceType === "video" ? "AUDIO" : "IMAGE",
      });
    }
  } else if (Array.isArray(mediaSource)) {
    for (const a of mediaSource) {
      assetMap.set(a.publicId, {
        resourceType: a.resourceType,
      });
    }
  }

  for (const inv of invitations) {
    const heroAsset = assetMap.get(inv.heroTargetPublicId);
    if (!heroAsset) {
      throw new SeedExecutionError(
        `Pre-seed validation failed: required hero asset '${inv.heroTargetPublicId}' missing from report for slug '${inv.slug}'.`
      );
    }
    if (heroAsset.resourceType !== "IMAGE") {
      throw new SeedExecutionError(
        `Pre-seed validation failed: required hero asset '${inv.heroTargetPublicId}' must have resourceType 'IMAGE', got '${heroAsset.resourceType}'.`
      );
    }

    if (inv.musicTargetPublicId) {
      const musicAsset = assetMap.get(inv.musicTargetPublicId);
      if (!musicAsset) {
        throw new SeedExecutionError(
          `Pre-seed validation failed: required audio asset '${inv.musicTargetPublicId}' missing from report for slug '${inv.slug}'.`
        );
      }
      if (musicAsset.resourceType !== "AUDIO") {
        throw new SeedExecutionError(
          `Pre-seed validation failed: required audio asset '${inv.musicTargetPublicId}' must have resourceType 'AUDIO', got '${musicAsset.resourceType}'.`
        );
      }
    }

    for (const partner of inv.partners) {
      const partnerAsset = assetMap.get(partner.photoTargetPublicId);
      if (!partnerAsset) {
        throw new SeedExecutionError(
          `Pre-seed validation failed: required photo asset '${partner.photoTargetPublicId}' for partner '${partner.name}' missing from report for slug '${inv.slug}'.`
        );
      }
      if (partnerAsset.resourceType !== "IMAGE") {
        throw new SeedExecutionError(
          `Pre-seed validation failed: required photo asset '${partner.photoTargetPublicId}' for partner '${partner.name}' must have resourceType 'IMAGE', got '${partnerAsset.resourceType}'.`
        );
      }
    }

    for (const [idx, item] of inv.galleryItems.entries()) {
      const galleryAsset = assetMap.get(item.assetTargetPublicId);
      if (!galleryAsset) {
        throw new SeedExecutionError(
          `Pre-seed validation failed: required gallery asset '${item.assetTargetPublicId}' at position ${idx + 1} missing from report for slug '${inv.slug}'.`
        );
      }
      if (galleryAsset.resourceType !== "IMAGE") {
        throw new SeedExecutionError(
          `Pre-seed validation failed: required gallery asset '${item.assetTargetPublicId}' at position ${idx + 1} must have resourceType 'IMAGE', got '${galleryAsset.resourceType}'.`
        );
      }
    }
  }
}

/**
 * Executes the complete idempotent database seed for AyaWarta in a single atomic interactive transaction (SEED-01):
 * 1. Reads, validates, and reconciles the 31-asset Cloudinary upload report against canonical manifest (SEED-03).
 * 2. Pre-validates all required media definitions before starting transaction.
 * 3. Encloses all 31 MediaAsset upserts, 4 Invitations with child collections, and admin bootstrap in ONE transaction.
 * 4. Fails closed with complete rollback if any invariant or write fails.
 * 5. Returns final row counts across all 9 tables.
 */
export async function executeSeed(
  options?: SeedOptions,
  customDb?: PrismaClient
): Promise<SeedResult> {
  const logger = options?.logger ?? console;
  const repoRoot = options?.repoRoot ?? process.cwd();

  let mediaInputs: MediaAssetUpsertInput[];

  if (options?.report) {
    const report = reconcileUploadReport(options.report, {
      repoRoot,
      canonicalAssets: options.canonicalMedia,
    });
    logger.log(
      `[Seed] Reconciled custom upload report for cloud '${report.targetCloudName}' with ${report.assets.length} assets.`
    );
    validateSeedMediaRequirements(report, SEED_INVITATIONS);
    mediaInputs = report.assets.map(mapUploadAssetToMediaAssetInput);
  } else if (options?.reportPath) {
    const report = readValidatedUploadReport(options.reportPath, {
      repoRoot,
      canonicalAssets: options.canonicalMedia,
    });
    logger.log(
      `[Seed] Reconciled upload report file from '${options.reportPath}' with ${report.assets.length} assets.`
    );
    validateSeedMediaRequirements(report, SEED_INVITATIONS);
    mediaInputs = report.assets.map(mapUploadAssetToMediaAssetInput);
  } else {
    // Portable Default Seed Flow: uses Git-tracked canonical production catalog
    // Zero dependencies on ignored .media-migration or local legacy media files
    const canonical = options?.canonicalMedia ?? CANONICAL_PRODUCTION_MEDIA;
    validateCanonicalMediaCatalog(canonical);
    mediaInputs = canonical.map(mapCanonicalAssetToMediaAssetInput);
    validateSeedMediaRequirements(mediaInputs, SEED_INVITATIONS);
    logger.log(
      `[Seed] Loaded canonical production media catalog with ${mediaInputs.length} verified assets.`
    );
  }

  // 3. Resolve Prisma Client
  let db: PrismaClient;
  if (customDb) {
    db = customDb;
  } else {
    const { prisma } = await import("@/lib/server/db");
    db = prisma;
  }

  // Resolve admin credentials (NEO-02)
  // Explicitly supplied credentials take precedence over shell environment and do NOT mutate process.env.
  const adminEmail =
    options?.adminCredentials?.email?.trim() ??
    (options?.requireAdminBootstrap ? undefined : process.env.ADMIN_EMAIL?.trim());
  const adminPassword =
    options?.adminCredentials?.password ??
    (options?.requireAdminBootstrap ? undefined : process.env.ADMIN_PASSWORD);

  if (options?.requireAdminBootstrap) {
    if (!adminEmail || !adminPassword || adminEmail.length === 0 || adminPassword.length === 0) {
      throw new SeedExecutionError(
        "Admin bootstrap is required for this seed operation, but valid admin credentials were not provided."
      );
    }
  }

  let mediaAssetsUpserted = 0;
  let invitationsUpserted = 0;
  let adminBootstrapped = false;
  let adminOutcome: "created" | "updated" | undefined;

  // 4. Single Outer Interactive Transaction (SEED-01)
  logger.log("[Seed] Starting atomic database transaction...");
  await db.$transaction(
    async (tx) => {
      // 4a. Upsert MediaAsset records inside transaction
      for (const input of mediaInputs) {
        if (
          options?.testFaultInjection?.failAfterMediaUpsertCount &&
          mediaAssetsUpserted >= options.testFaultInjection.failAfterMediaUpsertCount
        ) {
          throw new SeedExecutionError(
            `Injected fault after ${mediaAssetsUpserted} media upserts.`
          );
        }

        await tx.mediaAsset.upsert({
          where: { publicId: input.publicId },
          update: {
            secureUrl: input.secureUrl,
            folder: input.folder,
            resourceType: input.resourceType,
            format: input.format,
            bytes: input.bytes,
            width: input.width,
            height: input.height,
            originalName: input.originalName,
          },
          create: {
            publicId: input.publicId,
            secureUrl: input.secureUrl,
            folder: input.folder,
            resourceType: input.resourceType,
            format: input.format,
            bytes: input.bytes,
            width: input.width,
            height: input.height,
            originalName: input.originalName,
          },
        });
        mediaAssetsUpserted++;
      }
      logger.log(`[Seed] Upserted ${mediaAssetsUpserted} MediaAsset records in tx.`);

      // 4b. Load all media assets within transaction for foreign key mapping
      const allMediaAssets = await tx.mediaAsset.findMany();
      const mediaMap = new Map<string, { id: string; publicId: string; secureUrl: string }>(
        allMediaAssets.map((m) => [m.publicId, m])
      );

      // 4c. Upsert Invitations & children inside the SAME transaction (no nested tx)
      for (const invDef of SEED_INVITATIONS) {
        if (options?.testFaultInjection?.failOnInvitationSlug === invDef.slug) {
          throw new SeedExecutionError(
            `Injected fault on invitation '${invDef.slug}'.`
          );
        }

        await seedSingleInvitation(tx, invDef, mediaMap, logger);
        invitationsUpserted++;
      }
      logger.log(`[Seed] Upserted ${invitationsUpserted} invitations in tx.`);

      // 4d. Bootstrap Administrator inside the SAME transaction
      if (options?.bootstrapAdmin !== false && adminEmail && adminPassword) {
        logger.log("[Seed] Bootstrapping administrator account in tx...");
        const bootstrapRes: BootstrapAdminResult = await bootstrapAdminUser(
          {
            email: adminEmail,
            password: adminPassword,
            name: "AyaWarta Administrator",
            role: "SUPER_ADMIN",
          },
          tx
        );
        adminBootstrapped = true;
        adminOutcome = bootstrapRes.outcome;
        logger.log(
          `[Seed] Admin user ${adminOutcome} in tx: ${bootstrapRes.email}`
        );
      } else if (options?.requireAdminBootstrap) {
        throw new SeedExecutionError(
          "Admin bootstrap was required but could not be completed."
        );
      } else {
        logger.log(
          "[Seed] Admin bootstrap skipped (no ADMIN_EMAIL/ADMIN_PASSWORD or bootstrapAdmin=false)."
        );
      }
    },
    {
      timeout: 30000, // 30s safety timeout for the full interactive transaction
    }
  );

  if (options?.requireAdminBootstrap && !adminBootstrapped) {
    throw new SeedExecutionError(
      "Admin bootstrap was required but failed to complete in transaction."
    );
  }

  logger.log("[Seed] Transaction committed successfully.");

  // 5. Query Table Counts
  const tableCounts: SeedTableCounts = {
    user: await db.user.count(),
    mediaAsset: await db.mediaAsset.count(),
    invitation: await db.invitation.count(),
    invitationSections: await db.invitationSections.count(),
    partner: await db.partner.count(),
    event: await db.event.count(),
    galleryItem: await db.galleryItem.count(),
    loveStory: await db.loveStory.count(),
    giftAccount: await db.giftAccount.count(),
  };

  logger.log("[Seed] Final row counts across all tables:", tableCounts);

  return {
    mediaAssetsUpserted,
    invitationsUpserted,
    adminBootstrapped,
    adminOutcome,
    tableCounts,
  };
}

/**
 * Seeds a single invitation directly within the interactive transaction client (SEED-01).
 * Does NOT open nested transactions.
 */
async function seedSingleInvitation(
  tx: Prisma.TransactionClient,
  invDef: SeedInvitationDefinition,
  mediaMap: Map<string, { id: string; publicId: string; secureUrl: string }>,
  logger: Pick<Console, "log" | "warn" | "error">
): Promise<void> {
  const { slug } = invDef;

  // Resolve Hero Asset
  const heroAsset = mediaMap.get(invDef.heroTargetPublicId);
  if (!heroAsset) {
    throw new SeedExecutionError(
      `Required hero media asset '${invDef.heroTargetPublicId}' not found in database for slug '${slug}'.`
    );
  }

  // Resolve Music Asset
  let musicAssetId: string | null = null;
  if (invDef.musicTargetPublicId) {
    const musicAsset = mediaMap.get(invDef.musicTargetPublicId);
    if (!musicAsset) {
      throw new SeedExecutionError(
        `Music asset '${invDef.musicTargetPublicId}' specified for slug '${slug}' not found in database.`
      );
    }
    musicAssetId = musicAsset.id;
  }

  // Resolve Partners
  const resolvedPartners = invDef.partners.map((partner) => {
    const photoAsset = mediaMap.get(partner.photoTargetPublicId);
    if (!photoAsset) {
      throw new SeedExecutionError(
        `Required photo asset '${partner.photoTargetPublicId}' for partner '${partner.name}' (${partner.role}) not found for slug '${slug}'.`
      );
    }
    return {
      role: partner.role,
      name: partner.name,
      parents: partner.parents,
      instagram: partner.instagram,
      photoAssetId: photoAsset.id,
    };
  });

  // Resolve Gallery Items
  const resolvedGalleryItems = invDef.galleryItems.map((item, index) => {
    const asset = mediaMap.get(item.assetTargetPublicId);
    if (!asset) {
      throw new SeedExecutionError(
        `Required gallery asset '${item.assetTargetPublicId}' at position ${index + 1} not found for slug '${slug}'.`
      );
    }
    return {
      position: index + 1,
      assetId: asset.id,
      altText: item.altText,
    };
  });

  // 1. Upsert Invitation parent record
  const invitation = await tx.invitation.upsert({
    where: { slug },
    update: {
      theme: invDef.theme,
      variant: invDef.variant,
      weddingDate: invDef.weddingDate,
      heroAssetId: heroAsset.id,
      galleryVideoUrl: invDef.galleryVideoUrl,
      musicAssetId,
    },
    create: {
      slug,
      theme: invDef.theme,
      variant: invDef.variant,
      weddingDate: invDef.weddingDate,
      heroAssetId: heroAsset.id,
      galleryVideoUrl: invDef.galleryVideoUrl,
      musicAssetId,
    },
  });

  // 2. Upsert InvitationSections
  await tx.invitationSections.upsert({
    where: { invitationId: invitation.id },
    update: invDef.sections,
    create: {
      invitationId: invitation.id,
      ...invDef.sections,
    },
  });

  // 3. Replace Partners
  await tx.partner.deleteMany({ where: { invitationId: invitation.id } });
  await tx.partner.createMany({
    data: resolvedPartners.map((p) => ({
      invitationId: invitation.id,
      role: p.role,
      name: p.name,
      parents: p.parents,
      instagram: p.instagram,
      photoAssetId: p.photoAssetId,
    })),
  });

  // 4. Replace Events
  await tx.event.deleteMany({ where: { invitationId: invitation.id } });
  if (invDef.events.length > 0) {
    await tx.event.createMany({
      data: invDef.events.map((e, idx) => ({
        invitationId: invitation.id,
        position: idx + 1,
        name: e.name,
        displayDate: e.displayDate,
        displayTime: e.displayTime,
        location: e.location,
        address: e.address,
        mapUrl: e.mapUrl,
      })),
    });
  }

  // 5. Replace Gallery Items
  await tx.galleryItem.deleteMany({
    where: { invitationId: invitation.id },
  });
  if (resolvedGalleryItems.length > 0) {
    await tx.galleryItem.createMany({
      data: resolvedGalleryItems.map((g) => ({
        invitationId: invitation.id,
        position: g.position,
        assetId: g.assetId,
        altText: g.altText,
      })),
    });
  }

  // 6. Replace Love Stories
  await tx.loveStory.deleteMany({ where: { invitationId: invitation.id } });
  if (invDef.loveStories.length > 0) {
    await tx.loveStory.createMany({
      data: invDef.loveStories.map((s, idx) => ({
        invitationId: invitation.id,
        position: idx + 1,
        title: s.title,
        content: s.content,
      })),
    });
  }

  // 7. Replace Gift Accounts
  await tx.giftAccount.deleteMany({
    where: { invitationId: invitation.id },
  });
  if (invDef.giftAccounts.length > 0) {
    await tx.giftAccount.createMany({
      data: invDef.giftAccounts.map((g, idx) => ({
        invitationId: invitation.id,
        position: idx + 1,
        platform: g.platform,
        accountHolder: g.accountHolder,
        accountNumber: g.accountNumber,
        logoPath: g.logoPath,
      })),
    });
  }

  logger.log(`[Seed] Seeded invitation '${slug}' in tx.`);
}

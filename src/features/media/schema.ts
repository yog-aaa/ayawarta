import { z } from "zod";
import {
  APPROVED_CATEGORIES,
  APPROVED_COUPLE_ROLES,
  APPROVED_INVITATION_SLUGS,
} from "./public-id";
import type {
  CoupleRole,
  InvitationSlug,
  MediaCategory,
} from "./types";

export const invitationSlugSchema = z.enum(
  APPROVED_INVITATION_SLUGS as unknown as [InvitationSlug, ...InvitationSlug[]]
);

export const mediaCategorySchema = z.enum(
  APPROVED_CATEGORIES as unknown as [MediaCategory, ...MediaCategory[]]
);

export const coupleRoleSchema = z.enum(
  APPROVED_COUPLE_ROLES as unknown as [CoupleRole, ...CoupleRole[]]
);

export const sourceTypeSchema = z.enum(["local", "remote"]);

export const cloudinaryResourceTypeSchema = z.enum(["image", "video"]);

export const physicalAssetSchema = z.object({
  id: z.string().min(1),
  slug: invitationSlugSchema,
  category: mediaCategorySchema,
  targetPublicId: z.string().min(1),
  sourceType: sourceTypeSchema,
  sourceLocation: z.string().min(1),
  cloudinaryResourceType: cloudinaryResourceTypeSchema,
  byteSize: z.number().int().nonnegative().nullable(),
  format: z.string().min(1),
  originalFileName: z.string().min(1),
  reusedInUsages: z.array(z.string().min(1)).min(1),
});

export const logicalUsageSchema = z.object({
  usageId: z.string().min(1),
  slug: invitationSlugSchema,
  category: mediaCategorySchema,
  role: coupleRoleSchema.optional(),
  position: z.number().int().positive().optional(),
  altText: z.string().optional(),
  targetPublicId: z.string().min(1),
  isReused: z.boolean(),
  reuseNotes: z.string().optional(),
});

export const unresolvedMusicBlockerSchema = z.object({
  slug: invitationSlugSchema,
  musicUrl: z.string().url(),
  reason: z.string().min(1),
  actionRequired: z.string().min(1),
});

export const slugManifestSummarySchema = z.object({
  physicalAssets: z.number().int().nonnegative(),
  logicalUsages: z.number().int().nonnegative(),
  unresolvedMusic: z.number().int().nonnegative(),
  heroTargetPublicId: z.string().min(1),
});

export const manifestSummarySchema = z.object({
  totalSlugs: z.number().int().positive(),
  totalPhysicalAssets: z.number().int().positive(),
  totalLogicalUsages: z.number().int().positive(),
  totalLocalAssets: z.number().int().nonnegative(),
  totalRemoteAssets: z.number().int().nonnegative(),
  totalImages: z.number().int().nonnegative(),
  totalAudio: z.number().int().nonnegative(),
  totalVideo: z.number().int().nonnegative(),
  unresolvedExternalMusicCount: z.number().int().nonnegative(),
  collisionsDetected: z.number().int().nonnegative(),
  missingLocalFilesCount: z.number().int().nonnegative(),
  slugBreakdown: z.record(z.string(), slugManifestSummarySchema),
});

export const mediaManifestSchema = z.object({
  slugs: z.array(invitationSlugSchema).length(4),
  physicalAssets: z.array(physicalAssetSchema),
  logicalUsages: z.array(logicalUsageSchema),
  unresolvedMusicBlockers: z.array(unresolvedMusicBlockerSchema),
  summary: manifestSummarySchema,
});

export const stage5BProposedEffectsSchema = z.object({
  targetCloudName: z.string().min(1),
  localUploadsCount: z.number().int().nonnegative(),
  remoteUploadsCount: z.number().int().nonnegative(),
  totalUploads: z.number().int().nonnegative(),
  databaseMutations: z.number().int(),
  fileDeletions: z.number().int(),
  details: z.array(z.string().min(1)).min(1),
});

export const dryRunReportSchema = z.object({
  mode: z.literal("dry-run"),
  manifest: mediaManifestSchema,
  stage5BProposedEffects: stage5BProposedEffectsSchema,
});

export type ValidatedDryRunReport = z.infer<typeof dryRunReportSchema>;

export type InvitationSlug =
  | "rika-fauzi"
  | "shidqi-mita"
  | "dudi-aini"
  | "default-preview";

export type MediaCategory = "couple" | "gallery" | "audio" | "video";

export type CoupleRole = "groom" | "bride" | "hero";

export type SourceType = "local" | "remote";

export type CloudinaryResourceType = "image" | "video";

export interface PhysicalAsset {
  id: string; // Target public ID acts as unique key
  slug: InvitationSlug;
  category: MediaCategory;
  targetPublicId: string;
  sourceType: SourceType;
  sourceLocation: string; // POSIX relative path for local, HTTPS URL for remote
  cloudinaryResourceType: CloudinaryResourceType;
  byteSize: number | null; // bytes on disk for local, null for remote in offline dry-run
  format: string; // e.g. "jpg", "png", "mp3"
  originalFileName: string;
  reusedInUsages: string[]; // List of usage IDs pointing to this physical asset
}

export interface LogicalUsage {
  usageId: string; // e.g. "rika-fauzi:couple:hero", "rika-fauzi:gallery:06"
  slug: InvitationSlug;
  category: MediaCategory;
  role?: CoupleRole;
  position?: number; // 1-indexed, for gallery
  altText?: string; // Required for images
  targetPublicId: string; // References PhysicalAsset.targetPublicId
  isReused: boolean;
  reuseNotes?: string;
}

export interface UnresolvedMusicBlocker {
  slug: InvitationSlug;
  musicUrl: string;
  reason: string;
  actionRequired: string;
}

export interface SlugManifestSummary {
  physicalAssets: number;
  logicalUsages: number;
  unresolvedMusic: number;
  heroTargetPublicId: string;
}

export interface ManifestSummary {
  totalSlugs: number;
  totalPhysicalAssets: number;
  totalLogicalUsages: number;
  totalLocalAssets: number;
  totalRemoteAssets: number;
  totalImages: number;
  totalAudio: number;
  totalVideo: number;
  unresolvedExternalMusicCount: number;
  collisionsDetected: number;
  missingLocalFilesCount: number;
  slugBreakdown: Record<InvitationSlug, SlugManifestSummary>;
}

export interface MediaManifest {
  slugs: InvitationSlug[];
  physicalAssets: PhysicalAsset[];
  logicalUsages: LogicalUsage[];
  unresolvedMusicBlockers: UnresolvedMusicBlocker[];
  summary: ManifestSummary;
}

export interface Stage5BProposedEffects {
  targetCloudName: string;
  localUploadsCount: number;
  remoteUploadsCount: number;
  totalUploads: number;
  databaseMutations: number;
  fileDeletions: number;
  details: string[];
}

export interface DryRunReport {
  mode: "dry-run";
  manifest: MediaManifest;
  stage5BProposedEffects: Stage5BProposedEffects;
}

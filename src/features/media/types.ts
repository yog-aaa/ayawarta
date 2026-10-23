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

export type UploadAssetStatus = "uploaded" | "existing_verified" | "failed";

export interface UploadAssetRecord {
  id: string; // Target public ID
  slug: InvitationSlug;
  category: MediaCategory;
  targetPublicId: string;
  resourceType: CloudinaryResourceType;
  status: UploadAssetStatus;
  sourceType: SourceType;
  sourceLocation: string;
  secureUrl: string | null;
  format: string | null;
  bytes: number | null;
  width?: number | null;
  height?: number | null;
  error?: string | null;
}

export interface SlugUploadSummary {
  totalAssets: number;
  uploaded: number;
  existingVerified: number;
  failed: number;
  heroTargetPublicId: string;
  heroVerified: boolean;
  audioTargetPublicId?: string;
  audioVerified?: boolean;
}

export interface CloudinaryUploadSummary {
  totalPhysicalAssets: number;
  uploadedCount: number;
  existingVerifiedCount: number;
  failedCount: number;
  imagesCount: number;
  audioCount: number;
  videoCount: number;
  heroesVerifiedCount: number;
  audiosVerifiedCount: number;
  slugBreakdown: Record<InvitationSlug, SlugUploadSummary>;
}

export interface CloudinaryUploadReport {
  mode: "stage-5b-upload";
  targetCloudName: string;
  generatedAt: string;
  summary: CloudinaryUploadSummary;
  assets: UploadAssetRecord[];
  externalEffects: {
    targetCloudName: string;
    uploadsPerformed: number;
    remoteFetched: number;
    databaseMutations: 0;
    fileDeletions: 0;
    details: string[];
  };
}

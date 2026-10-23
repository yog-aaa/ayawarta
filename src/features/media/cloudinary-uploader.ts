import fs from "node:fs";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import type {
  CloudinaryUploadReport,
  CloudinaryUploadSummary,
  InvitationSlug,
  MediaManifest,
  PhysicalAsset,
  SlugUploadSummary,
  UploadAssetRecord,
} from "./types";
import { LOCAL_AUDIO_DESCRIPTORS } from "./audio-resolution";
import { LOCAL_DERIVED_IMAGE_DESCRIPTORS } from "./image-resolution";

export const OLD_CLOUDINARY_CLOUD_NAME = "doig3gwek";

export interface CloudinaryResourceInfo {
  public_id: string;
  format: string;
  resource_type: "image" | "video";
  bytes: number;
  secure_url: string;
  width?: number;
  height?: number;
  created_at?: string;
}

export interface CloudinaryUploadOptions {
  public_id: string;
  resource_type: "image" | "video";
  unique_filename: boolean;
  overwrite: boolean;
}

export interface ICloudinaryClient {
  ping(): Promise<{ status: string }>;
  getResourcesByIds(
    publicIds: string[],
    options: { resource_type: "image" | "video" }
  ): Promise<CloudinaryResourceInfo[]>;
  upload(
    sourceLocation: string,
    options: CloudinaryUploadOptions
  ): Promise<CloudinaryResourceInfo>;
}

export class RealCloudinaryClient implements ICloudinaryClient {
  private readonly cloudName: string;

  constructor(options: { cloudName: string; apiKey: string; apiSecret: string }) {
    if (!options.cloudName || options.cloudName.trim().length === 0) {
      throw new Error(
        "[SECURITY GUARD] Target Cloudinary cloud name cannot be empty."
      );
    }
    if (options.cloudName.toLowerCase() === OLD_CLOUDINARY_CLOUD_NAME.toLowerCase()) {
      throw new Error(
        `[SECURITY GUARD] Target Cloudinary cloud name cannot be old account '${OLD_CLOUDINARY_CLOUD_NAME}'.`
      );
    }
    if (!options.apiKey || options.apiKey.trim().length === 0) {
      throw new Error("[SECURITY GUARD] CLOUDINARY_API_KEY cannot be empty.");
    }
    if (!options.apiSecret || options.apiSecret.trim().length === 0) {
      throw new Error("[SECURITY GUARD] CLOUDINARY_API_SECRET cannot be empty.");
    }

    this.cloudName = options.cloudName;
    cloudinary.config({
      cloud_name: options.cloudName,
      api_key: options.apiKey,
      api_secret: options.apiSecret,
      secure: true,
    });
  }

  async ping(): Promise<{ status: string }> {
    return cloudinary.api.ping();
  }

  async getResourcesByIds(
    publicIds: string[],
    options: { resource_type: "image" | "video" }
  ): Promise<CloudinaryResourceInfo[]> {
    if (publicIds.length === 0) return [];
    const res = await cloudinary.api.resources_by_ids(publicIds, {
      resource_type: options.resource_type,
    });
    return (res.resources ?? []).map((r: Record<string, unknown>) => ({
      public_id: String(r.public_id),
      format: String(r.format),
      resource_type: r.resource_type as "image" | "video",
      bytes: Number(r.bytes),
      secure_url: String(r.secure_url),
      width: typeof r.width === "number" ? r.width : undefined,
      height: typeof r.height === "number" ? r.height : undefined,
      created_at: typeof r.created_at === "string" ? r.created_at : undefined,
    }));
  }

  async upload(
    sourceLocation: string,
    options: CloudinaryUploadOptions
  ): Promise<CloudinaryResourceInfo> {
    const res = await cloudinary.uploader.upload(sourceLocation, {
      public_id: options.public_id,
      resource_type: options.resource_type,
      unique_filename: options.unique_filename,
      overwrite: options.overwrite,
    });
    return {
      public_id: res.public_id,
      format: res.format,
      resource_type: res.resource_type as "image" | "video",
      bytes: res.bytes,
      secure_url: res.secure_url,
      width: res.width,
      height: res.height,
      created_at: res.created_at,
    };
  }
}

export function sanitizeErrorMessage(err: unknown): string {
  if (!err) return "Unknown error";
  let msg = "";
  if (err instanceof Error) {
    msg = err.message;
  } else if (typeof err === "object" && err !== null) {
    if (
      "message" in err &&
      typeof (err as { message: unknown }).message === "string"
    ) {
      msg = (err as { message: string }).message;
    } else {
      msg = JSON.stringify(err);
    }
  } else {
    msg = String(err);
  }
  msg = msg.replace(/api_key=[^\s&]+/gi, "api_key=[REDACTED]");
  msg = msg.replace(/api_secret=[^\s&]+/gi, "api_secret=[REDACTED]");
  msg = msg.replace(/signature=[^\s&]+/gi, "signature=[REDACTED]");
  msg = msg.replace(/Basic\s+[^\s]+/gi, "Basic [REDACTED]");
  msg = msg.replace(/Bearer\s+[^\s]+/gi, "Bearer [REDACTED]");
  for (const kw of [
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "AUTH_SECRET",
    "DATABASE_URL",
    "ADMIN_PASSWORD",
  ]) {
    msg = msg.replaceAll(kw, "[REDACTED_ENV]");
  }
  return msg;
}

/**
 * Strict Cloudinary delivery URL validation (CLOUD-04).
 * Enforces HTTPS, exact host 'res.cloudinary.com', no credentials/ports/queries/fragments,
 * and requires the exact target cloud name as the first path segment.
 */
export function validateCloudinaryDeliveryUrl(
  urlStr: string,
  expectedCloudName: string
): { valid: boolean; reason?: string } {
  if (typeof urlStr !== "string" || urlStr.length === 0) {
    return { valid: false, reason: "Delivery URL must be a non-empty string" };
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return { valid: false, reason: `Invalid URL format: '${urlStr}'` };
  }

  if (parsed.protocol !== "https:") {
    return { valid: false, reason: `Must use HTTPS, got '${parsed.protocol}'` };
  }

  if (parsed.hostname !== "res.cloudinary.com") {
    return {
      valid: false,
      reason: `Hostname must be strictly 'res.cloudinary.com', got '${parsed.hostname}'`,
    };
  }

  if (parsed.username || parsed.password) {
    return { valid: false, reason: "URL must not contain credentials" };
  }

  if (parsed.port && parsed.port !== "443" && parsed.port !== "") {
    return {
      valid: false,
      reason: `URL must not use custom port '${parsed.port}'`,
    };
  }

  if (parsed.search && parsed.search.length > 0) {
    return { valid: false, reason: "URL must not contain query parameters" };
  }

  if (parsed.hash && parsed.hash.length > 0) {
    return { valid: false, reason: "URL must not contain hash fragments" };
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length === 0 || segments[0] !== expectedCloudName) {
    return {
      valid: false,
      reason: `First path segment must be target cloud name '${expectedCloudName}', got '${segments[0]}'`,
    };
  }

  if (segments[0] === OLD_CLOUDINARY_CLOUD_NAME) {
    return {
      valid: false,
      reason: `URL points to old Cloudinary account '${OLD_CLOUDINARY_CLOUD_NAME}'`,
    };
  }

  return { valid: true };
}

export interface MatchVerificationResult {
  match: boolean;
  reason?: string;
}

/**
 * Strong existing-resource proof (CLOUD-03).
 * Verifies public ID, resource type, strict URL ownership, format, and exact expected byte sizes.
 */
export function verifyExistingAssetMatch(
  asset: PhysicalAsset,
  existing: CloudinaryResourceInfo,
  expectedCloudName: string
): MatchVerificationResult {
  if (existing.public_id !== asset.targetPublicId) {
    return {
      match: false,
      reason: `Public ID mismatch: expected '${asset.targetPublicId}', got '${existing.public_id}'`,
    };
  }

  if (existing.resource_type !== asset.cloudinaryResourceType) {
    return {
      match: false,
      reason: `Resource type mismatch: expected '${asset.cloudinaryResourceType}', got '${existing.resource_type}'`,
    };
  }

  const urlVal = validateCloudinaryDeliveryUrl(existing.secure_url, expectedCloudName);
  if (!urlVal.valid) {
    return {
      match: false,
      reason: `Invalid delivery URL: ${urlVal.reason}`,
    };
  }

  if (!existing.bytes || existing.bytes <= 0) {
    return {
      match: false,
      reason: `Existing resource has invalid or zero byte size: ${existing.bytes}`,
    };
  }

  // Format compatibility: allow jpeg/jpg equivalence
  const expFmt = asset.format.toLowerCase() === "jpeg" ? "jpg" : asset.format.toLowerCase();
  const actFmt = existing.format.toLowerCase() === "jpeg" ? "jpg" : existing.format.toLowerCase();
  if (expFmt !== actFmt) {
    return {
      match: false,
      reason: `Format mismatch: expected '${expFmt}', got '${actFmt}'`,
    };
  }

  // Local audio exact size check
  if (asset.category === "audio" && asset.sourceType === "local") {
    const desc = LOCAL_AUDIO_DESCRIPTORS.find((d) => d.slug === asset.slug);
    if (desc && existing.bytes !== desc.expectedByteSize) {
      return {
        match: false,
        reason: `Audio byte size mismatch: expected ${desc.expectedByteSize}, got ${existing.bytes}`,
      };
    }
  }

  // Local derived image exact size and dimension check (CLOUD-01 / CLOUD-03)
  if (asset.sourceLocation.includes("rika-fauzi-hero.jpg")) {
    const desc = LOCAL_DERIVED_IMAGE_DESCRIPTORS.find((d) => d.slug === "rika-fauzi");
    if (desc) {
      if (existing.bytes !== desc.expectedByteSize) {
        return {
          match: false,
          reason: `Derived hero image byte size mismatch: expected ${desc.expectedByteSize}, got ${existing.bytes}`,
        };
      }
      if (
        existing.width !== undefined &&
        existing.height !== undefined &&
        (existing.width !== desc.expectedWidth || existing.height !== desc.expectedHeight)
      ) {
        return {
          match: false,
          reason: `Derived hero image dimensions mismatch: expected ${desc.expectedWidth}x${desc.expectedHeight}, got ${existing.width}x${existing.height}`,
        };
      }
    }
  }

  // Local regular source image exact size check (CLOUD-03)
  if (
    asset.sourceType === "local" &&
    asset.category !== "audio" &&
    !asset.sourceLocation.includes("rika-fauzi-hero.jpg")
  ) {
    if (asset.byteSize !== null && existing.bytes !== asset.byteSize) {
      return {
        match: false,
        reason: `Local image byte size mismatch: expected ${asset.byteSize}, got ${existing.bytes}`,
      };
    }
  }

  return { match: true };
}

export interface MigrationExecutionOptions {
  manifest: MediaManifest;
  client: ICloudinaryClient;
  cloudName: string;
  repoRoot?: string;
  logger?: Pick<Console, "log" | "warn" | "error">;
}

export interface MigrationExecutionResult {
  success: boolean;
  report: CloudinaryUploadReport;
  error?: string;
}

export async function executeCloudinaryMigration(
  options: MigrationExecutionOptions
): Promise<MigrationExecutionResult> {
  const { manifest, client, cloudName } = options;
  const repoRoot = options.repoRoot ?? process.cwd();
  const logger = options.logger ?? console;

  // 1. Preflight safety guards
  if (!cloudName || cloudName.trim().length === 0) {
    throw new Error("[SECURITY GUARD] Target cloud name cannot be empty.");
  }
  if (cloudName.toLowerCase() === OLD_CLOUDINARY_CLOUD_NAME.toLowerCase()) {
    throw new Error(
      `[SECURITY GUARD] Target cloud name cannot be old account '${OLD_CLOUDINARY_CLOUD_NAME}'.`
    );
  }

  logger.log(`[Preflight] Verifying target cloud '${cloudName}'...`);
  try {
    const pingRes = await client.ping();
    if (pingRes.status !== "ok") {
      throw new Error(`Cloudinary ping returned status: ${pingRes.status}`);
    }
    logger.log(`[Preflight] Cloudinary read-only ping successful (status: ${pingRes.status}).`);
  } catch (err) {
    const safeMsg = sanitizeErrorMessage(err);
    logger.error(`[Preflight FAILED] Cloudinary ping failed: ${safeMsg}`);
    throw new Error(`Cloudinary ping failed: ${safeMsg}`);
  }

  // Invariant verification on manifest
  if (manifest.physicalAssets.length !== 31) {
    throw new Error(
      `Manifest invariant failed: expected exactly 31 physical assets, got ${manifest.physicalAssets.length}`
    );
  }
  if (manifest.unresolvedMusicBlockers.length !== 0) {
    throw new Error(
      `Manifest invariant failed: expected 0 unresolved music blockers, got ${manifest.unresolvedMusicBlockers.length}`
    );
  }

  // 2. Inventory target account for existing resources across both resource types
  logger.log("[Preflight] Inventorying target account for existing resources...");
  const allTargetPublicIds = manifest.physicalAssets.map(
    (a) => a.targetPublicId
  );

  const existingImageResources = await client.getResourcesByIds(
    allTargetPublicIds,
    { resource_type: "image" }
  );
  const existingAudioResources = await client.getResourcesByIds(
    allTargetPublicIds,
    { resource_type: "video" }
  );

  const existingMap = new Map<string, CloudinaryResourceInfo>();
  for (const r of [...existingImageResources, ...existingAudioResources]) {
    existingMap.set(r.public_id, r);
  }

  logger.log(
    `[Preflight] Found ${existingMap.size} existing resource(s) on target cloud under target public IDs.`
  );

  // 3. Conflict detection on existing assets
  for (const asset of manifest.physicalAssets) {
    const existing = existingMap.get(asset.targetPublicId);
    if (existing) {
      const match = verifyExistingAssetMatch(asset, existing, cloudName);
      if (!match.match) {
        const conflictErr = `[CONFLICT REFUSAL] Target public ID '${asset.targetPublicId}' already exists but conflicts with manifest asset! Reason: ${match.reason}. Halting without overwrite or deletion.`;
        logger.error(conflictErr);
        throw new Error(conflictErr);
      }
    }
  }

  // 4. Execute uploads
  logger.log(`[Execution] Migrating ${manifest.physicalAssets.length} physical assets...`);
  const initialAssetRecords: UploadAssetRecord[] = [];
  let uploadsPerformed = 0;
  let remoteFetched = 0;

  for (const asset of manifest.physicalAssets) {
    const existing = existingMap.get(asset.targetPublicId);

    if (existing) {
      // Existing verified asset
      logger.log(`  • [EXISTING_VERIFIED] ${asset.targetPublicId}`);
      initialAssetRecords.push({
        id: asset.targetPublicId,
        slug: asset.slug,
        category: asset.category,
        targetPublicId: asset.targetPublicId,
        resourceType: asset.cloudinaryResourceType,
        status: "existing_verified",
        sourceType: asset.sourceType,
        sourceLocation: asset.sourceLocation,
        secureUrl: existing.secure_url,
        format: existing.format,
        bytes: existing.bytes,
        width: existing.width ?? null,
        height: existing.height ?? null,
        error: null,
      });
      continue;
    }

    // Determine upload source
    let uploadSource: string;
    if (asset.sourceType === "local") {
      uploadSource = path.resolve(repoRoot, asset.sourceLocation);
      if (!fs.existsSync(uploadSource)) {
        const msg = `Local source file not found at: ${uploadSource}`;
        logger.error(`  • [FAILED] ${asset.targetPublicId}: ${msg}`);
        initialAssetRecords.push({
          id: asset.targetPublicId,
          slug: asset.slug,
          category: asset.category,
          targetPublicId: asset.targetPublicId,
          resourceType: asset.cloudinaryResourceType,
          status: "failed",
          sourceType: asset.sourceType,
          sourceLocation: asset.sourceLocation,
          secureUrl: null,
          format: null,
          bytes: null,
          error: msg,
        });
        continue;
      }
    } else {
      // Remote source
      if (!asset.sourceLocation.startsWith(`https://res.cloudinary.com/${OLD_CLOUDINARY_CLOUD_NAME}/`)) {
        const msg = `Remote source location not allowed: ${asset.sourceLocation}`;
        logger.error(`  • [FAILED] ${asset.targetPublicId}: ${msg}`);
        initialAssetRecords.push({
          id: asset.targetPublicId,
          slug: asset.slug,
          category: asset.category,
          targetPublicId: asset.targetPublicId,
          resourceType: asset.cloudinaryResourceType,
          status: "failed",
          sourceType: asset.sourceType,
          sourceLocation: asset.sourceLocation,
          secureUrl: null,
          format: null,
          bytes: null,
          error: msg,
        });
        continue;
      }
      uploadSource = asset.sourceLocation;
    }

    try {
      logger.log(`  • [UPLOADING] ${asset.targetPublicId} (source: ${asset.sourceType})...`);
      const uploadRes = await client.upload(uploadSource, {
        public_id: asset.targetPublicId,
        resource_type: asset.cloudinaryResourceType,
        unique_filename: false,
        overwrite: false,
      });

      // Validate response
      const match = verifyExistingAssetMatch(asset, uploadRes, cloudName);
      if (!match.match) {
        throw new Error(`Upload returned incompatible metadata: ${match.reason}`);
      }

      logger.log(`  • [UPLOADED] ${asset.targetPublicId} (${uploadRes.bytes} bytes, format: ${uploadRes.format})`);
      initialAssetRecords.push({
        id: asset.targetPublicId,
        slug: asset.slug,
        category: asset.category,
        targetPublicId: asset.targetPublicId,
        resourceType: asset.cloudinaryResourceType,
        status: "uploaded",
        sourceType: asset.sourceType,
        sourceLocation: asset.sourceLocation,
        secureUrl: uploadRes.secure_url,
        format: uploadRes.format,
        bytes: uploadRes.bytes,
        width: uploadRes.width ?? null,
        height: uploadRes.height ?? null,
        error: null,
      });

      uploadsPerformed++;
      if (asset.sourceType === "remote") {
        remoteFetched++;
      }
    } catch (err) {
      const safeErr = sanitizeErrorMessage(err);
      logger.error(`  • [FAILED] ${asset.targetPublicId}: ${safeErr}`);
      initialAssetRecords.push({
        id: asset.targetPublicId,
        slug: asset.slug,
        category: asset.category,
        targetPublicId: asset.targetPublicId,
        resourceType: asset.cloudinaryResourceType,
        status: "failed",
        sourceType: asset.sourceType,
        sourceLocation: asset.sourceLocation,
        secureUrl: null,
        format: null,
        bytes: null,
        error: safeErr,
      });
      continue;
    }
  }

  // 5. Post-upload live read-back from Cloudinary Admin API (CLOUD-02)
  logger.log("[Live Read-Back] Querying Admin API for all 31 target resources...");
  const readBackImages = await client.getResourcesByIds(allTargetPublicIds, {
    resource_type: "image",
  });
  const readBackAudios = await client.getResourcesByIds(allTargetPublicIds, {
    resource_type: "video",
  });

  const liveMap = new Map<string, CloudinaryResourceInfo>();
  for (const r of [...readBackImages, ...readBackAudios]) {
    liveMap.set(r.public_id, r);
  }

  const finalAssetRecords: UploadAssetRecord[] = [];
  let readBackFailures = 0;

  for (const asset of manifest.physicalAssets) {
    const live = liveMap.get(asset.targetPublicId);
    const inMemoryRecord = initialAssetRecords.find(
      (a) => a.targetPublicId === asset.targetPublicId
    );

    if (!live) {
      logger.error(
        `  • [LIVE READ-BACK FAILED] Target '${asset.targetPublicId}' not found on Cloudinary on post-upload read-back!`
      );
      finalAssetRecords.push({
        id: asset.targetPublicId,
        slug: asset.slug,
        category: asset.category,
        targetPublicId: asset.targetPublicId,
        resourceType: asset.cloudinaryResourceType,
        status: "failed",
        sourceType: asset.sourceType,
        sourceLocation: asset.sourceLocation,
        secureUrl: null,
        format: null,
        bytes: null,
        error:
          inMemoryRecord?.status === "failed" && inMemoryRecord.error
            ? inMemoryRecord.error
            : "Missing from target account on post-upload live read-back",
      });
      readBackFailures++;
      continue;
    }

    const match = verifyExistingAssetMatch(asset, live, cloudName);
    if (!match.match) {
      logger.error(
        `  • [LIVE READ-BACK MISMATCH] Target '${asset.targetPublicId}' metadata mismatch: ${match.reason}`
      );
      finalAssetRecords.push({
        id: asset.targetPublicId,
        slug: asset.slug,
        category: asset.category,
        targetPublicId: asset.targetPublicId,
        resourceType: asset.cloudinaryResourceType,
        status: "failed",
        sourceType: asset.sourceType,
        sourceLocation: asset.sourceLocation,
        secureUrl: live.secure_url,
        format: live.format,
        bytes: live.bytes,
        width: live.width ?? null,
        height: live.height ?? null,
        error: `Live read-back metadata mismatch: ${match.reason}`,
      });
      readBackFailures++;
      continue;
    }

    // Determine status: was it existing_verified or newly uploaded
    const status: "uploaded" | "existing_verified" =
      inMemoryRecord?.status === "uploaded" ? "uploaded" : "existing_verified";

    finalAssetRecords.push({
      id: asset.targetPublicId,
      slug: asset.slug,
      category: asset.category,
      targetPublicId: asset.targetPublicId,
      resourceType: asset.cloudinaryResourceType,
      status,
      sourceType: asset.sourceType,
      sourceLocation: asset.sourceLocation,
      secureUrl: live.secure_url,
      format: live.format,
      bytes: live.bytes,
      width: live.width ?? null,
      height: live.height ?? null,
      error: null,
    });
  }

  // 6. Compute summaries directly from live read-back records
  let heroesVerifiedCount = 0;
  let audiosVerifiedCount = 0;

  const verifiedRecordMap = new Map<string, UploadAssetRecord>();
  for (const r of finalAssetRecords) {
    if (r.status === "uploaded" || r.status === "existing_verified") {
      verifiedRecordMap.set(r.targetPublicId, r);
    }
  }

  const expectedHeroPublicIds: Record<InvitationSlug, string> = {
    "rika-fauzi": "ayawarta/production/invitations/rika-fauzi/couple/hero",
    "shidqi-mita": "ayawarta/production/invitations/shidqi-mita/couple/hero",
    "dudi-aini": "ayawarta/production/invitations/dudi-aini/couple/hero",
    "default-preview": "ayawarta/production/invitations/default-preview/couple/hero",
  };

  const expectedAudioPublicIds: Record<InvitationSlug, string> = {
    "rika-fauzi": "ayawarta/production/invitations/rika-fauzi/audio/background-music",
    "shidqi-mita": "ayawarta/production/invitations/shidqi-mita/audio/background-music",
    "dudi-aini": "ayawarta/production/invitations/dudi-aini/audio/background-music",
    "default-preview": "ayawarta/production/invitations/default-preview/audio/background-music",
  };

  const slugBreakdown = {} as Record<InvitationSlug, SlugUploadSummary>;

  for (const slug of manifest.slugs) {
    const slugAssets = finalAssetRecords.filter((a) => a.slug === slug);
    const heroId = expectedHeroPublicIds[slug];
    const audioId = expectedAudioPublicIds[slug];

    const heroRec = verifiedRecordMap.get(heroId);
    const heroVerified = Boolean(heroRec && heroRec.status !== "failed");
    if (heroVerified) heroesVerifiedCount++;

    const audioRec = verifiedRecordMap.get(audioId);
    const audioVerified = Boolean(audioRec && audioRec.status !== "failed");
    if (audioVerified) audiosVerifiedCount++;

    slugBreakdown[slug] = {
      totalAssets: manifest.physicalAssets.filter((a) => a.slug === slug).length,
      uploaded: slugAssets.filter((a) => a.status === "uploaded").length,
      existingVerified: slugAssets.filter((a) => a.status === "existing_verified").length,
      failed: slugAssets.filter((a) => a.status === "failed").length,
      heroTargetPublicId: heroId,
      heroVerified,
      audioTargetPublicId: audioId,
      audioVerified,
    };
  }

  const uploadedCount = finalAssetRecords.filter((a) => a.status === "uploaded").length;
  const existingVerifiedCount = finalAssetRecords.filter((a) => a.status === "existing_verified").length;
  const totalFailed = finalAssetRecords.filter((a) => a.status === "failed").length;

  const summary: CloudinaryUploadSummary = {
    totalPhysicalAssets: manifest.physicalAssets.length,
    uploadedCount,
    existingVerifiedCount,
    failedCount: totalFailed,
    imagesCount: manifest.summary.totalImages,
    audioCount: manifest.summary.totalAudio,
    videoCount: manifest.summary.totalVideo,
    heroesVerifiedCount,
    audiosVerifiedCount,
    slugBreakdown,
  };

  const report: CloudinaryUploadReport = {
    mode: "stage-5b-upload",
    targetCloudName: cloudName,
    generatedAt: new Date().toISOString(),
    summary,
    assets: finalAssetRecords,
    externalEffects: {
      targetCloudName: cloudName,
      uploadsPerformed,
      remoteFetched,
      databaseMutations: 0,
      fileDeletions: 0,
      details: [
        `Target Cloudinary account: '${cloudName}' (distinct from old account '${OLD_CLOUDINARY_CLOUD_NAME}')`,
        `Uploaded ${uploadedCount} new asset(s) and verified ${existingVerifiedCount} existing asset(s).`,
        `Fetched ${remoteFetched} remote asset(s) from old Cloudinary.`,
        `Verified ${heroesVerifiedCount}/4 explicit heroes and ${audiosVerifiedCount}/4 audio assets.`,
        `0 database mutations performed (Prisma seed deferred to Stage 6).`,
        `0 local files deleted (cleanup deferred to Stage 10).`,
      ],
    },
  };

  const isSuccess =
    totalFailed === 0 &&
    readBackFailures === 0 &&
    finalAssetRecords.length === manifest.physicalAssets.length &&
    heroesVerifiedCount === 4 &&
    audiosVerifiedCount === 4;

  return {
    success: isSuccess,
    report,
    error: totalFailed > 0 ? `Upload failed for ${totalFailed} asset(s)` : undefined,
  };
}

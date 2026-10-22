import fs from "node:fs";
import path from "node:path";
import {
  getDefaultInvitation,
  getInvitationBySlug,
} from "@/lib/invitations";
import {
  APPROVED_INVITATION_SLUGS,
  buildAudioPublicId,
  buildCouplePublicId,
  buildGalleryPublicId,
  validateInvitationPublicId,
} from "@/features/media/public-id";
import type {
  DryRunReport,
  InvitationSlug,
  LogicalUsage,
  MediaCategory,
  MediaManifest,
  PhysicalAsset,
  SlugManifestSummary,
  Stage5BProposedEffects,
  UnresolvedMusicBlocker,
} from "@/features/media/types";

export interface ManifestOptions {
  repoRoot?: string;
}

export const OLD_CLOUDINARY_HOST = "res.cloudinary.com";
export const OLD_CLOUDINARY_ACCOUNT_PATH_PREFIX = "/doig3gwek/";

export const APPROVED_LOCAL_SOURCE_ROOTS = [
  "public/images/SAMPLE",
  "public/images/dummy-couples",
] as const;

function getFileExtension(sourceLocation: string): string {
  const clean = sourceLocation.split("?")[0].split("#")[0];
  const ext = path.extname(clean).replace(/^\./, "").toLowerCase();
  return ext;
}

function getFileName(sourceLocation: string): string {
  const clean = sourceLocation.split("?")[0].split("#")[0];
  return path.basename(clean);
}

/**
 * Validates a remote source URL against the old Cloudinary delivery allowlist.
 * Dry-run does NOT perform HEAD, GET, or any network operations.
 */
export function validateRemoteCloudinaryUrl(urlStr: string): {
  valid: boolean;
  reason?: string;
} {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return { valid: false, reason: `Invalid URL format: ${urlStr}` };
  }

  if (parsed.protocol !== "https:") {
    return {
      valid: false,
      reason: `Remote source must use HTTPS, got protocol '${parsed.protocol}'`,
    };
  }

  // MEDIA-05: Reject username / password (userinfo)
  if (parsed.username || parsed.password) {
    return {
      valid: false,
      reason: "Remote URL must not contain user credentials (username/password)",
    };
  }

  // MEDIA-05: Reject non-default port
  if (parsed.port && parsed.port !== "443" && parsed.port !== "") {
    return {
      valid: false,
      reason: `Remote URL must not use custom port, got '${parsed.port}'`,
    };
  }

  if (parsed.hostname !== OLD_CLOUDINARY_HOST) {
    return {
      valid: false,
      reason: `Remote source host '${parsed.hostname}' is not in approved allowlist ('${OLD_CLOUDINARY_HOST}')`,
    };
  }

  if (!parsed.pathname.startsWith(OLD_CLOUDINARY_ACCOUNT_PATH_PREFIX)) {
    return {
      valid: false,
      reason: `Remote source path '${parsed.pathname}' does not match old account prefix ('${OLD_CLOUDINARY_ACCOUNT_PATH_PREFIX}')`,
    };
  }

  // MEDIA-05: Reject query parameters
  if (parsed.search && parsed.search.length > 0) {
    return {
      valid: false,
      reason: "Remote URL must not contain query parameters",
    };
  }

  // MEDIA-05: Reject hash fragments
  if (parsed.hash && parsed.hash.length > 0) {
    return {
      valid: false,
      reason: "Remote URL must not contain hash fragments",
    };
  }

  return { valid: true };
}

/**
 * Validates and resolves a local source path within the approved repository source roots.
 */
export function validateLocalSource(
  localSourcePath: string,
  repoRoot: string
): {
  valid: boolean;
  posixRelativePath?: string;
  absolutePath?: string;
  byteSize?: number;
  reason?: string;
} {
  // MEDIA-01: Raw input checks before any normalization
  if (typeof localSourcePath !== "string" || localSourcePath.length === 0) {
    return { valid: false, reason: "Local source path must be a non-empty string" };
  }

  if (localSourcePath.includes("\0")) {
    return { valid: false, reason: "Local source path cannot contain null bytes" };
  }

  if (localSourcePath.includes("\\")) {
    return { valid: false, reason: "Local source path cannot contain backslashes" };
  }

  if (localSourcePath.includes("..")) {
    return { valid: false, reason: "Local source path cannot contain path traversal (..)" };
  }

  if (/^[a-zA-Z]:/.test(localSourcePath) || localSourcePath.startsWith("//")) {
    return { valid: false, reason: "Local source path cannot be a drive or UNC path" };
  }

  if (localSourcePath.includes("//")) {
    return { valid: false, reason: "Local source path cannot contain empty segments (//)" };
  }

  // Invitation sources start with /images/...
  // Single leading slash is expected for web relative URLs.
  const stripped = localSourcePath.replace(/^\/+/, "");
  const segments = stripped.split("/");
  if (segments.some((seg) => seg.length === 0)) {
    return { valid: false, reason: "Local source path contains empty segments" };
  }

  const posixRel = stripped.startsWith("public/") ? stripped : `public/${stripped}`;

  const candidateAbsolute = path.resolve(repoRoot, posixRel);
  if (!fs.existsSync(candidateAbsolute)) {
    return {
      valid: false,
      reason: `Local file does not exist: ${posixRel}`,
    };
  }

  // Resolve realpath for candidate to resolve any symlinks/junctions
  let candidateRealPath: string;
  try {
    candidateRealPath = fs.realpathSync(candidateAbsolute);
  } catch (err) {
    return {
      valid: false,
      reason: `Failed to resolve realpath for '${posixRel}': ${(err as Error).message}`,
    };
  }

  // Check if candidate is inside repository root via realpath
  let repoRealPath: string;
  try {
    repoRealPath = fs.realpathSync(path.resolve(repoRoot));
  } catch (err) {
    return {
      valid: false,
      reason: `Failed to resolve repo root realpath: ${(err as Error).message}`,
    };
  }

  const relToRepo = path.relative(repoRealPath, candidateRealPath);
  if (relToRepo.startsWith("..") || path.isAbsolute(relToRepo)) {
    return {
      valid: false,
      reason: `Resolved path escapes repository root: ${candidateRealPath}`,
    };
  }

  // Exact path boundary check against approved source roots via realpath
  let matchingApprovedRoot: string | null = null;
  for (const rootRel of APPROVED_LOCAL_SOURCE_ROOTS) {
    const rootAbs = path.resolve(repoRoot, rootRel);
    if (!fs.existsSync(rootAbs)) continue;
    let rootRealPath: string;
    try {
      rootRealPath = fs.realpathSync(rootAbs);
    } catch {
      continue;
    }

    // Boundary-safe containment check using path.relative:
    const rel = path.relative(rootRealPath, candidateRealPath);
    const isContained = !rel.startsWith("..") && !path.isAbsolute(rel);
    if (isContained) {
      matchingApprovedRoot = rootRel;
      break;
    }
  }

  if (!matchingApprovedRoot) {
    return {
      valid: false,
      reason: `Resolved path '${candidateRealPath}' is outside approved source roots: ${APPROVED_LOCAL_SOURCE_ROOTS.join(", ")}`,
    };
  }

  let stat: fs.Stats;
  try {
    stat = fs.statSync(candidateRealPath);
  } catch (err) {
    return {
      valid: false,
      reason: `Failed to stat file '${posixRel}': ${(err as Error).message}`,
    };
  }

  if (!stat.isFile()) {
    return {
      valid: false,
      reason: `Resolved path is not a file: ${posixRel}`,
    };
  }

  if (stat.size === 0) {
    return {
      valid: false,
      reason: `Local file has 0 byte size: ${posixRel}`,
    };
  }

  try {
    fs.accessSync(candidateRealPath, fs.constants.R_OK);
  } catch {
    return {
      valid: false,
      reason: `Local file is not readable: ${posixRel}`,
    };
  }

  return {
    valid: true,
    posixRelativePath: posixRel,
    absolutePath: candidateRealPath,
    byteSize: stat.size,
  };
}

/**
 * Builds the complete deterministic typed media manifest from actual repository invitation data.
 */
export function generateMediaManifest(options?: ManifestOptions): MediaManifest {
  const repoRoot = options?.repoRoot ? path.resolve(options.repoRoot) : process.cwd();

  const physicalAssets: PhysicalAsset[] = [];
  const logicalUsages: LogicalUsage[] = [];
  const unresolvedMusicBlockers: UnresolvedMusicBlocker[] = [];
  const slugSummaries: Record<InvitationSlug, SlugManifestSummary> = {} as Record<
    InvitationSlug,
    SlugManifestSummary
  >;

  // Map to track registered physical assets by their source location per slug
  // This allows clean reuse tracking (e.g., couple hero also used in gallery)
  const sourceToPhysicalAsset = new Map<string, PhysicalAsset>();

  function registerAssetUsage(params: {
    slug: InvitationSlug;
    category: MediaCategory;
    role?: "groom" | "bride" | "hero";
    position?: number;
    rawSource: string;
    altText?: string;
    targetPublicIdProposal: string;
    cloudinaryResourceType: "image" | "video";
  }) {
    const {
      slug,
      category,
      role,
      position,
      rawSource,
      altText,
      targetPublicIdProposal,
      cloudinaryResourceType,
    } = params;

    // Validate public ID proposal
    const pidValidation = validateInvitationPublicId(targetPublicIdProposal);
    if (!pidValidation.valid) {
      throw new Error(
        `Invalid target public ID proposed: ${targetPublicIdProposal}. Reason: ${pidValidation.reason}`
      );
    }

    const isRemote = rawSource.startsWith("http://") || rawSource.startsWith("https://");

    let sourceLocation: string;
    let byteSize: number | null = null;
    let format: string;
    let originalFileName: string;

    if (isRemote) {
      const remoteValidation = validateRemoteCloudinaryUrl(rawSource);
      if (!remoteValidation.valid) {
        throw new Error(
          `Invalid remote URL for slug '${slug}', category '${category}': ${remoteValidation.reason}`
        );
      }
      sourceLocation = rawSource;
      format = getFileExtension(rawSource);
      originalFileName = getFileName(rawSource);
    } else {
      const localValidation = validateLocalSource(rawSource, repoRoot);
      if (!localValidation.valid) {
        throw new Error(
          `Invalid local source for slug '${slug}', category '${category}': ${localValidation.reason}`
        );
      }
      sourceLocation = localValidation.posixRelativePath!;
      byteSize = localValidation.byteSize!;
      format = getFileExtension(sourceLocation);
      originalFileName = getFileName(sourceLocation);
    }

    // Determine usage ID
    const usageId = role
      ? `${slug}:${category}:${role}`
      : position
        ? `${slug}:${category}:${String(position).padStart(2, "0")}`
        : `${slug}:${category}:item`;

    // Check if this source has already been registered as a physical asset for this slug
    const sourceKey = `${slug}::${sourceLocation}`;
    const existingPhysicalAsset = sourceToPhysicalAsset.get(sourceKey);

    if (existingPhysicalAsset) {
      // Asset reuse!
      existingPhysicalAsset.reusedInUsages.push(usageId);

      const usage: LogicalUsage = {
        usageId,
        slug,
        category,
        role,
        position,
        altText,
        targetPublicId: existingPhysicalAsset.targetPublicId,
        isReused: true,
        reuseNotes: `Reuses asset '${existingPhysicalAsset.targetPublicId}' from source '${sourceLocation}'`,
      };
      logicalUsages.push(usage);
    } else {
      // New physical asset
      const targetPublicId = targetPublicIdProposal;

      // Check collision with any existing target public ID
      const collision = physicalAssets.find((a) => a.targetPublicId === targetPublicId);
      if (collision) {
        throw new Error(
          `Public ID collision detected! '${targetPublicId}' is already assigned to source '${collision.sourceLocation}'`
        );
      }

      const physicalAsset: PhysicalAsset = {
        id: targetPublicId,
        slug,
        category,
        targetPublicId,
        sourceType: isRemote ? "remote" : "local",
        sourceLocation,
        cloudinaryResourceType,
        byteSize,
        format,
        originalFileName,
        reusedInUsages: [usageId],
      };

      physicalAssets.push(physicalAsset);
      sourceToPhysicalAsset.set(sourceKey, physicalAsset);

      const usage: LogicalUsage = {
        usageId,
        slug,
        category,
        role,
        position,
        altText,
        targetPublicId,
        isReused: false,
      };
      logicalUsages.push(usage);
    }
  }

  // Iterate over all 4 approved slugs in order
  for (const slug of APPROVED_INVITATION_SLUGS) {
    const inv = slug === "default-preview" ? getDefaultInvitation() : getInvitationBySlug(slug);
    if (!inv) {
      throw new Error(`Invitation data not found for slug '${slug}'`);
    }

    const { data } = inv;
    const groomName = data.couple.groom.name;
    const brideName = data.couple.bride.name;

    // 1. Groom
    registerAssetUsage({
      slug,
      category: "couple",
      role: "groom",
      rawSource: data.couple.groom.photo,
      altText: `Foto Mempelai Pria: ${groomName}`,
      targetPublicIdProposal: buildCouplePublicId(slug, "groom"),
      cloudinaryResourceType: "image",
    });

    // 2. Bride
    registerAssetUsage({
      slug,
      category: "couple",
      role: "bride",
      rawSource: data.couple.bride.photo,
      altText: `Foto Mempelai Wanita: ${brideName}`,
      targetPublicIdProposal: buildCouplePublicId(slug, "bride"),
      cloudinaryResourceType: "image",
    });

    // 3. Hero (Mandatory exactly 1 per slug)
    registerAssetUsage({
      slug,
      category: "couple",
      role: "hero",
      rawSource: data.couple.heroImage,
      altText: `Foto Utama Pasangan ${groomName} dan ${brideName}`,
      targetPublicIdProposal: buildCouplePublicId(slug, "hero"),
      cloudinaryResourceType: "image",
    });

    // 4. Gallery Images (1-indexed, ordered)
    if (data.gallery && Array.isArray(data.gallery.images)) {
      data.gallery.images.forEach((imgSource, idx) => {
        const position = idx + 1;
        const altText =
          slug === "default-preview"
            ? `Foto Galeri ${position}: Contoh Foto Undangan Pernikahan`
            : `Foto Galeri ${position}: Momen Bahagia ${groomName} dan ${brideName}`;

        registerAssetUsage({
          slug,
          category: "gallery",
          position,
          rawSource: imgSource,
          altText,
          targetPublicIdProposal: buildGalleryPublicId(slug, position),
          cloudinaryResourceType: "image",
        });
      });
    }

    // 5. Music
    if (data.musicUrl) {
      if (
        data.musicUrl.includes("youtube.com") ||
        data.musicUrl.includes("youtu.be")
      ) {
        // Flag explicitly as unresolvedExternalMusic blocker
        unresolvedMusicBlockers.push({
          slug,
          musicUrl: data.musicUrl,
          reason: "YouTube URLs cannot be uploaded directly to Cloudinary as media files",
          actionRequired:
            "Provide official MP3 audio file or make an explicit decision before Stage 5B live upload",
        });
      } else if (data.musicUrl.startsWith("https://res.cloudinary.com/")) {
        // Valid audio delivered from old Cloudinary account (e.g. dudi-aini)
        registerAssetUsage({
          slug,
          category: "audio",
          rawSource: data.musicUrl,
          targetPublicIdProposal: buildAudioPublicId(slug, "background-music"),
          cloudinaryResourceType: "video", // Cloudinary SDK uses 'video' for audio files
        });
      }
    }

    // Summary calculation for this slug
    const slugPhysical = physicalAssets.filter((a) => a.slug === slug);
    const slugUsages = logicalUsages.filter((u) => u.slug === slug);
    const slugMusicBlocker = unresolvedMusicBlockers.filter((b) => b.slug === slug);
    const heroUsage = slugUsages.find((u) => u.category === "couple" && u.role === "hero");

    if (!heroUsage) {
      throw new Error(`Invariant violated: slug '${slug}' has no hero usage!`);
    }

    slugSummaries[slug] = {
      physicalAssets: slugPhysical.length,
      logicalUsages: slugUsages.length,
      unresolvedMusic: slugMusicBlocker.length,
      heroTargetPublicId: heroUsage.targetPublicId,
    };
  }

  const manifest: MediaManifest = {
    slugs: [...APPROVED_INVITATION_SLUGS],
    physicalAssets,
    logicalUsages,
    unresolvedMusicBlockers,
    summary: {
      totalSlugs: APPROVED_INVITATION_SLUGS.length,
      totalPhysicalAssets: physicalAssets.length,
      totalLogicalUsages: logicalUsages.length,
      totalLocalAssets: physicalAssets.filter((a) => a.sourceType === "local").length,
      totalRemoteAssets: physicalAssets.filter((a) => a.sourceType === "remote").length,
      totalImages: physicalAssets.filter((a) => a.category === "couple" || a.category === "gallery")
        .length,
      totalAudio: physicalAssets.filter((a) => a.category === "audio").length,
      totalVideo: physicalAssets.filter((a) => a.category === "video").length,
      unresolvedExternalMusicCount: unresolvedMusicBlockers.length,
      collisionsDetected: 0,
      missingLocalFilesCount: 0,
      slugBreakdown: slugSummaries,
    },
  };

  return manifest;
}

/**
 * Creates the canonical dry-run report structure with Stage 5B proposed effects.
 * Canonical report is 100% deterministic and byte-for-byte stable across runs.
 */
export function buildDryRunReport(
  manifest: MediaManifest,
  targetCloudName: string = "configured-new-cloud"
): DryRunReport {
  const proposedEffects: Stage5BProposedEffects = {
    targetCloudName,
    localUploadsCount: manifest.summary.totalLocalAssets,
    remoteUploadsCount: manifest.summary.totalRemoteAssets,
    totalUploads: manifest.summary.totalPhysicalAssets,
    databaseMutations: 0,
    fileDeletions: 0,
    details: [
      `Upload ${manifest.summary.totalLocalAssets} local files from public/images/ to Cloudinary account '${targetCloudName}'.`,
      `Re-upload ${manifest.summary.totalRemoteAssets} remote assets from old Cloudinary (${OLD_CLOUDINARY_HOST}${OLD_CLOUDINARY_ACCOUNT_PATH_PREFIX}) to Cloudinary account '${targetCloudName}'.`,
      `Zero database mutations in Stage 5B (invitation seed is deferred to Stage 6).`,
      `Zero file deletions in Stage 5B (local source files preserved until Stage 10 cleanup).`,
      `Keep ${manifest.summary.unresolvedExternalMusicCount} unresolved YouTube music URLs untouched until replacement audio files are provided.`,
    ],
  };

  return {
    mode: "dry-run",
    manifest,
    stage5BProposedEffects: proposedEffects,
  };
}

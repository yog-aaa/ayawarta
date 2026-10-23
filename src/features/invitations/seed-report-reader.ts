import "server-only";

import fs from "node:fs";
import path from "node:path";
import {
  cloudinaryUploadReportSchema,
  type ValidatedCloudinaryUploadReport,
} from "@/features/media/schema";
import {
  APPROVED_INVITATION_SLUGS,
  validateInvitationPublicId,
} from "@/features/media/public-id";
import { generateMediaManifest } from "../../../scripts/data/invitation-media-manifest";
import type { AudioResolver } from "@/features/media/audio-resolution";
import type { ImageResolver } from "@/features/media/image-resolution";
import {
  OLD_CLOUDINARY_CLOUD_NAME,
  validateCloudinaryDeliveryUrl,
  validateCloudinaryAssetBinding,
} from "@/features/media/cloudinary-uploader";
import type { PhysicalAsset } from "@/features/media/types";

export const DEFAULT_CLOUDINARY_UPLOAD_REPORT_PATH =
  ".media-migration/cloudinary-upload-report.json";
export const APPROVED_TARGET_CLOUD_NAME = "uhwi7xvb";

export class SeedReportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeedReportError";
  }
}

/**
 * Checks format equivalence between report and canonical manifest (SEED-09).
 * Normalizes 'jpg' and 'jpeg' as accepted by project contract; all other formats must match strictly.
 */
export function isFormatEquivalent(
  formatA: string | null | undefined,
  formatB: string | null | undefined
): boolean {
  if (!formatA || !formatB) return false;
  const a = formatA.trim().toLowerCase();
  const b = formatB.trim().toLowerCase();
  if (a === b) return true;
  if ((a === "jpg" || a === "jpeg") && (b === "jpg" || b === "jpeg")) {
    return true;
  }
  return false;
}

export interface ReconcileReportOptions {
  repoRoot?: string;
  targetCloudName?: string;
  audioResolver?: AudioResolver;
  imageResolver?: ImageResolver;
}

export interface ReadReportOptions extends ReconcileReportOptions {
  reportPath?: string;
}

/**
 * Validates and reconciles an upload report against the canonical Stage 5B manifest (SEED-03).
 * Enforces:
 * 1. Approved target cloud (strictly uhwi7xvb, never old account doig3gwek).
 * 2. Exactly 31 unique physical assets matching canonical manifest public IDs 1:1.
 * 3. Matching slug, category, sourceType, sourceLocation, and resourceType.
 * 4. Successful upload/existing_verified status (no failed status allowed).
 * 5. Strict delivery URL checks (HTTPS, res.cloudinary.com, no userinfo/port/query/fragment).
 * 6. Positive byte counts (never 0 or null).
 * 7. Non-empty format strings.
 * 8. Valid positive image dimensions (width > 0, height > 0) for images.
 * 9. Exactly 4 heroes and 4 audio assets mapped to approved slugs.
 * 10. Recomputed summary counters match actual asset records (no forged claims).
 */
export function reconcileUploadReport(
  report: ValidatedCloudinaryUploadReport,
  options?: ReconcileReportOptions
): ValidatedCloudinaryUploadReport {
  const repoRoot = options?.repoRoot ?? process.cwd();
  const expectedCloud =
    options?.targetCloudName ??
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ??
    APPROVED_TARGET_CLOUD_NAME;

  // 1. Cloud Name Validation
  if (!report.targetCloudName || report.targetCloudName.trim() === "") {
    throw new SeedReportError("Upload report missing targetCloudName.");
  }
  if (report.targetCloudName === OLD_CLOUDINARY_CLOUD_NAME) {
    throw new SeedReportError(
      `Disallowed target cloud '${report.targetCloudName}'. Cannot seed from old Cloudinary account.`
    );
  }
  if (report.targetCloudName !== expectedCloud) {
    throw new SeedReportError(
      `Upload report target cloud '${report.targetCloudName}' does not match expected target '${expectedCloud}'.`
    );
  }

  // 2. Canonical Manifest Reconciliation
  const canonicalManifest = generateMediaManifest({
    repoRoot,
    audioResolver: options?.audioResolver,
    imageResolver: options?.imageResolver,
  });

  if (canonicalManifest.physicalAssets.length !== 31) {
    throw new SeedReportError(
      `Canonical manifest contains ${canonicalManifest.physicalAssets.length} physical assets; expected exactly 31.`
    );
  }

  if (report.assets.length !== 31) {
    throw new SeedReportError(
      `Upload report contains ${report.assets.length} assets; expected exactly 31.`
    );
  }

  const canonicalMap = new Map<string, PhysicalAsset>();
  for (const asset of canonicalManifest.physicalAssets) {
    canonicalMap.set(asset.targetPublicId, asset);
  }

  // 3. Set Equality and Uniqueness of 31 Public IDs
  const reportPublicIds = new Set<string>();
  for (const asset of report.assets) {
    if (reportPublicIds.has(asset.targetPublicId)) {
      throw new SeedReportError(
        `Duplicate public ID found in upload report: '${asset.targetPublicId}'.`
      );
    }
    reportPublicIds.add(asset.targetPublicId);
  }

  for (const pubId of reportPublicIds) {
    if (!canonicalMap.has(pubId)) {
      throw new SeedReportError(
        `Unrecognized or extra public ID in upload report: '${pubId}'.`
      );
    }
  }

  for (const pubId of canonicalMap.keys()) {
    if (!reportPublicIds.has(pubId)) {
      throw new SeedReportError(
        `Missing canonical public ID in upload report: '${pubId}'.`
      );
    }
  }

  // 4. Per-Asset Deep Validation
  let heroesCount = 0;
  let audiosCount = 0;
  let uploadedCount = 0;
  let existingVerifiedCount = 0;

  for (const asset of report.assets) {
    const canonical = canonicalMap.get(asset.targetPublicId)!;

    // Public ID format check
    const pidVal = validateInvitationPublicId(asset.targetPublicId);
    if (!pidVal.valid) {
      throw new SeedReportError(
        `Invalid public ID format '${asset.targetPublicId}': ${pidVal.reason}`
      );
    }

    // Match metadata with canonical manifest
    if (asset.slug !== canonical.slug) {
      throw new SeedReportError(
        `Slug mismatch for asset '${asset.targetPublicId}': report='${asset.slug}', canonical='${canonical.slug}'.`
      );
    }
    if (asset.category !== canonical.category) {
      throw new SeedReportError(
        `Category mismatch for asset '${asset.targetPublicId}': report='${asset.category}', canonical='${canonical.category}'.`
      );
    }
    if (asset.sourceType !== canonical.sourceType) {
      throw new SeedReportError(
        `SourceType mismatch for asset '${asset.targetPublicId}': report='${asset.sourceType}', canonical='${canonical.sourceType}'.`
      );
    }
    if (asset.sourceLocation !== canonical.sourceLocation) {
      throw new SeedReportError(
        `SourceLocation mismatch for asset '${asset.targetPublicId}': report='${asset.sourceLocation}', canonical='${canonical.sourceLocation}'.`
      );
    }
    if (asset.resourceType !== canonical.cloudinaryResourceType) {
      throw new SeedReportError(
        `ResourceType mismatch for asset '${asset.targetPublicId}': report='${asset.resourceType}', canonical='${canonical.cloudinaryResourceType}'.`
      );
    }

    // Status check (no failures allowed)
    if (asset.status === "failed") {
      throw new SeedReportError(
        `Asset '${asset.targetPublicId}' has failed status: ${asset.error ?? "unknown error"}.`
      );
    }
    if (asset.status !== "uploaded" && asset.status !== "existing_verified") {
      throw new SeedReportError(
        `Asset '${asset.targetPublicId}' has invalid status '${asset.status}'.`
      );
    }
    if (asset.status === "uploaded") uploadedCount++;
    if (asset.status === "existing_verified") existingVerifiedCount++;

    // Format Reconciliation against Canonical Manifest (SEED-09)
    if (
      !asset.format ||
      typeof asset.format !== "string" ||
      asset.format.trim() === ""
    ) {
      throw new SeedReportError(
        `Asset '${asset.targetPublicId}' is missing format string.`
      );
    }
    if (!isFormatEquivalent(asset.format, canonical.format)) {
      throw new SeedReportError(
        `Format mismatch for asset '${asset.targetPublicId}': report format='${asset.format}', canonical format='${canonical.format}'.`
      );
    }

    // Strict Delivery URL Check
    if (!asset.secureUrl || typeof asset.secureUrl !== "string") {
      throw new SeedReportError(
        `Asset '${asset.targetPublicId}' is missing secureUrl.`
      );
    }
    const urlVal = validateCloudinaryDeliveryUrl(
      asset.secureUrl,
      report.targetCloudName
    );
    if (!urlVal.valid) {
      throw new SeedReportError(
        `Invalid secureUrl for asset '${asset.targetPublicId}': ${urlVal.reason}`
      );
    }

    // Strict Cloudinary Delivery URL to Canonical Public ID Binding (SEED-07, SEED-09)
    // Pass canonical.format (NOT untrusted asset.format) as expectedFormat!
    const urlBindingVal = validateCloudinaryAssetBinding({
      secureUrl: asset.secureUrl,
      expectedCloudName: report.targetCloudName,
      expectedResourceType: canonical.cloudinaryResourceType,
      expectedPublicId: canonical.targetPublicId,
      expectedFormat: canonical.format,
    });
    if (!urlBindingVal.valid) {
      throw new SeedReportError(
        `Invalid secureUrl binding for asset '${asset.targetPublicId}': ${urlBindingVal.reason}`
      );
    }

    // Positive Byte Count Check (never 0 or null)
    if (
      typeof asset.bytes !== "number" ||
      !Number.isFinite(asset.bytes) ||
      asset.bytes <= 0
    ) {
      throw new SeedReportError(
        `Asset '${asset.targetPublicId}' has non-positive byte size: ${asset.bytes}.`
      );
    }

    // Resource-specific validations
    if (asset.resourceType === "image") {
      if (
        typeof asset.width !== "number" ||
        asset.width <= 0 ||
        typeof asset.height !== "number" ||
        asset.height <= 0
      ) {
        throw new SeedReportError(
          `Image asset '${asset.targetPublicId}' has invalid dimensions: ${asset.width}x${asset.height}.`
        );
      }
    }

    // Hero and Audio tracking
    if (asset.targetPublicId.endsWith("/couple/hero")) {
      heroesCount++;
    }
    if (asset.targetPublicId.endsWith("/audio/background-music")) {
      audiosCount++;
    }
  }

  // 5. Invariant Counts Checks
  if (heroesCount !== 4) {
    throw new SeedReportError(
      `Expected exactly 4 verified heroes in report, found ${heroesCount}.`
    );
  }
  if (audiosCount !== 4) {
    throw new SeedReportError(
      `Expected exactly 4 verified audio assets in report, found ${audiosCount}.`
    );
  }

  for (const slug of APPROVED_INVITATION_SLUGS) {
    const hasHero = report.assets.some(
      (a) => a.slug === slug && a.targetPublicId.endsWith("/couple/hero")
    );
    if (!hasHero) {
      throw new SeedReportError(`Missing hero asset for approved slug '${slug}'.`);
    }
    const hasAudio = report.assets.some(
      (a) =>
        a.slug === slug && a.targetPublicId.endsWith("/audio/background-music")
    );
    if (!hasAudio) {
      throw new SeedReportError(`Missing audio asset for approved slug '${slug}'.`);
    }
  }

  // 6. Summary Reconciliation (protects against forged summary fields)
  if (report.summary.totalPhysicalAssets !== 31) {
    throw new SeedReportError(
      `Summary claims totalPhysicalAssets=${report.summary.totalPhysicalAssets}, expected 31.`
    );
  }
  if (report.summary.failedCount !== 0) {
    throw new SeedReportError(
      `Summary claims failedCount=${report.summary.failedCount}, expected 0.`
    );
  }
  if (report.summary.heroesVerifiedCount !== 4) {
    throw new SeedReportError(
      `Summary claims heroesVerifiedCount=${report.summary.heroesVerifiedCount}, expected 4.`
    );
  }
  if (report.summary.audiosVerifiedCount !== 4) {
    throw new SeedReportError(
      `Summary claims audiosVerifiedCount=${report.summary.audiosVerifiedCount}, expected 4.`
    );
  }
  if (report.summary.uploadedCount !== uploadedCount) {
    throw new SeedReportError(
      `Summary claims uploadedCount=${report.summary.uploadedCount}, actual asset records have ${uploadedCount}.`
    );
  }
  if (report.summary.existingVerifiedCount !== existingVerifiedCount) {
    throw new SeedReportError(
      `Summary claims existingVerifiedCount=${report.summary.existingVerifiedCount}, actual asset records have ${existingVerifiedCount}.`
    );
  }

  return report;
}

/**
 * Safely reads the Cloudinary upload report from disk, parses it as untrusted input,
 * checks for credential leaks, validates schema, and reconciles against canonical manifest.
 */
export function readValidatedUploadReport(
  customPath?: string,
  options?: ReconcileReportOptions
): ValidatedCloudinaryUploadReport {
  const repoRoot = options?.repoRoot ?? process.cwd();
  const relativePath = customPath ?? DEFAULT_CLOUDINARY_UPLOAD_REPORT_PATH;
  const fullPath = path.isAbsolute(relativePath)
    ? relativePath
    : path.resolve(repoRoot, relativePath);

  if (!fs.existsSync(fullPath)) {
    throw new SeedReportError(
      `Cloudinary upload report not found at '${relativePath}'. Ensure Stage 5B has been completed.`
    );
  }

  let rawContent: string;
  try {
    rawContent = fs.readFileSync(fullPath, "utf-8");
  } catch {
    throw new SeedReportError(
      `Failed to read Cloudinary upload report at '${relativePath}'.`
    );
  }

  // Secret keyword scan
  const SECRET_KEYWORDS = [
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "AUTH_SECRET",
    "ADMIN_PASSWORD",
    "DATABASE_URL",
  ];
  for (const kw of SECRET_KEYWORDS) {
    if (rawContent.includes(kw)) {
      throw new SeedReportError(
        `Secret keyword '${kw}' detected in upload report payload.`
      );
    }
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawContent);
  } catch {
    throw new SeedReportError(
      "Cloudinary upload report contains malformed JSON."
    );
  }

  const result = cloudinaryUploadReportSchema.safeParse(parsedJson);
  if (!result.success) {
    const issueSummary = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .slice(0, 5)
      .join("; ");
    throw new SeedReportError(
      `Cloudinary upload report schema validation failed: ${issueSummary}`
    );
  }

  return reconcileUploadReport(result.data, {
    ...options,
    repoRoot,
  });
}

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { cloudinaryUploadReportSchema } from "@/features/media/schema";
import {
  OLD_CLOUDINARY_CLOUD_NAME,
  validateCloudinaryDeliveryUrl,
} from "@/features/media/cloudinary-uploader";
import { validateInvitationPublicId } from "@/features/media/public-id";
import type {
  CloudinaryUploadReport,
  InvitationSlug,
} from "@/features/media/types";

export interface VerifyUploadReportOptions {
  reportPath?: string;
  repoRoot?: string;
  expectedCloudName?: string;
  logger?: Pick<Console, "log" | "warn" | "error">;
}

export interface VerifyUploadReportResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  verifiedAssetsCount: number;
  uploadedCount: number;
  existingVerifiedCount: number;
  heroesVerifiedCount: number;
  audiosVerifiedCount: number;
  targetCloudName: string;
}

export const DEFAULT_UPLOAD_REPORT_PATH = path.join(
  ".media-migration",
  "cloudinary-upload-report.json"
);

export function verifyCloudinaryUploadReport(
  options?: VerifyUploadReportOptions
): VerifyUploadReportResult {
  const repoRoot = options?.repoRoot ?? process.cwd();
  const reportPath =
    options?.reportPath ?? path.resolve(repoRoot, DEFAULT_UPLOAD_REPORT_PATH);

  const errors: string[] = [];
  const warnings: string[] = [];

  const emptyResult = (errs: string[]): VerifyUploadReportResult => ({
    passed: false,
    errors: errs,
    warnings: [],
    verifiedAssetsCount: 0,
    uploadedCount: 0,
    existingVerifiedCount: 0,
    heroesVerifiedCount: 0,
    audiosVerifiedCount: 0,
    targetCloudName: "",
  });

  if (!fs.existsSync(reportPath)) {
    return emptyResult([
      `Upload report not found at: ${reportPath}. Run 'pnpm media:migrate --execute' first to perform migration.`,
    ]);
  }

  let rawJson: unknown;
  try {
    const raw = fs.readFileSync(reportPath, "utf-8");

    // Secret keyword scan
    const secretKeywords = [
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_SECRET",
      "AUTH_SECRET",
      "ADMIN_PASSWORD",
      "DATABASE_URL",
      "Basic ",
      "Bearer ",
    ];
    for (const kw of secretKeywords) {
      if (raw.includes(kw)) {
        errors.push(`Secret keyword or authorization token '${kw}' detected in upload report!`);
      }
    }

    rawJson = JSON.parse(raw);
  } catch (err) {
    return emptyResult([`Failed to parse upload report JSON: ${(err as Error).message}`]);
  }

  // Schema validation
  const parsed = cloudinaryUploadReportSchema.safeParse(rawJson);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`Report schema violation at '${issue.path.join(".")}': ${issue.message}`);
    }
    return emptyResult(errors);
  }

  const report: CloudinaryUploadReport = parsed.data as CloudinaryUploadReport;

  // Cloud name checks
  if (
    report.targetCloudName.toLowerCase() ===
    OLD_CLOUDINARY_CLOUD_NAME.toLowerCase()
  ) {
    errors.push(
      `Target cloud name in report is old account '${OLD_CLOUDINARY_CLOUD_NAME}'! Must use new account.`
    );
  }

  if (
    options?.expectedCloudName &&
    report.targetCloudName !== options.expectedCloudName
  ) {
    errors.push(
      `Target cloud name mismatch: expected '${options.expectedCloudName}', got '${report.targetCloudName}'`
    );
  }

  // Recompute summary from actual assets array
  const totalAssets = report.assets.length;
  if (totalAssets !== 31) {
    errors.push(
      `Expected exactly 31 physical assets in upload report, found ${totalAssets}`
    );
  }

  const publicIdSet = new Set<string>();
  let computedUploaded = 0;
  let computedExisting = 0;
  let computedFailed = 0;
  let computedImages = 0;
  let computedAudio = 0;
  let computedVideo = 0;

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

  const assetMap = new Map<string, (typeof report.assets)[0]>();

  for (let i = 0; i < report.assets.length; i++) {
    const asset = report.assets[i];

    // Duplicate targetPublicId check
    if (publicIdSet.has(asset.targetPublicId)) {
      errors.push(`Duplicate targetPublicId detected: '${asset.targetPublicId}' at index ${i}`);
    }
    publicIdSet.add(asset.targetPublicId);
    assetMap.set(asset.targetPublicId, asset);

    // Validate public ID format
    const pidValidation = validateInvitationPublicId(asset.targetPublicId);
    if (!pidValidation.valid) {
      errors.push(
        `Invalid targetPublicId format '${asset.targetPublicId}' at index ${i}: ${pidValidation.reason}`
      );
    }

    // Status counts
    if (asset.status === "uploaded") computedUploaded++;
    else if (asset.status === "existing_verified") computedExisting++;
    else if (asset.status === "failed") {
      computedFailed++;
      errors.push(`Asset '${asset.targetPublicId}' has status 'failed': ${asset.error}`);
    }

    // Resource type
    if (asset.category === "audio") {
      computedAudio++;
      if (asset.resourceType !== "video") {
        errors.push(
          `Audio asset '${asset.targetPublicId}' must have Cloudinary resource_type 'video', got '${asset.resourceType}'`
        );
      }
    } else if (asset.category === "couple" || asset.category === "gallery") {
      computedImages++;
      if (asset.resourceType !== "image") {
        errors.push(
          `Image asset '${asset.targetPublicId}' must have Cloudinary resource_type 'image', got '${asset.resourceType}'`
        );
      }
    } else if (asset.category === "video") {
      computedVideo++;
    }

    // Non-failed asset checks
    if (asset.status !== "failed") {
      if (!asset.secureUrl) {
        errors.push(`Asset '${asset.targetPublicId}' is missing secureUrl`);
      } else {
        const urlValidation = validateCloudinaryDeliveryUrl(
          asset.secureUrl,
          report.targetCloudName
        );
        if (!urlValidation.valid) {
          errors.push(
            `Asset '${asset.targetPublicId}' has invalid secureUrl: ${urlValidation.reason}`
          );
        }
      }

      if (!asset.bytes || asset.bytes <= 0) {
        errors.push(
          `Asset '${asset.targetPublicId}' has invalid bytes: ${asset.bytes}`
        );
      }

      if (!asset.format || asset.format.trim().length === 0) {
        errors.push(
          `Asset '${asset.targetPublicId}' has missing format extension`
        );
      }
    }
  }

  // Verify explicit heroes (4/4)
  let heroesVerifiedCount = 0;
  for (const [slug, heroId] of Object.entries(expectedHeroPublicIds)) {
    const heroAsset = assetMap.get(heroId);
    if (!heroAsset || heroAsset.status === "failed") {
      errors.push(`Required hero asset for slug '${slug}' (${heroId}) is missing or failed!`);
    } else {
      heroesVerifiedCount++;
    }
  }

  // Verify explicit audios (4/4)
  let audiosVerifiedCount = 0;
  for (const [slug, audioId] of Object.entries(expectedAudioPublicIds)) {
    const audioAsset = assetMap.get(audioId);
    if (!audioAsset || audioAsset.status === "failed") {
      errors.push(`Required audio asset for slug '${slug}' (${audioId}) is missing or failed!`);
    } else {
      audiosVerifiedCount++;
    }
  }

  // Check report summary claims against actual recomputations
  if (report.summary.uploadedCount !== computedUploaded) {
    errors.push(
      `Summary uploadedCount mismatch: claims ${report.summary.uploadedCount}, recomputed ${computedUploaded}`
    );
  }
  if (report.summary.existingVerifiedCount !== computedExisting) {
    errors.push(
      `Summary existingVerifiedCount mismatch: claims ${report.summary.existingVerifiedCount}, recomputed ${computedExisting}`
    );
  }
  if (report.summary.failedCount !== computedFailed) {
    errors.push(
      `Summary failedCount mismatch: claims ${report.summary.failedCount}, recomputed ${computedFailed}`
    );
  }
  if (report.summary.imagesCount !== computedImages) {
    errors.push(
      `Summary imagesCount mismatch: claims ${report.summary.imagesCount}, recomputed ${computedImages}`
    );
  }
  if (report.summary.audioCount !== computedAudio) {
    errors.push(
      `Summary audioCount mismatch: claims ${report.summary.audioCount}, recomputed ${computedAudio}`
    );
  }
  if (report.summary.videoCount !== computedVideo) {
    errors.push(
      `Summary videoCount mismatch: claims ${report.summary.videoCount}, recomputed ${computedVideo}`
    );
  }
  if (report.summary.heroesVerifiedCount !== heroesVerifiedCount) {
    errors.push(
      `Summary heroesVerifiedCount mismatch: claims ${report.summary.heroesVerifiedCount}, recomputed ${heroesVerifiedCount}`
    );
  }
  if (report.summary.audiosVerifiedCount !== audiosVerifiedCount) {
    errors.push(
      `Summary audiosVerifiedCount mismatch: claims ${report.summary.audiosVerifiedCount}, recomputed ${audiosVerifiedCount}`
    );
  }

  // External effects invariants
  if (report.externalEffects.targetCloudName !== report.targetCloudName) {
    errors.push(
      `externalEffects targetCloudName '${report.externalEffects.targetCloudName}' mismatch with report targetCloudName '${report.targetCloudName}'`
    );
  }
  if (report.externalEffects.uploadsPerformed !== computedUploaded) {
    errors.push(
      `externalEffects uploadsPerformed mismatch: claims ${report.externalEffects.uploadsPerformed}, actual uploaded assets count is ${computedUploaded}`
    );
  }
  if (report.externalEffects.databaseMutations !== 0) {
    errors.push(
      `Database mutations must be 0 in Stage 5B, got ${report.externalEffects.databaseMutations}`
    );
  }
  if (report.externalEffects.fileDeletions !== 0) {
    errors.push(
      `File deletions must be 0 in Stage 5B, got ${report.externalEffects.fileDeletions}`
    );
  }

  // Details string consistency (CLOUD-04)
  for (const detail of report.externalEffects.details) {
    const heroMatch = detail.match(/Verified (\d+)\/4 explicit heroes/i);
    if (heroMatch) {
      const claimedHeroes = parseInt(heroMatch[1], 10);
      if (claimedHeroes !== heroesVerifiedCount) {
        errors.push(
          `externalEffects.details claims '${claimedHeroes}/4 explicit heroes', but recomputed heroesVerifiedCount is ${heroesVerifiedCount}`
        );
      }
    }

    const audioMatch = detail.match(/(\d+)\/4 audio assets/i);
    if (audioMatch) {
      const claimedAudios = parseInt(audioMatch[1], 10);
      if (claimedAudios !== audiosVerifiedCount) {
        errors.push(
          `externalEffects.details claims '${claimedAudios}/4 audio assets', but recomputed audiosVerifiedCount is ${audiosVerifiedCount}`
        );
      }
    }

    const uploadMatch = detail.match(
      /Uploaded (\d+) new asset\(s\) and verified (\d+) existing asset\(s\)/i
    );
    if (uploadMatch) {
      const claimedUploads = parseInt(uploadMatch[1], 10);
      const claimedExisting = parseInt(uploadMatch[2], 10);
      if (claimedUploads !== computedUploaded) {
        errors.push(
          `externalEffects.details claims '${claimedUploads}' uploaded, but recomputed uploadedCount is ${computedUploaded}`
        );
      }
      if (claimedExisting !== computedExisting) {
        errors.push(
          `externalEffects.details claims '${claimedExisting}' existing verified, but recomputed existingVerifiedCount is ${computedExisting}`
        );
      }
    }
  }

  const passed = errors.length === 0 && computedFailed === 0 && totalAssets === 31;

  return {
    passed,
    errors,
    warnings,
    verifiedAssetsCount: totalAssets,
    uploadedCount: computedUploaded,
    existingVerifiedCount: computedExisting,
    heroesVerifiedCount,
    audiosVerifiedCount,
    targetCloudName: report.targetCloudName,
  };
}

export function runVerifyUploadCli(): number {
  console.log("\n=======================================================");
  console.log("  AyaWarta Stage 5B: Cloudinary Upload Verification");
  console.log("=======================================================\n");

  const repoRoot = process.cwd();
  const result = verifyCloudinaryUploadReport({ repoRoot });

  if (!result.passed) {
    console.error("[FAIL] Cloudinary upload report verification failed!\n");
    for (const err of result.errors) {
      console.error(`  ✕ ${err}`);
    }
    return 1;
  }

  console.log("[PASS] Cloudinary upload report verified successfully!");
  console.log(`  • Target Cloud Name:   ${result.targetCloudName}`);
  console.log(`  • Total Assets:        ${result.verifiedAssetsCount} / 31`);
  console.log(`  • Uploaded:            ${result.uploadedCount}`);
  console.log(`  • Existing Verified:   ${result.existingVerifiedCount}`);
  console.log(`  • Heroes Verified:     ${result.heroesVerifiedCount} / 4`);
  console.log(`  • Audio Verified:      ${result.audiosVerifiedCount} / 4`);
  console.log(`  • Failures:            0`);
  console.log(`  • Credential Leaks:    0`);
  console.log(`  • Database Mutations:  0 (Prisma seed deferred to Stage 6)`);
  console.log(`  • Local File Deletions: 0 (Cleanup deferred to Stage 10)\n`);

  return 0;
}

// CLI entrypoint
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const code = runVerifyUploadCli();
  process.exitCode = code;
}

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import {
  buildDryRunReport,
  generateMediaManifest,
} from "./data/invitation-media-manifest";
import type { AudioResolver } from "@/features/media/audio-resolution";
import {
  ensureDerivedHeroImage,
  type ImageResolver,
} from "@/features/media/image-resolution";
import {
  executeCloudinaryMigration,
  type ICloudinaryClient,
  OLD_CLOUDINARY_CLOUD_NAME,
  RealCloudinaryClient,
} from "@/features/media/cloudinary-uploader";

export interface CliOptions {
  dryRun?: boolean;
  execute?: boolean;
  outputDir?: string;
  repoRoot?: string;
  cloudName?: string;
  apiKey?: string;
  apiSecret?: string;
  cloudinaryClient?: ICloudinaryClient;
  audioResolver?: AudioResolver;
  imageResolver?: ImageResolver;
  logger?: Pick<Console, "log" | "warn" | "error">;
}

export const DEFAULT_REPORT_DIR = ".media-migration";
export const DEFAULT_REPORT_FILENAME = "manifest-dry-run-report.json";
export const DEFAULT_UPLOAD_REPORT_FILENAME = "cloudinary-upload-report.json";

export async function runMigrationCli(
  args: string[],
  overrides?: Partial<CliOptions>
): Promise<number> {
  const logger = overrides?.logger ?? console;
  const repoRoot = overrides?.repoRoot ?? process.cwd();

  // Load .env.local if not already loaded
  if (fs.existsSync(path.resolve(repoRoot, ".env.local"))) {
    dotenv.config({ path: path.resolve(repoRoot, ".env.local") });
  }

  // Parse arguments
  const hasHelp = args.includes("--help") || args.includes("-h");
  if (hasHelp) {
    logger.log(`AyaWarta Media Migration CLI

Usage:
  tsx scripts/migrate-invitation-media.ts [options]

Options:
  --dry-run       Plan and validate manifest without performing any network or upload operations (DEFAULT).
  --execute       Execute live Cloudinary migration to the new account.
  --output-dir    Directory to save migration reports (must stay within .media-migration).
  --help, -h      Show this help message.
`);
    return 0;
  }

  const isExplicitExecute =
    overrides?.execute ?? (args.includes("--execute") || args.includes("--live"));

  // MEDIA-04: Confine CLI output to .media-migration directory
  let outputDir: string;
  if (overrides?.outputDir) {
    // Dependency injection permitted for hermetic unit tests
    outputDir = overrides.outputDir;
  } else {
    const dirArgIdx = args.indexOf("--output-dir");
    if (dirArgIdx !== -1) {
      const userArg = args[dirArgIdx + 1];
      if (!userArg || userArg.trim().length === 0) {
        logger.error("[ERROR] Missing value for --output-dir");
        return 1;
      }

      if (
        userArg.includes("\0") ||
        userArg.includes("..") ||
        userArg.includes("\\") ||
        path.isAbsolute(userArg) ||
        /^[a-zA-Z]:/.test(userArg)
      ) {
        logger.error(
          `[ERROR] CLI report output directory must be relative and cannot contain traversal/absolute paths. Got: '${userArg}'`
        );
        return 1;
      }

      const approvedReportRoot = path.resolve(repoRoot, DEFAULT_REPORT_DIR);
      const candidateDir = path.resolve(repoRoot, userArg);
      const rel = path.relative(approvedReportRoot, candidateDir);

      if (rel.startsWith("..") || path.isAbsolute(rel)) {
        logger.error(
          `[ERROR] CLI report output directory must be confined to '${DEFAULT_REPORT_DIR}'. Got: '${userArg}'`
        );
        return 1;
      }

      outputDir = userArg;
    } else {
      outputDir = DEFAULT_REPORT_DIR;
    }
  }

  const resolvedOutputDir = path.resolve(repoRoot, outputDir);
  if (!fs.existsSync(resolvedOutputDir)) {
    fs.mkdirSync(resolvedOutputDir, { recursive: true });
  }

  // CLOUD-05: Connect derived-image preparation to CLI before manifest generation
  if (!overrides?.imageResolver) {
    try {
      await ensureDerivedHeroImage({ repoRoot, logger });
    } catch (err) {
      logger.error(
        `[FATAL] Failed to ensure derived hero image: ${(err as Error).message}`
      );
      return 1;
    }
  }

  // =========================================================================
  // STAGE 5B: LIVE CLOUDINARY UPLOAD EXECUTION (--execute)
  // =========================================================================
  if (isExplicitExecute) {
    logger.log("\n=======================================================");
    logger.log("  AyaWarta Stage 5B: Live Cloudinary Upload Execution");
    logger.log("=======================================================\n");

    const cloudName =
      overrides?.cloudName ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = overrides?.apiKey ?? process.env.CLOUDINARY_API_KEY;
    const apiSecret = overrides?.apiSecret ?? process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || cloudName.trim().length === 0) {
      logger.error("[ERROR] NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME environment variable is not set.");
      return 1;
    }

    if (cloudName.toLowerCase() === OLD_CLOUDINARY_CLOUD_NAME.toLowerCase()) {
      logger.error(
        `[SECURITY GUARD] Target cloud name cannot be old account '${OLD_CLOUDINARY_CLOUD_NAME}'.`
      );
      return 1;
    }

    let client: ICloudinaryClient;
    if (overrides?.cloudinaryClient) {
      client = overrides.cloudinaryClient;
    } else {
      if (!apiKey || !apiSecret) {
        logger.error(
          "[ERROR] CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET must be configured for live upload execution."
        );
        return 1;
      }
      try {
        client = new RealCloudinaryClient({ cloudName, apiKey, apiSecret });
      } catch (err) {
        logger.error(`[ERROR] Failed to initialize Cloudinary client: ${(err as Error).message}`);
        return 1;
      }
    }

    logger.log("[1/4] Generating canonical media manifest...");
    const manifest = generateMediaManifest({
      repoRoot,
      audioResolver: overrides?.audioResolver,
      imageResolver: overrides?.imageResolver,
    });

    logger.log("[2/4] Executing idempotent migration and conflict preflight...");
    let result;
    try {
      result = await executeCloudinaryMigration({
        manifest,
        client,
        cloudName,
        repoRoot,
        logger,
      });
    } catch (err) {
      logger.error(`[FATAL] Cloudinary migration halted: ${(err as Error).message}`);
      return 1;
    }

    logger.log("\n[3/4] Writing live upload report...");
    const uploadReportPath = path.join(resolvedOutputDir, DEFAULT_UPLOAD_REPORT_FILENAME);
    fs.writeFileSync(
      uploadReportPath,
      JSON.stringify(result.report, null, 2),
      "utf-8"
    );
    logger.log(`  Upload report written to: ${uploadReportPath}`);

    logger.log("\n[4/4] Summary of Migration Results:");
    logger.log(`  • Target Cloud Name:   ${result.report.targetCloudName}`);
    logger.log(`  • Total Physical:      ${result.report.summary.totalPhysicalAssets} / 31`);
    logger.log(`  • Uploaded:            ${result.report.summary.uploadedCount}`);
    logger.log(`  • Existing Verified:   ${result.report.summary.existingVerifiedCount}`);
    logger.log(`  • Failed:              ${result.report.summary.failedCount}`);
    logger.log(`  • Heroes Verified:     ${result.report.summary.heroesVerifiedCount} / 4`);
    logger.log(`  • Audios Verified:     ${result.report.summary.audiosVerifiedCount} / 4`);

    if (!result.success) {
      logger.error(`\n[FAIL] Stage 5B migration did not fully succeed: ${result.error}`);
      return 1;
    }

    logger.log("\n[SUCCESS] Stage 5B Cloudinary upload and verification completed successfully!\n");
    return 0;
  }

  // =========================================================================
  // STAGE 5A / DEFAULT: DETERMINISTIC DRY-RUN
  // =========================================================================
  const cloudName =
    overrides?.cloudName ??
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ??
    "<configured-new-cloud>";

  logger.log("\n=======================================================");
  logger.log("  AyaWarta Media Migration: Deterministic Dry-Run");
  logger.log("=======================================================\n");

  if (!args.includes("--dry-run")) {
    logger.log("[NOTE] Running in safe dry-run mode (default). Pass '--execute' to perform live Cloudinary uploads.\n");
  }

  logger.log("[1/4] Generating typed manifest from repository data...");
  const manifest = generateMediaManifest({
    repoRoot,
    audioResolver: overrides?.audioResolver,
    imageResolver: overrides?.imageResolver,
  });

  logger.log("[2/4] Validating manifest invariants...");
  const { summary } = manifest;

  logger.log(`  • Slugs audited: ${summary.totalSlugs}`);
  logger.log(`  • Physical upload assets: ${summary.totalPhysicalAssets}`);
  logger.log(`  • Logical invitation usages: ${summary.totalLogicalUsages}`);
  logger.log(`  • Local physical assets: ${summary.totalLocalAssets}`);
  logger.log(`  • Remote physical assets: ${summary.totalRemoteAssets}`);
  logger.log(`  • Images: ${summary.totalImages}`);
  logger.log(`  • Audio: ${summary.totalAudio}`);
  logger.log(`  • Videos: ${summary.totalVideo}`);
  logger.log(`  • Unresolved YouTube music blockers: ${summary.unresolvedExternalMusicCount}`);
  logger.log(`  • Public ID collisions: ${summary.collisionsDetected}`);
  logger.log(`  • Missing local files: ${summary.missingLocalFilesCount}`);

  logger.log("\n[3/4] Per-Slug Summary:");
  for (const slug of manifest.slugs) {
    const s = summary.slugBreakdown[slug];
    logger.log(`  - ${slug}:`);
    logger.log(`      Physical Assets: ${s.physicalAssets}`);
    logger.log(`      Logical Usages:  ${s.logicalUsages}`);
    logger.log(`      Hero Public ID:  ${s.heroTargetPublicId}`);
    logger.log(`      Music Blockers:  ${s.unresolvedMusic}`);
  }

  if (manifest.unresolvedMusicBlockers.length > 0) {
    logger.log("\n[!] Unresolved External Music Blockers (Stage 5B Prerequisite):");
    for (const blocker of manifest.unresolvedMusicBlockers) {
      logger.log(`  - [${blocker.slug}] ${blocker.musicUrl}`);
      logger.log(`      Action Required: ${blocker.actionRequired}`);
    }
  }

  logger.log("\n[4/4] Writing dry-run report...");
  const report = buildDryRunReport(manifest, cloudName);

  const reportFilePath = path.join(resolvedOutputDir, DEFAULT_REPORT_FILENAME);
  fs.writeFileSync(reportFilePath, JSON.stringify(report, null, 2), "utf-8");

  logger.log(`\n Dry-run report written successfully to:`);
  logger.log(`  ${reportFilePath}`);
  logger.log(`\nStage 5B Proposed External Effects (when approved):`);
  for (const detail of report.stage5BProposedEffects.details) {
    logger.log(`  • ${detail}`);
  }

  logger.log(`\nCurrent Stage External Effects:`);
  logger.log(`  • Uploads performed: 0`);
  logger.log(`  • Remote downloads:  0`);
  logger.log(`  • Database writes:   0`);
  logger.log(`  • Local files deleted: 0`);
  logger.log(`  • Network requests:  0 (Fully offline)`);

  logger.log("\n[SUCCESS] Media dry-run completed successfully.\n");
  return 0;
}

// CLI execution entrypoint
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  runMigrationCli(process.argv.slice(2))
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((err) => {
      console.error("[FATAL] Media migration failed:", err.message);
      process.exitCode = 1;
    });
}

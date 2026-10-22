import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  buildDryRunReport,
  generateMediaManifest,
} from "./data/invitation-media-manifest";

export interface CliOptions {
  dryRun: boolean;
  outputDir: string;
  repoRoot: string;
  cloudName?: string;
  logger: Pick<Console, "log" | "warn" | "error">;
}

export const DEFAULT_REPORT_DIR = ".media-migration";
export const DEFAULT_REPORT_FILENAME = "manifest-dry-run-report.json";

export async function runMigrationCli(
  args: string[],
  overrides?: Partial<CliOptions>
): Promise<number> {
  const logger = overrides?.logger ?? console;
  const repoRoot = overrides?.repoRoot ?? process.cwd();

  // Parse arguments
  const hasHelp = args.includes("--help") || args.includes("-h");
  if (hasHelp) {
    logger.log(`AyaWarta Media Migration CLI

Usage:
  tsx scripts/migrate-invitation-media.ts [options]

Options:
  --dry-run       Plan and validate manifest without performing any network or upload operations (DEFAULT).
  --output-dir    Directory to save the dry-run report (must stay within .media-migration).
  --help, -h      Show this help message.
`);
    return 0;
  }

  // Explicit check for non-dry-run in Stage 5A
  const isExplicitDryRun = args.includes("--dry-run");
  const isExplicitExecute = args.includes("--execute") || args.includes("--live");

  // In Stage 5A: default is dry-run, but if explicit execute is requested, guard blocks it.
  if (isExplicitExecute || (!isExplicitDryRun && args.includes("--migrate"))) {
    logger.error(`
[STAGE 5A GUARD] Live Cloudinary upload execution is blocked in Stage 5A.
Stage 5A only authorizes typed manifest generation, dry-run planning, and offline contract verification.
Do not proceed with live uploads until Stage 5A has been reviewed and accepted by the owner.
`);
    return 1;
  }

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

  const cloudName =
    overrides?.cloudName ??
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ??
    "<configured-new-cloud>";

  logger.log("\n=======================================================");
  logger.log("  AyaWarta Media Migration: Deterministic Dry-Run");
  logger.log("=======================================================\n");

  logger.log("[1/4] Generating typed manifest from repository data...");
  const manifest = generateMediaManifest({ repoRoot });

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

  const resolvedOutputDir = path.resolve(repoRoot, outputDir);
  if (!fs.existsSync(resolvedOutputDir)) {
    fs.mkdirSync(resolvedOutputDir, { recursive: true });
  }

  const reportFilePath = path.join(resolvedOutputDir, DEFAULT_REPORT_FILENAME);
  fs.writeFileSync(reportFilePath, JSON.stringify(report, null, 2), "utf-8");

  logger.log(`\n Dry-run report written successfully to:`);
  logger.log(`  ${reportFilePath}`);
  logger.log(`\nStage 5B Proposed External Effects (when approved):`);
  for (const detail of report.stage5BProposedEffects.details) {
    logger.log(`  • ${detail}`);
  }

  logger.log(`\nCurrent Stage (Stage 5A) External Effects:`);
  logger.log(`  • Uploads performed: 0`);
  logger.log(`  • Remote downloads:  0`);
  logger.log(`  • Database writes:   0`);
  logger.log(`  • Local files deleted: 0`);
  logger.log(`  • Network requests:  0 (Fully offline)`);

  logger.log("\n[SUCCESS] Stage 5A Media dry-run completed successfully.\n");
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
      console.error("[FATAL] Media migration dry-run failed:", err.message);
      process.exitCode = 1;
    });
}

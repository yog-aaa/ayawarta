import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { validateInvitationPublicId } from "@/features/media/public-id";
import { dryRunReportSchema } from "@/features/media/schema";
import type {
  DryRunReport,
  InvitationSlug,
  PhysicalAsset,
} from "@/features/media/types";
import {
  validateLocalSource,
  validateRemoteCloudinaryUrl,
} from "./data/invitation-media-manifest";

export interface VerificationOptions {
  reportPath?: string;
  repoRoot?: string;
  logger?: Pick<Console, "log" | "warn" | "error">;
}

export interface VerificationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  verifiedAssetsCount: number;
  verifiedUsagesCount: number;
  verifiedLocalFilesCount: number;
  verifiedRemoteUrlsCount: number;
  verifiedHeroesCount: number;
}

function getExpectedFileExtension(sourceLocation: string): string {
  const clean = sourceLocation.split("?")[0].split("#")[0];
  return path.extname(clean).replace(/^\./, "").toLowerCase();
}

function getExpectedFileName(sourceLocation: string): string {
  const clean = sourceLocation.split("?")[0].split("#")[0];
  return path.basename(clean);
}

export function verifyOfflineDryRunReport(
  options?: VerificationOptions
): VerificationResult {
  const repoRoot = options?.repoRoot ?? process.cwd();
  const reportPath =
    options?.reportPath ??
    path.resolve(repoRoot, ".media-migration", "manifest-dry-run-report.json");

  const errors: string[] = [];
  const warnings: string[] = [];

  const emptyResult = (errs: string[]): VerificationResult => ({
    passed: false,
    errors: errs,
    warnings: [],
    verifiedAssetsCount: 0,
    verifiedUsagesCount: 0,
    verifiedLocalFilesCount: 0,
    verifiedRemoteUrlsCount: 0,
    verifiedHeroesCount: 0,
  });

  if (!fs.existsSync(reportPath)) {
    return emptyResult([
      `Dry-run report not found at: ${reportPath}. Run 'pnpm media:dry-run' first to generate the report.`,
    ]);
  }

  let rawJson: unknown;
  try {
    const raw = fs.readFileSync(reportPath, "utf-8");

    // Secret scan on raw report text
    const secretKeywords = [
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_SECRET",
      "AUTH_SECRET",
      "ADMIN_PASSWORD",
      "DATABASE_URL",
    ];
    for (const kw of secretKeywords) {
      if (raw.includes(kw)) {
        errors.push(`Secret keyword '${kw}' detected in dry-run report output!`);
      }
    }

    rawJson = JSON.parse(raw);
  } catch (err) {
    return emptyResult([`Failed to parse report JSON: ${(err as Error).message}`]);
  }

  // MEDIA-02A: Runtime Schema Validation before dereference using Zod
  const schemaValidation = dryRunReportSchema.safeParse(rawJson);
  if (!schemaValidation.success) {
    for (const issue of schemaValidation.error.issues) {
      errors.push(
        `Report schema validation failed at '${issue.path.join(".")}': ${issue.message}`
      );
    }
    return emptyResult(errors);
  }

  const report: DryRunReport = schemaValidation.data;
  const { manifest, stage5BProposedEffects: effects } = report;
  const { summary, physicalAssets, logicalUsages, unresolvedMusicBlockers } =
    manifest;

  // Invariant 1: Slugs Validation
  const expectedSlugs: InvitationSlug[] = [
    "rika-fauzi",
    "shidqi-mita",
    "dudi-aini",
    "default-preview",
  ];

  if (manifest.slugs.length !== 4) {
    errors.push(`Expected 4 slugs, got ${manifest.slugs.length}`);
  }

  const seenSlugs = new Set<string>();
  for (const slug of manifest.slugs) {
    if (!expectedSlugs.includes(slug)) {
      errors.push(`Unapproved slug '${slug}' in manifest.slugs`);
    }
    if (seenSlugs.has(slug)) {
      errors.push(`Duplicate slug '${slug}' in manifest.slugs`);
    }
    seenSlugs.add(slug);
  }

  // Invariant 2: Physical Assets Integrity & Parsing
  const assetMap = new Map<string, PhysicalAsset>();
  const targetPublicIdCounts = new Map<string, number>();
  let verifiedLocal = 0;
  let verifiedRemote = 0;

  for (const asset of physicalAssets) {
    targetPublicIdCounts.set(
      asset.targetPublicId,
      (targetPublicIdCounts.get(asset.targetPublicId) ?? 0) + 1
    );

    if (asset.id !== asset.targetPublicId) {
      errors.push(
        `Physical asset id mismatch: id '${asset.id}' !== targetPublicId '${asset.targetPublicId}'`
      );
    }

    // Parse targetPublicId and check parsed consistency (MEDIA-02A)
    const pidValidation = validateInvitationPublicId(asset.targetPublicId);
    if (!pidValidation.valid) {
      errors.push(
        `Invalid target public ID '${asset.targetPublicId}': ${pidValidation.reason}`
      );
    } else {
      const { parsed } = pidValidation;
      if (parsed.slug !== asset.slug) {
        errors.push(
          `Public ID parsed slug '${parsed.slug}' !== asset.slug '${asset.slug}' for '${asset.targetPublicId}'`
        );
      }
      if (parsed.category !== asset.category) {
        errors.push(
          `Public ID parsed category '${parsed.category}' !== asset.category '${asset.category}' for '${asset.targetPublicId}'`
        );
      }
      // Parsed item matches category semantics
      if (asset.category === "couple") {
        if (!["groom", "bride", "hero"].includes(parsed.item)) {
          errors.push(
            `Public ID couple item '${parsed.item}' invalid for '${asset.targetPublicId}'`
          );
        }
      } else if (asset.category === "gallery") {
        if (!/^gallery-\d{2}$/.test(parsed.item)) {
          errors.push(
            `Public ID gallery item '${parsed.item}' invalid for '${asset.targetPublicId}'`
          );
        }
      } else if (asset.category === "audio") {
        if (parsed.item !== "background-music") {
          errors.push(
            `Public ID audio item '${parsed.item}' does not match expected 'background-music' for '${asset.targetPublicId}'`
          );
        }
      }
    }

    if (assetMap.has(asset.targetPublicId)) {
      errors.push(`Duplicate target public ID detected: '${asset.targetPublicId}'`);
    }
    assetMap.set(asset.targetPublicId, asset);

    if (asset.category === "audio" && asset.cloudinaryResourceType !== "video") {
      errors.push(
        `Audio asset '${asset.targetPublicId}' must have cloudinaryResourceType 'video'`
      );
    }
    if (
      (asset.category === "couple" || asset.category === "gallery") &&
      asset.cloudinaryResourceType !== "image"
    ) {
      errors.push(
        `Image asset '${asset.targetPublicId}' must have cloudinaryResourceType 'image'`
      );
    }

    // Validate format and originalFileName against source (MEDIA-02A)
    const expectedFormat = getExpectedFileExtension(asset.sourceLocation);
    const expectedFileName = getExpectedFileName(asset.sourceLocation);

    if (asset.format !== expectedFormat) {
      errors.push(
        `Format mismatch for asset '${asset.targetPublicId}': expected '${expectedFormat}', got '${asset.format}'`
      );
    }

    if (asset.originalFileName !== expectedFileName) {
      errors.push(
        `originalFileName mismatch for asset '${asset.targetPublicId}': expected '${expectedFileName}', got '${asset.originalFileName}'`
      );
    }

    // Source validation using hardened validators
    if (asset.sourceType === "local") {
      const localVal = validateLocalSource(asset.sourceLocation, repoRoot);
      if (!localVal.valid) {
        errors.push(
          `Local source validation failed for '${asset.sourceLocation}' in asset '${asset.targetPublicId}': ${localVal.reason}`
        );
      } else {
        if (asset.byteSize !== localVal.byteSize) {
          errors.push(
            `Byte size mismatch for '${asset.sourceLocation}': report says ${asset.byteSize}, actual is ${localVal.byteSize}`
          );
        }
        verifiedLocal++;
      }
    } else if (asset.sourceType === "remote") {
      const remoteVal = validateRemoteCloudinaryUrl(asset.sourceLocation);
      if (!remoteVal.valid) {
        errors.push(
          `Remote source validation failed for '${asset.sourceLocation}' in asset '${asset.targetPublicId}': ${remoteVal.reason}`
        );
      } else {
        if (asset.byteSize !== null) {
          errors.push(
            `Remote asset '${asset.targetPublicId}' must have null byteSize in dry-run, got ${asset.byteSize}`
          );
        }
        verifiedRemote++;
      }
    }
  }

  // Invariant 3: Logical Usages Integrity & Canonical usageId
  const seenUsageIds = new Set<string>();
  const reverseReferences = new Map<string, string[]>();
  const seenAssetReferences = new Set<string>();

  for (const usage of logicalUsages) {
    // Validate canonical usageId format (MEDIA-02A)
    let expectedCanonicalId: string;
    if (usage.category === "couple") {
      expectedCanonicalId = `${usage.slug}:${usage.category}:${usage.role}`;
    } else if (usage.category === "gallery") {
      expectedCanonicalId = `${usage.slug}:${usage.category}:${String(usage.position).padStart(2, "0")}`;
    } else if (usage.category === "audio") {
      expectedCanonicalId = `${usage.slug}:${usage.category}:item`;
    } else {
      expectedCanonicalId = `${usage.slug}:${usage.category}:item`;
    }

    if (usage.usageId !== expectedCanonicalId) {
      errors.push(
        `Canonical usageId mismatch for usage: expected '${expectedCanonicalId}', got '${usage.usageId}'`
      );
    }

    if (seenUsageIds.has(usage.usageId)) {
      errors.push(`Duplicate usageId detected: '${usage.usageId}'`);
    }
    seenUsageIds.add(usage.usageId);

    // Target asset referential integrity
    const targetAsset = assetMap.get(usage.targetPublicId);
    if (!targetAsset) {
      errors.push(
        `Usage '${usage.usageId}' references non-existent physical asset '${usage.targetPublicId}'`
      );
    } else {
      // Slug ownership check
      if (usage.slug !== targetAsset.slug) {
        errors.push(
          `Slug mismatch: usage '${usage.usageId}' has slug '${usage.slug}' but references physical asset belonging to slug '${targetAsset.slug}'`
        );
      }

      // Record reverse reference
      const list = reverseReferences.get(usage.targetPublicId) ?? [];
      list.push(usage.usageId);
      reverseReferences.set(usage.targetPublicId, list);

      // Recompute isReused and reuseNotes (MEDIA-02A)
      const isFirstReference = !seenAssetReferences.has(usage.targetPublicId);
      seenAssetReferences.add(usage.targetPublicId);

      const expectedIsReused = !isFirstReference;
      if (usage.isReused !== expectedIsReused) {
        errors.push(
          `Usage '${usage.usageId}' has invalid isReused flag: expected ${expectedIsReused}, got ${usage.isReused}`
        );
      }

      if (expectedIsReused) {
        const expectedNotes = `Reuses asset '${targetAsset.targetPublicId}' from source '${targetAsset.sourceLocation}'`;
        if (usage.reuseNotes !== expectedNotes) {
          errors.push(
            `Usage '${usage.usageId}' has invalid reuseNotes: expected '${expectedNotes}', got '${usage.reuseNotes}'`
          );
        }
      } else {
        if (usage.reuseNotes !== undefined) {
          errors.push(
            `Usage '${usage.usageId}' is primary asset usage and must not have reuseNotes, got '${usage.reuseNotes}'`
          );
        }
      }
    }

    // Role and position semantics
    if (usage.category === "couple") {
      if (usage.position !== undefined) {
        errors.push(`Couple usage '${usage.usageId}' must not define position`);
      }
    } else if (usage.category === "gallery") {
      if (usage.role !== undefined) {
        errors.push(`Gallery usage '${usage.usageId}' must not define role`);
      }
    } else if (usage.category === "audio") {
      if (usage.position !== undefined || usage.role !== undefined) {
        errors.push(`Audio usage '${usage.usageId}' must not define role or position`);
      }
    }

    // Alt text for images
    if (usage.category === "couple" || usage.category === "gallery") {
      if (
        !usage.altText ||
        typeof usage.altText !== "string" ||
        usage.altText.trim().length === 0
      ) {
        errors.push(`Image usage '${usage.usageId}' is missing altText`);
      }
    }
  }

  // Invariant 4: Reverse References Verification (`reusedInUsages` exact match)
  for (const asset of physicalAssets) {
    const actualUsages = (reverseReferences.get(asset.targetPublicId) ?? []).slice().sort();
    const declaredUsages = (asset.reusedInUsages ?? []).slice().sort();

    if (
      actualUsages.length !== declaredUsages.length ||
      !actualUsages.every((u, i) => u === declaredUsages[i])
    ) {
      errors.push(
        `Reverse reference mismatch for asset '${asset.targetPublicId}': declared in reusedInUsages: [${declaredUsages.join(", ")}], but actual usages referencing it are: [${actualUsages.join(", ")}]`
      );
    }
  }

  // Invariant 5: Exact 1 Hero Per Slug
  let verifiedHeroes = 0;
  for (const slug of expectedSlugs) {
    const heroUsages = logicalUsages.filter(
      (u) => u.slug === slug && u.category === "couple" && u.role === "hero"
    );

    if (heroUsages.length !== 1) {
      errors.push(
        `Slug '${slug}' must have exactly 1 hero usage, found ${heroUsages.length}`
      );
    } else {
      verifiedHeroes++;
    }

    // Gallery sequential ordering
    const galleryItems = logicalUsages
      .filter((u) => u.slug === slug && u.category === "gallery")
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    galleryItems.forEach((item, index) => {
      const expectedPos = index + 1;
      if (item.position !== expectedPos) {
        errors.push(
          `Gallery position mismatch in slug '${slug}': item at index ${index} has position ${item.position}, expected ${expectedPos}`
        );
      }
    });
  }

  // Invariant 6: Unresolved Music Blockers
  if (unresolvedMusicBlockers.length !== 3) {
    errors.push(
      `Expected exactly 3 unresolved music blockers, found ${unresolvedMusicBlockers.length}`
    );
  }
  const blockerSlugs = unresolvedMusicBlockers.map((b) => b.slug).sort();
  const expectedBlockerSlugs = ["default-preview", "rika-fauzi", "shidqi-mita"];
  if (
    blockerSlugs.length !== 3 ||
    !blockerSlugs.every((s, i) => s === expectedBlockerSlugs[i])
  ) {
    errors.push(
      `Unresolved music blocker slugs mismatch: expected [${expectedBlockerSlugs.join(", ")}], got [${blockerSlugs.join(", ")}]`
    );
  }

  for (const blocker of unresolvedMusicBlockers) {
    if (
      !blocker.musicUrl ||
      (!blocker.musicUrl.includes("youtube.com") &&
        !blocker.musicUrl.includes("youtu.be"))
    ) {
      errors.push(
        `Blocker for slug '${blocker.slug}' has invalid YouTube musicUrl: '${blocker.musicUrl}'`
      );
    }
  }

  // Invariant 7: Exclude galleryVideoUrl
  const hasVideoUsage = logicalUsages.some((u) => u.category === "video");
  const hasVideoAsset = physicalAssets.some((a) => a.category === "video");
  if (hasVideoUsage || hasVideoAsset) {
    errors.push(
      "External video embed pointers must not be present in Cloudinary manifest"
    );
  }

  // Invariant 8: Recompute Global & Per-Slug Summaries (Untrusted Input Defense)
  const recomputedTotalSlugs = manifest.slugs.length;
  const recomputedTotalPhysical = physicalAssets.length;
  const recomputedTotalUsages = logicalUsages.length;
  const recomputedTotalLocal = physicalAssets.filter(
    (a) => a.sourceType === "local"
  ).length;
  const recomputedTotalRemote = physicalAssets.filter(
    (a) => a.sourceType === "remote"
  ).length;
  const recomputedTotalImages = physicalAssets.filter(
    (a) => a.category === "couple" || a.category === "gallery"
  ).length;
  const recomputedTotalAudio = physicalAssets.filter(
    (a) => a.category === "audio"
  ).length;
  const recomputedTotalVideo = physicalAssets.filter(
    (a) => a.category === "video"
  ).length;
  const recomputedUnresolvedMusic = unresolvedMusicBlockers.length;

  // Recompute collisionsDetected (MEDIA-02A)
  let recomputedCollisions = 0;
  for (const count of targetPublicIdCounts.values()) {
    if (count > 1) {
      recomputedCollisions += count - 1;
    }
  }
  if (summary.collisionsDetected !== recomputedCollisions) {
    errors.push(
      `Summary collisionsDetected mismatch: summary says ${summary.collisionsDetected}, recomputed is ${recomputedCollisions}`
    );
  }

  // Recompute missingLocalFilesCount (MEDIA-02A)
  let recomputedMissingLocal = 0;
  for (const asset of physicalAssets) {
    if (asset.sourceType === "local") {
      const abs = path.resolve(repoRoot, asset.sourceLocation);
      if (!fs.existsSync(abs)) {
        recomputedMissingLocal++;
      }
    }
  }
  if (summary.missingLocalFilesCount !== recomputedMissingLocal) {
    errors.push(
      `Summary missingLocalFilesCount mismatch: summary says ${summary.missingLocalFilesCount}, recomputed is ${recomputedMissingLocal}`
    );
  }

  if (summary.totalSlugs !== recomputedTotalSlugs) {
    errors.push(
      `Summary forgery: totalSlugs is ${summary.totalSlugs}, but actual count is ${recomputedTotalSlugs}`
    );
  }
  if (summary.totalPhysicalAssets !== recomputedTotalPhysical) {
    errors.push(
      `Summary forgery: totalPhysicalAssets is ${summary.totalPhysicalAssets}, but actual count is ${recomputedTotalPhysical}`
    );
  }
  if (summary.totalLogicalUsages !== recomputedTotalUsages) {
    errors.push(
      `Summary forgery: totalLogicalUsages is ${summary.totalLogicalUsages}, but actual count is ${recomputedTotalUsages}`
    );
  }
  if (summary.totalLocalAssets !== recomputedTotalLocal) {
    errors.push(
      `Summary forgery: totalLocalAssets is ${summary.totalLocalAssets}, but actual count is ${recomputedTotalLocal}`
    );
  }
  if (summary.totalRemoteAssets !== recomputedTotalRemote) {
    errors.push(
      `Summary forgery: totalRemoteAssets is ${summary.totalRemoteAssets}, but actual count is ${recomputedTotalRemote}`
    );
  }
  if (summary.totalImages !== recomputedTotalImages) {
    errors.push(
      `Summary forgery: totalImages is ${summary.totalImages}, but actual count is ${recomputedTotalImages}`
    );
  }
  if (summary.totalAudio !== recomputedTotalAudio) {
    errors.push(
      `Summary forgery: totalAudio is ${summary.totalAudio}, but actual count is ${recomputedTotalAudio}`
    );
  }
  if (summary.totalVideo !== recomputedTotalVideo) {
    errors.push(
      `Summary forgery: totalVideo is ${summary.totalVideo}, but actual count is ${recomputedTotalVideo}`
    );
  }
  if (summary.unresolvedExternalMusicCount !== recomputedUnresolvedMusic) {
    errors.push(
      `Summary forgery: unresolvedExternalMusicCount is ${summary.unresolvedExternalMusicCount}, but actual count is ${recomputedUnresolvedMusic}`
    );
  }

  // Per-slug breakdown recomputation
  for (const slug of expectedSlugs) {
    const sBreakdown = summary.slugBreakdown[slug];
    if (!sBreakdown) {
      errors.push(`Missing slugBreakdown entry for slug '${slug}'`);
      continue;
    }

    const actualSlugPhysical = physicalAssets.filter((a) => a.slug === slug).length;
    const actualSlugUsages = logicalUsages.filter((u) => u.slug === slug).length;
    const actualSlugMusic = unresolvedMusicBlockers.filter((b) => b.slug === slug).length;
    const actualHeroAsset = logicalUsages.find(
      (u) => u.slug === slug && u.category === "couple" && u.role === "hero"
    )?.targetPublicId;

    if (sBreakdown.physicalAssets !== actualSlugPhysical) {
      errors.push(
        `Slug breakdown forgery for '${slug}': reported physicalAssets ${sBreakdown.physicalAssets}, actual is ${actualSlugPhysical}`
      );
    }
    if (sBreakdown.logicalUsages !== actualSlugUsages) {
      errors.push(
        `Slug breakdown forgery for '${slug}': reported logicalUsages ${sBreakdown.logicalUsages}, actual is ${actualSlugUsages}`
      );
    }
    if (sBreakdown.unresolvedMusic !== actualSlugMusic) {
      errors.push(
        `Slug breakdown forgery for '${slug}': reported unresolvedMusic ${sBreakdown.unresolvedMusic}, actual is ${actualSlugMusic}`
      );
    }
    if (sBreakdown.heroTargetPublicId !== actualHeroAsset) {
      errors.push(
        `Slug breakdown forgery for '${slug}': reported heroTargetPublicId '${sBreakdown.heroTargetPublicId}', actual is '${actualHeroAsset}'`
      );
    }
  }

  // Invariant 9: Validate stage5BProposedEffects (MEDIA-02A)
  if (effects.localUploadsCount !== recomputedTotalLocal) {
    errors.push(
      `Proposed effects localUploadsCount mismatch: report says ${effects.localUploadsCount}, recomputed is ${recomputedTotalLocal}`
    );
  }
  if (effects.remoteUploadsCount !== recomputedTotalRemote) {
    errors.push(
      `Proposed effects remoteUploadsCount mismatch: report says ${effects.remoteUploadsCount}, recomputed is ${recomputedTotalRemote}`
    );
  }
  if (effects.totalUploads !== recomputedTotalPhysical) {
    errors.push(
      `Proposed effects totalUploads mismatch: report says ${effects.totalUploads}, recomputed is ${recomputedTotalPhysical}`
    );
  }
  if (effects.databaseMutations !== 0) {
    errors.push(
      `Proposed effects databaseMutations must be 0 in Stage 5B planning, got ${effects.databaseMutations}`
    );
  }
  if (effects.fileDeletions !== 0) {
    errors.push(
      `Proposed effects fileDeletions must be 0 in Stage 5B planning, got ${effects.fileDeletions}`
    );
  }

  const detailsText = effects.details.join("\n");
  if (!detailsText.includes(String(recomputedTotalLocal))) {
    errors.push("Proposed effects details missing local uploads count");
  }
  if (!detailsText.includes(String(recomputedTotalRemote))) {
    errors.push("Proposed effects details missing remote uploads count");
  }
  if (!detailsText.includes("database mutations")) {
    errors.push("Proposed effects details missing database mutation disclaimer");
  }
  if (!detailsText.includes("file deletions")) {
    errors.push("Proposed effects details missing file deletion disclaimer");
  }

  // Invariant 10: Expected baseline inventory numbers
  if (physicalAssets.length !== 28) {
    errors.push(`Expected exactly 28 physical upload assets, got ${physicalAssets.length}`);
  }
  if (logicalUsages.length !== 34) {
    errors.push(`Expected exactly 34 logical usages, got ${logicalUsages.length}`);
  }
  if (recomputedTotalLocal !== 12) {
    errors.push(`Expected exactly 12 local files, got ${recomputedTotalLocal}`);
  }
  if (recomputedTotalRemote !== 16) {
    errors.push(`Expected exactly 16 remote Cloudinary assets, got ${recomputedTotalRemote}`);
  }
  if (recomputedTotalImages !== 27) {
    errors.push(`Expected exactly 27 images, got ${recomputedTotalImages}`);
  }
  if (recomputedTotalAudio !== 1) {
    errors.push(`Expected exactly 1 audio asset, got ${recomputedTotalAudio}`);
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    verifiedAssetsCount: physicalAssets.length,
    verifiedUsagesCount: logicalUsages.length,
    verifiedLocalFilesCount: verifiedLocal,
    verifiedRemoteUrlsCount: verifiedRemote,
    verifiedHeroesCount: verifiedHeroes,
  };
}

export async function runVerificationCli(
  args: string[],
  options?: VerificationOptions
): Promise<number> {
  const logger = options?.logger ?? console;
  const repoRoot = options?.repoRoot ?? process.cwd();

  const reportPathIdx = args.indexOf("--report");
  const reportPath =
    reportPathIdx !== -1 && args[reportPathIdx + 1]
      ? path.resolve(repoRoot, args[reportPathIdx + 1])
      : undefined;

  logger.log("\n=======================================================");
  logger.log("  AyaWarta Media Verification: Offline Contract Check");
  logger.log("=======================================================\n");

  const result = verifyOfflineDryRunReport({
    reportPath,
    repoRoot,
    logger,
  });

  if (!result.passed) {
    logger.error("[FAIL] Manifest dry-run report verification failed:\n");
    for (const err of result.errors) {
      logger.error(`  - ${err}`);
    }
    logger.log("");
    return 1;
  }

  logger.log("[PASS] Offline manifest & dry-run contract verification passed!");
  logger.log(`  • Verified physical upload assets: ${result.verifiedAssetsCount} / 28`);
  logger.log(`  • Verified logical invitation usages: ${result.verifiedUsagesCount} / 34`);
  logger.log(`  • Verified local files on disk: ${result.verifiedLocalFilesCount} / 12`);
  logger.log(`  • Verified remote Cloudinary URLs: ${result.verifiedRemoteUrlsCount} / 16`);
  logger.log(`  • Verified hero media mappings: ${result.verifiedHeroesCount} / 4`);
  logger.log(`  • Verified public ID collisions: 0`);
  logger.log(`  • Verified credential leaks: 0`);
  logger.log(`  • Network calls: 0 (Fully offline verification)\n`);

  return 0;
}

// CLI execution entrypoint
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  runVerificationCli(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      console.error("[FATAL] Verification execution failed:", err.message);
      process.exitCode = 1;
    });
}

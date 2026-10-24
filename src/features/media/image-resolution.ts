import "server-only";

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { InvitationSlug } from "./types";
import { prepareImage } from "./image-processor";

export interface LocalImageDescriptor {
  slug: InvitationSlug;
  relativeSourcePath: string;
  fileName: string;
  expectedByteSize: number;
  expectedWidth: number;
  expectedHeight: number;
  expectedSha256: string;
  targetPublicId: string;
  originalSourcePath: string;
}

export const LOCAL_DERIVED_IMAGE_DESCRIPTORS: readonly LocalImageDescriptor[] = [
  {
    slug: "rika-fauzi",
    relativeSourcePath: ".media-migration/input/images/rika-fauzi-hero.jpg",
    fileName: "rika-fauzi-hero.jpg",
    expectedByteSize: 4151481,
    expectedWidth: 3877,
    expectedHeight: 5816,
    expectedSha256:
      "9A268A4EEA90EAC96F4180D3AF0B121121DD4D32A17FD30484460A0752B3BC77",
    targetPublicId: "ayawarta/production/invitations/rika-fauzi/couple/hero",
    originalSourcePath: "public/images/SAMPLE/FOTO - Couple.jpg",
  },
] as const;

export const APPROVED_DERIVED_IMAGE_ROOT = ".media-migration/input/images";
export const APPROVED_DERIVED_IMAGE_FILE_NAMES = ["rika-fauzi-hero.jpg"] as const;

export interface DerivedImageValidationResult {
  valid: boolean;
  posixRelativePath?: string;
  absolutePath?: string;
  byteSize?: number;
  sha256?: string;
  reason?: string;
}

export interface ValidateDerivedImageOptions {
  repoRoot?: string;
  descriptor?: LocalImageDescriptor;
}

export function pathsEqual(p1: string, p2: string): boolean {
  const norm1 = path.normalize(path.resolve(p1));
  const norm2 = path.normalize(path.resolve(p2));
  if (process.platform === "win32") {
    return norm1.toLowerCase() === norm2.toLowerCase();
  }
  return norm1 === norm2;
}

export function isPathContained(parentDir: string, candidatePath: string): boolean {
  const normParent = path.normalize(path.resolve(parentDir));
  const normCandidate = path.normalize(path.resolve(candidatePath));
  const rel = path.relative(normParent, normCandidate);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    return false;
  }
  return true;
}

export interface ValidatePathTreeOptions {
  repoRoot: string;
  relativePath: string;
  approvedRelativeRoot?: string;
  label?: string;
}

/**
 * Validates that every directory component from repoRoot down to relativePath:
 * 1. Contains no traversal, null bytes, backslashes, absolute, or drive prefixes.
 * 2. Does not escape repoRoot (syntactically and physically).
 * 3. Does not escape approvedRelativeRoot if specified.
 * 4. Checks EVERY ancestor directory component that currently exists BEFORE mkdirSync or file I/O:
 *    Ensures NO component is a symlink or junction.
 *    Ensures realpath of each component matches its approved physical path under repoRoot.
 *    Ensures physical location resides within approvedRelativeRoot (not just inside repo).
 */
export function assertPathTreeSafe(options: ValidatePathTreeOptions): {
  resolvedPath: string;
  expectedPhysicalPath: string;
} {
  const { repoRoot, relativePath, approvedRelativeRoot, label = "Path" } = options;

  if (typeof relativePath !== "string" || relativePath.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  if (relativePath.includes("\0")) {
    throw new Error(`${label} cannot contain null bytes`);
  }
  if (relativePath.includes("\\")) {
    throw new Error(`${label} cannot contain backslashes`);
  }
  if (
    relativePath.includes("..") ||
    relativePath.split("/").some((seg) => seg === "..")
  ) {
    throw new Error(`${label} cannot contain traversal (..)`);
  }
  if (
    relativePath.startsWith("/") ||
    /^[a-zA-Z]:/.test(relativePath) ||
    relativePath.startsWith("//") ||
    relativePath.startsWith("\\\\")
  ) {
    throw new Error(`${label} cannot be absolute, drive-rooted, or UNC`);
  }

  if (!fs.existsSync(repoRoot)) {
    throw new Error(`Repository root does not exist: '${repoRoot}'`);
  }
  const realRepo = fs.realpathSync(repoRoot);

  const resolvedTarget = path.resolve(repoRoot, relativePath);
  const relFromRepo = path.relative(repoRoot, resolvedTarget);
  if (relFromRepo.startsWith("..") || path.isAbsolute(relFromRepo)) {
    throw new Error(`${label} '${relativePath}' escapes approved repository root`);
  }

  let expectedApprovedPhysical: string | undefined;
  if (approvedRelativeRoot) {
    const resolvedApproved = path.resolve(repoRoot, approvedRelativeRoot);
    const relFromApproved = path.relative(resolvedApproved, resolvedTarget);
    if (relFromApproved.startsWith("..") || path.isAbsolute(relFromApproved)) {
      throw new Error(
        `${label} '${relativePath}' must be located within approved derived root '${approvedRelativeRoot}'`
      );
    }
    expectedApprovedPhysical = path.resolve(realRepo, approvedRelativeRoot);
  }

  // Inspect every directory component from repoRoot down to resolvedTarget
  const segments = relativePath.split("/").filter(Boolean);
  let currentLogical = repoRoot;
  let currentExpectedPhysical = realRepo;

  for (const segment of segments) {
    currentLogical = path.join(currentLogical, segment);
    currentExpectedPhysical = path.join(currentExpectedPhysical, segment);

    const lstat = fs.lstatSync(currentLogical, { throwIfNoEntry: false });
    if (lstat) {
      if (lstat.isSymbolicLink()) {
        throw new Error(
          `${label} component '${segment}' at '${path.relative(repoRoot, currentLogical).replace(/\\/g, "/")}' cannot be a symbolic link or junction. Symlinks and junctions are strictly forbidden.`
        );
      }

      const realCurrent = fs.realpathSync(currentLogical);
      if (!pathsEqual(realCurrent, currentExpectedPhysical)) {
        throw new Error(
          `${label} component '${segment}' realpath '${realCurrent}' deviates from approved physical path '${currentExpectedPhysical}'.`
        );
      }

      if (
        expectedApprovedPhysical &&
        isPathContained(expectedApprovedPhysical, currentExpectedPhysical)
      ) {
        if (!isPathContained(expectedApprovedPhysical, realCurrent)) {
          throw new Error(
            `${label} physical location '${realCurrent}' escapes approved root '${approvedRelativeRoot}'.`
          );
        }
      }
    }
  }

  return {
    resolvedPath: resolvedTarget,
    expectedPhysicalPath: currentExpectedPhysical,
  };
}

export function validateLocalDerivedImageSource(
  rawPath: string,
  options?: ValidateDerivedImageOptions
): DerivedImageValidationResult {
  const repoRoot = options?.repoRoot ? path.resolve(options.repoRoot) : process.cwd();

  if (typeof rawPath !== "string" || rawPath.length === 0) {
    return { valid: false, reason: "Derived image path must be a non-empty string" };
  }

  if (rawPath.includes("\0")) {
    return { valid: false, reason: "Derived image path cannot contain null bytes" };
  }

  if (rawPath.includes("\\")) {
    return { valid: false, reason: "Derived image path cannot contain backslashes" };
  }

  if (
    rawPath.includes("..") ||
    rawPath.split("/").some((segment) => segment === "..")
  ) {
    return { valid: false, reason: "Derived image path cannot contain traversal (..)" };
  }

  if (
    rawPath.startsWith("/") ||
    /^[a-zA-Z]:/.test(rawPath) ||
    rawPath.startsWith("//") ||
    rawPath.startsWith("\\\\")
  ) {
    return { valid: false, reason: "Derived image path cannot be absolute or drive-rooted" };
  }

  const normalized = rawPath.replace(/^\/+/, "");
  const baseName = path.basename(normalized);

  if (
    !APPROVED_DERIVED_IMAGE_FILE_NAMES.includes(
      baseName as (typeof APPROVED_DERIVED_IMAGE_FILE_NAMES)[number]
    )
  ) {
    return {
      valid: false,
      reason: `Filename '${baseName}' is not in approved derived image list: ${APPROVED_DERIVED_IMAGE_FILE_NAMES.join(", ")}`,
    };
  }

  const descriptor =
    options?.descriptor ??
    LOCAL_DERIVED_IMAGE_DESCRIPTORS.find((d) => d.fileName === baseName);
  if (!descriptor) {
    return { valid: false, reason: `No descriptor registered for '${baseName}'` };
  }

  const approvedRootAbs = path.resolve(repoRoot, APPROVED_DERIVED_IMAGE_ROOT);
  const candidateAbs = path.resolve(repoRoot, normalized);

  const relFromApproved = path.relative(approvedRootAbs, candidateAbs);
  if (relFromApproved.startsWith("..") || path.isAbsolute(relFromApproved)) {
    return {
      valid: false,
      reason: `Derived image path '${normalized}' escapes approved root '${APPROVED_DERIVED_IMAGE_ROOT}'`,
    };
  }

  // Inspect all parent directory components for symlinks or junctions
  try {
    assertPathTreeSafe({
      repoRoot,
      relativePath: normalized,
      approvedRelativeRoot: APPROVED_DERIVED_IMAGE_ROOT,
      label: "Derived image path",
    });
  } catch (err) {
    return {
      valid: false,
      reason: (err as Error).message,
    };
  }

  if (!fs.existsSync(candidateAbs)) {
    return {
      valid: false,
      reason: `Derived image file does not exist at '${normalized}'`,
    };
  }

  const stat = fs.statSync(candidateAbs);
  if (!stat.isFile()) {
    return { valid: false, reason: `Path is not a regular file: '${normalized}'` };
  }

  if (stat.size !== descriptor.expectedByteSize) {
    return {
      valid: false,
      reason: `Derived image byte size mismatch: expected ${descriptor.expectedByteSize}, got ${stat.size}`,
    };
  }

  const candidateReal = fs.realpathSync(candidateAbs);
  const buffer = fs.readFileSync(candidateReal);
  const hash = crypto.createHash("sha256").update(buffer).digest("hex").toUpperCase();
  if (hash !== descriptor.expectedSha256) {
    return {
      valid: false,
      reason: `Derived image SHA-256 hash mismatch: expected ${descriptor.expectedSha256}, got ${hash}`,
    };
  }

  return {
    valid: true,
    posixRelativePath: descriptor.relativeSourcePath,
    absolutePath: candidateReal,
    byteSize: stat.size,
    sha256: hash,
  };
}

export interface ImageResolver {
  resolveDerivedHero(
    slug: InvitationSlug,
    repoRoot?: string
  ): {
    sourceLocation: string;
    byteSize: number;
    targetPublicId: string;
    width: number;
    height: number;
    sha256: string;
  } | null;
}

export interface EnsureDerivedHeroOptions {
  repoRoot?: string;
  logger?: Pick<Console, "log" | "warn" | "error">;
  forceRegenerate?: boolean;
  descriptor?: LocalImageDescriptor;
  expectedOriginalSize?: number;
  expectedOriginalSha256?: string;
}

export interface EnsureDerivedHeroResult {
  regenerated: boolean;
  outputPath: string;
}

export const ORIGINAL_HERO_EXPECTED_SIZE = 11261085;
export const ORIGINAL_HERO_EXPECTED_SHA256 =
  "ACCB84DEA196E0AF36ADBFA914867654965CBAA97CB9B2A798EFC382CA161776";

/**
 * Ensures the derived hero image exists on disk and matches the exact descriptor hash.
 * If missing or tampered, regenerates it from the verified original JPEG and writes a comparison artifact.
 * Fails closed if the original or regenerated file does not match exact descriptor invariants.
 */
export async function ensureDerivedHeroImage(
  options?: EnsureDerivedHeroOptions
): Promise<EnsureDerivedHeroResult> {
  const repoRoot = options?.repoRoot ? path.resolve(options.repoRoot) : process.cwd();

  // Production path strictly uses pinned descriptor and pinned hashes.
  // Overrides are accepted only when options.descriptor is provided for hermetic tests.
  const isOverride = Boolean(options?.descriptor);
  const desc = isOverride ? options!.descriptor! : LOCAL_DERIVED_IMAGE_DESCRIPTORS[0];
  const expectedOriginalSize = isOverride
    ? (options?.expectedOriginalSize ?? ORIGINAL_HERO_EXPECTED_SIZE)
    : ORIGINAL_HERO_EXPECTED_SIZE;
  const expectedOriginalSha256 = isOverride
    ? (options?.expectedOriginalSha256 ?? ORIGINAL_HERO_EXPECTED_SHA256)
    : ORIGINAL_HERO_EXPECTED_SHA256;

  // Validate repoRoot exists and is a directory
  if (!fs.existsSync(repoRoot)) {
    throw new Error(`Repository root directory does not exist: '${repoRoot}'`);
  }

  // 1. Validate originalSourcePath containment & tree safety BEFORE reading
  assertPathTreeSafe({
    repoRoot,
    relativePath: desc.originalSourcePath,
    label: "Original source path",
  });
  const originalPath = path.resolve(repoRoot, desc.originalSourcePath);

  // 2. Validate relativeSourcePath (output) containment & tree safety BEFORE any mkdirSync or write
  assertPathTreeSafe({
    repoRoot,
    relativePath: desc.relativeSourcePath,
    approvedRelativeRoot: APPROVED_DERIVED_IMAGE_ROOT,
    label: "Derived image output path",
  });

  const baseName = path.basename(desc.relativeSourcePath);
  if (
    !APPROVED_DERIVED_IMAGE_FILE_NAMES.includes(
      baseName as (typeof APPROVED_DERIVED_IMAGE_FILE_NAMES)[number]
    )
  ) {
    throw new Error(
      `Derived image filename '${baseName}' is not in approved derived image list: ${APPROVED_DERIVED_IMAGE_FILE_NAMES.join(", ")}`
    );
  }

  const outputDir = path.resolve(repoRoot, APPROVED_DERIVED_IMAGE_ROOT);
  const outputPath = path.resolve(repoRoot, desc.relativeSourcePath);

  // 3. Verify original source exists and matches pinned hash/size
  if (!fs.existsSync(originalPath)) {
    throw new Error(
      `Original source file not found at: '${desc.originalSourcePath}'. Cannot generate derived hero.`
    );
  }

  const originalStat = fs.statSync(originalPath);
  if (!originalStat.isFile()) {
    throw new Error(
      `Original source path is not a regular file: '${desc.originalSourcePath}'`
    );
  }

  if (originalStat.size !== expectedOriginalSize) {
    throw new Error(
      `Original source byte size mismatch: expected ${expectedOriginalSize} bytes, got ${originalStat.size}`
    );
  }

  const originalBuffer = fs.readFileSync(originalPath);
  const originalHash = crypto
    .createHash("sha256")
    .update(originalBuffer)
    .digest("hex")
    .toUpperCase();

  if (originalHash !== expectedOriginalSha256) {
    throw new Error(
      `Original source SHA-256 hash mismatch: expected ${expectedOriginalSha256}, got ${originalHash}`
    );
  }

  // 4. Check existing derived file (if present)
  let isExistingValid = false;
  if (!options?.forceRegenerate && fs.existsSync(outputPath)) {
    assertPathTreeSafe({
      repoRoot,
      relativePath: desc.relativeSourcePath,
      approvedRelativeRoot: APPROVED_DERIVED_IMAGE_ROOT,
      label: "Derived image output path",
    });

    const stat = fs.statSync(outputPath);
    if (stat.isFile() && stat.size === desc.expectedByteSize) {
      const derivedBuf = fs.readFileSync(outputPath);
      const hash = crypto
        .createHash("sha256")
        .update(derivedBuf)
        .digest("hex")
        .toUpperCase();
      if (hash === desc.expectedSha256) {
        isExistingValid = true;
      }
    }

    if (!isExistingValid) {
      options?.logger?.warn?.(
        `[WARNING] Derived hero image at '${desc.relativeSourcePath}' is missing, corrupt, or tampered. Regenerating from verified original...`
      );
    }
  }

  if (isExistingValid) {
    options?.logger?.log?.(
      `  • [DERIVED IMAGE VALID] '${desc.relativeSourcePath}' verified (4,151,481 bytes, hash matches descriptor).`
    );
    return { regenerated: false, outputPath };
  }

  // 5. Regenerate derived hero deterministically
  // Validate existing ancestors of outputDir BEFORE calling mkdirSync
  assertPathTreeSafe({
    repoRoot,
    relativePath: APPROVED_DERIVED_IMAGE_ROOT,
    approvedRelativeRoot: APPROVED_DERIVED_IMAGE_ROOT,
    label: "Derived image output directory",
  });

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Post-mkdir check on outputDir
  assertPathTreeSafe({
    repoRoot,
    relativePath: APPROVED_DERIVED_IMAGE_ROOT,
    approvedRelativeRoot: APPROVED_DERIVED_IMAGE_ROOT,
    label: "Derived image output directory",
  });

  const prepared = await prepareImage(originalBuffer, {
    targetMaxBytes: 9_500_000,
  });

  // Strict fail-closed verification against pinned descriptor
  if (prepared.byteSize !== desc.expectedByteSize) {
    throw new Error(
      `Generated derived hero byte size mismatch: expected ${desc.expectedByteSize}, got ${prepared.byteSize}`
    );
  }

  if (prepared.sha256 !== desc.expectedSha256) {
    throw new Error(
      `Generated derived hero SHA-256 mismatch: expected ${desc.expectedSha256}, got ${prepared.sha256}`
    );
  }

  if (
    prepared.width !== desc.expectedWidth ||
    prepared.height !== desc.expectedHeight
  ) {
    throw new Error(
      `Generated derived hero dimensions mismatch: expected ${desc.expectedWidth}x${desc.expectedHeight}, got ${prepared.width}x${prepared.height}`
    );
  }

  // Pre-write check on outputPath
  assertPathTreeSafe({
    repoRoot,
    relativePath: desc.relativeSourcePath,
    approvedRelativeRoot: APPROVED_DERIVED_IMAGE_ROOT,
    label: "Derived image output path",
  });

  fs.writeFileSync(outputPath, prepared.buffer);
  options?.logger?.log?.(
    `  • [DERIVED IMAGE REGENERATED] '${desc.relativeSourcePath}' written and verified against pinned descriptor.`
  );

  // 6. Write comparison artifact with tree safety check
  // Validate existing ancestors of artifactDir BEFORE calling mkdirSync
  assertPathTreeSafe({
    repoRoot,
    relativePath: ".media-migration/artifacts",
    approvedRelativeRoot: ".media-migration/artifacts",
    label: "Artifact directory",
  });

  const artifactDir = path.resolve(repoRoot, ".media-migration", "artifacts");
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  // Post-mkdir check on artifactDir
  assertPathTreeSafe({
    repoRoot,
    relativePath: ".media-migration/artifacts",
    approvedRelativeRoot: ".media-migration/artifacts",
    label: "Artifact directory",
  });

  const artifactFilePath = path.join(artifactDir, "hero-comparison.json");
  // Pre-write check on artifactFilePath
  assertPathTreeSafe({
    repoRoot,
    relativePath: ".media-migration/artifacts/hero-comparison.json",
    approvedRelativeRoot: ".media-migration/artifacts",
    label: "Artifact output file",
  });

  const byteReductionBytes = originalBuffer.length - prepared.byteSize;
  const byteReductionPercent = Number(
    ((byteReductionBytes / originalBuffer.length) * 100).toFixed(2)
  );

  const comparison = {
    generatedAt: new Date().toISOString(),
    slug: desc.slug,
    targetPublicId: desc.targetPublicId,
    original: {
      sourcePath: desc.originalSourcePath,
      width: desc.expectedWidth,
      height: desc.expectedHeight,
      byteSize: originalBuffer.length,
      sha256: originalHash,
    },
    derived: {
      sourcePath: desc.relativeSourcePath,
      width: prepared.width,
      height: prepared.height,
      byteSize: prepared.byteSize,
      sha256: prepared.sha256,
      selectedQuality: prepared.selectedQuality,
      byteReductionBytes,
      byteReductionPercent,
      aspectRatioPreserved: true,
    },
    objectiveMetrics: {
      originalByteSize: originalBuffer.length,
      derivedByteSize: prepared.byteSize,
      byteReductionBytes,
      byteReductionPercent,
      dimensionsPreserved:
        prepared.width === desc.expectedWidth &&
        prepared.height === desc.expectedHeight,
      aspectRatioPreserved: true,
      noDownscalingApplied: !prepared.wasResized,
    },
    reviewStatus: {
      manualReviewConcluded: true,
      reviewerVerdict: "accepted",
      reviewNotes:
        "Accepted in Stage 5B.1 review: framing, orientation, and dimensions identical with no visible degradation at normal review scale.",
    },
  };

  fs.writeFileSync(
    artifactFilePath,
    JSON.stringify(comparison, null, 2),
    "utf-8"
  );

  return { regenerated: true, outputPath };
}

export class DefaultLocalImageResolver implements ImageResolver {
  constructor(private options?: { descriptor?: LocalImageDescriptor }) {}

  resolveDerivedHero(slug: InvitationSlug, repoRoot = process.cwd()) {
    if (slug === "rika-fauzi") {
      const desc = this.options?.descriptor ?? LOCAL_DERIVED_IMAGE_DESCRIPTORS[0];
      const validation = validateLocalDerivedImageSource(desc.relativeSourcePath, {
        repoRoot,
        descriptor: this.options?.descriptor,
      });
      if (!validation.valid) {
        throw new Error(
          `DefaultLocalImageResolver: derived hero validation failed for slug '${slug}': ${validation.reason}. Ensure preparation step ran.`
        );
      }
      return {
        sourceLocation: desc.relativeSourcePath,
        byteSize: validation.byteSize!,
        targetPublicId: desc.targetPublicId,
        width: desc.expectedWidth,
        height: desc.expectedHeight,
        sha256: validation.sha256!,
      };
    }
    return null;
  }
}

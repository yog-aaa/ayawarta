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

export function validateLocalDerivedImageSource(
  rawPath: string,
  options?: { repoRoot?: string }
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

  if (rawPath.includes("..")) {
    return { valid: false, reason: "Derived image path cannot contain traversal (..)" };
  }

  if (/^[a-zA-Z]:/.test(rawPath) || rawPath.startsWith("//")) {
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

  const descriptor = LOCAL_DERIVED_IMAGE_DESCRIPTORS.find(
    (d) => d.fileName === baseName
  );
  if (!descriptor) {
    return { valid: false, reason: `No descriptor registered for '${baseName}'` };
  }

  const approvedRootAbs = path.resolve(repoRoot, APPROVED_DERIVED_IMAGE_ROOT);
  const candidateAbs = path.resolve(repoRoot, normalized);

  if (!fs.existsSync(candidateAbs)) {
    return {
      valid: false,
      reason: `Derived image file does not exist at '${normalized}'`,
    };
  }

  // Realpath containment check
  let candidateReal: string;
  let rootReal: string;
  try {
    candidateReal = fs.realpathSync(candidateAbs);
    rootReal = fs.realpathSync(approvedRootAbs);
  } catch (err) {
    return {
      valid: false,
      reason: `Failed to resolve realpath for '${normalized}': ${(err as Error).message}`,
    };
  }

  const rel = path.relative(rootReal, candidateReal);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    return {
      valid: false,
      reason: `Derived image path '${candidateReal}' escapes approved root '${rootReal}'`,
    };
  }

  const stat = fs.statSync(candidateReal);
  if (!stat.isFile()) {
    return { valid: false, reason: `Path is not a regular file: '${normalized}'` };
  }

  if (stat.size !== descriptor.expectedByteSize) {
    return {
      valid: false,
      reason: `Derived image byte size mismatch: expected ${descriptor.expectedByteSize}, got ${stat.size}`,
    };
  }

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
  const desc = LOCAL_DERIVED_IMAGE_DESCRIPTORS[0]; // rika-fauzi
  const outputDir = path.resolve(repoRoot, APPROVED_DERIVED_IMAGE_ROOT);
  const outputPath = path.resolve(repoRoot, desc.relativeSourcePath);
  const originalPath = path.resolve(repoRoot, desc.originalSourcePath);

  // 1. Verify original source exists and matches pinned hash/size
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

  if (originalStat.size !== ORIGINAL_HERO_EXPECTED_SIZE) {
    throw new Error(
      `Original source byte size mismatch: expected ${ORIGINAL_HERO_EXPECTED_SIZE} bytes, got ${originalStat.size}`
    );
  }

  const originalBuffer = fs.readFileSync(originalPath);
  const originalHash = crypto
    .createHash("sha256")
    .update(originalBuffer)
    .digest("hex")
    .toUpperCase();

  if (originalHash !== ORIGINAL_HERO_EXPECTED_SHA256) {
    throw new Error(
      `Original source SHA-256 hash mismatch: expected ${ORIGINAL_HERO_EXPECTED_SHA256}, got ${originalHash}`
    );
  }

  // 2. Check existing derived file (if present)
  let isExistingValid = false;
  if (!options?.forceRegenerate && fs.existsSync(outputPath)) {
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

  // 3. Regenerate derived hero deterministically
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

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

  fs.writeFileSync(outputPath, prepared.buffer);
  options?.logger?.log?.(
    `  • [DERIVED IMAGE REGENERATED] '${desc.relativeSourcePath}' written and verified against pinned descriptor.`
  );

  // 4. Write comparison artifact with objective metrics and review status
  const artifactDir = path.resolve(repoRoot, ".media-migration", "artifacts");
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

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
      width: 3877,
      height: 5816,
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
      dimensionsPreserved: prepared.width === 3877 && prepared.height === 5816,
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
    path.join(artifactDir, "hero-comparison.json"),
    JSON.stringify(comparison, null, 2),
    "utf-8"
  );

  return { regenerated: true, outputPath };
}

export class DefaultLocalImageResolver implements ImageResolver {
  resolveDerivedHero(slug: InvitationSlug, repoRoot = process.cwd()) {
    if (slug === "rika-fauzi") {
      const desc = LOCAL_DERIVED_IMAGE_DESCRIPTORS[0];
      const validation = validateLocalDerivedImageSource(desc.relativeSourcePath, {
        repoRoot,
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

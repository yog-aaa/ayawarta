import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { buildAudioPublicId } from "./public-id";

export type LocalAudioSlug = "rika-fauzi" | "shidqi-mita" | "default-preview";

export interface LocalAudioDescriptor {
  readonly slug: LocalAudioSlug;
  readonly relativeSourcePath: string;
  readonly fileName: string;
  readonly expectedByteSize: number;
  readonly expectedSha256: string;
  readonly targetPublicId: string;
}

export const LOCAL_AUDIO_INPUT_DIR = ".media-migration/input/audio";

export const LOCAL_AUDIO_DESCRIPTORS: readonly LocalAudioDescriptor[] = [
  {
    slug: "rika-fauzi",
    relativeSourcePath: ".media-migration/input/audio/rika-fauzi.mp3",
    fileName: "rika-fauzi.mp3",
    expectedByteSize: 7369389,
    expectedSha256:
      "48D3A6E9E0ED03416073720FE28C39ACDF6FBE4256BB41E0A83E6142CCBF323B",
    targetPublicId: buildAudioPublicId("rika-fauzi", "background-music"),
  },
  {
    slug: "shidqi-mita",
    relativeSourcePath: ".media-migration/input/audio/shidqi-mita.mp3",
    fileName: "shidqi-mita.mp3",
    expectedByteSize: 2263386,
    expectedSha256:
      "1AEBA6C98E8F2079081216DD3554A87E295F4562460CED2F7C7F1572120F711F",
    targetPublicId: buildAudioPublicId("shidqi-mita", "background-music"),
  },
  {
    slug: "default-preview",
    relativeSourcePath: ".media-migration/input/audio/default-preview.mp3",
    fileName: "default-preview.mp3",
    expectedByteSize: 2263386,
    expectedSha256:
      "1AEBA6C98E8F2079081216DD3554A87E295F4562460CED2F7C7F1572120F711F",
    targetPublicId: buildAudioPublicId("default-preview", "background-music"),
  },
] as const;

export const ALLOWED_AUDIO_FILE_NAMES: readonly string[] = [
  "rika-fauzi.mp3",
  "shidqi-mita.mp3",
  "default-preview.mp3",
] as const;

export function isLocalAudioSlug(slug: string): slug is LocalAudioSlug {
  return (
    slug === "rika-fauzi" ||
    slug === "shidqi-mita" ||
    slug === "default-preview"
  );
}

export function getLocalAudioDescriptor(
  slug: LocalAudioSlug
): LocalAudioDescriptor {
  const descriptor = LOCAL_AUDIO_DESCRIPTORS.find((d) => d.slug === slug);
  if (!descriptor) {
    throw new Error(`No local audio descriptor found for slug: ${slug}`);
  }
  return descriptor;
}

/**
 * Validates MP3 file signature (ID3v2 header or MPEG Audio frame sync).
 */
export function hasValidMp3Signature(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;

  // Case 1: ID3v2 tag (ID3 header)
  if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
    // ID3v2 major version should be < 0xFF (typically 2, 3, or 4)
    return buffer[3] < 0xff && buffer[4] < 0xff;
  }

  // Case 2: MPEG-1 / MPEG-2 Audio frame sync (11 consecutive 1 bits: 0xFF followed by 0xE0 mask)
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
    // Check layer: bits 1-2 must not be 00 (00 is reserved, 01 is Layer III, 10 is Layer II, 11 is Layer I)
    const layer = (buffer[1] >> 1) & 0x03;
    return layer !== 0;
  }

  return false;
}

/**
 * Computes uppercase SHA-256 hash for a buffer.
 */
export function computeSha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex").toUpperCase();
}

export interface AudioValidationOptions {
  repoRoot?: string;
  allowedAudioDir?: string;
  allowedFileNames?: readonly string[];
  descriptor?: LocalAudioDescriptor;
  verifyContent?: boolean;
}

export interface AudioValidationResult {
  valid: boolean;
  reason?: string;
  posixRelativePath?: string;
  absolutePath?: string;
  byteSize?: number;
  sha256?: string;
}

/**
 * Validates a local audio source path strictly confined within .media-migration/input/audio.
 */
export function validateLocalAudioSource(
  localSourcePath: string,
  options?: AudioValidationOptions
): AudioValidationResult {
  const repoRoot = options?.repoRoot ? path.resolve(options.repoRoot) : process.cwd();
  const allowedDir = options?.allowedAudioDir ?? LOCAL_AUDIO_INPUT_DIR;
  const allowedFileNames = options?.allowedFileNames ?? ALLOWED_AUDIO_FILE_NAMES;
  const descriptor = options?.descriptor;
  const verifyContent = options?.verifyContent ?? true;

  if (typeof localSourcePath !== "string" || localSourcePath.length === 0) {
    return { valid: false, reason: "Audio source path must be a non-empty string" };
  }

  if (localSourcePath.includes("\0")) {
    return { valid: false, reason: "Audio source path cannot contain null bytes" };
  }

  if (localSourcePath.includes("\\")) {
    return { valid: false, reason: "Audio source path cannot contain backslashes" };
  }

  if (localSourcePath.includes("..")) {
    return { valid: false, reason: "Audio source path cannot contain path traversal (..)" };
  }

  if (/^[a-zA-Z]:/.test(localSourcePath) || localSourcePath.startsWith("//")) {
    return { valid: false, reason: "Audio source path cannot be a drive or UNC path" };
  }

  if (localSourcePath.includes("//")) {
    return { valid: false, reason: "Audio source path cannot contain empty segments (//)" };
  }

  // Normalize leading slash if present
  const stripped = localSourcePath.replace(/^\/+/, "");
  const fileName = path.basename(stripped);

  if (!fileName.toLowerCase().endsWith(".mp3")) {
    return {
      valid: false,
      reason: `Audio file must have .mp3 extension, got: ${fileName}`,
    };
  }

  if (!allowedFileNames.includes(fileName)) {
    return {
      valid: false,
      reason: `Audio file name '${fileName}' is not in approved list: ${allowedFileNames.join(", ")}`,
    };
  }

  const candidateAbsolute = path.resolve(repoRoot, stripped);
  if (!fs.existsSync(candidateAbsolute)) {
    return {
      valid: false,
      reason: `Local audio file does not exist: ${stripped}`,
    };
  }

  let candidateRealPath: string;
  try {
    candidateRealPath = fs.realpathSync(candidateAbsolute);
  } catch (err) {
    return {
      valid: false,
      reason: `Failed to resolve realpath for '${stripped}': ${(err as Error).message}`,
    };
  }

  const audioDirAbsolute = path.resolve(repoRoot, allowedDir);
  if (!fs.existsSync(audioDirAbsolute)) {
    return {
      valid: false,
      reason: `Allowed audio directory does not exist: ${allowedDir}`,
    };
  }

  let audioDirRealPath: string;
  try {
    audioDirRealPath = fs.realpathSync(audioDirAbsolute);
  } catch (err) {
    return {
      valid: false,
      reason: `Failed to resolve realpath for audio root '${allowedDir}': ${(err as Error).message}`,
    };
  }

  // Strictly verify containment inside approved audio directory
  const relToAudioDir = path.relative(audioDirRealPath, candidateRealPath);
  if (relToAudioDir.startsWith("..") || path.isAbsolute(relToAudioDir)) {
    return {
      valid: false,
      reason: `Resolved path '${candidateRealPath}' is outside approved audio root '${audioDirRealPath}'`,
    };
  }

  // Disallow nested subdirectories within the audio directory
  if (relToAudioDir !== fileName) {
    return {
      valid: false,
      reason: `Audio file must be directly located in '${allowedDir}', not in subdirectories: ${relToAudioDir}`,
    };
  }

  let stat: fs.Stats;
  try {
    stat = fs.statSync(candidateRealPath);
  } catch (err) {
    return {
      valid: false,
      reason: `Failed to stat audio file '${stripped}': ${(err as Error).message}`,
    };
  }

  if (!stat.isFile()) {
    return {
      valid: false,
      reason: `Audio path is not a file: ${stripped}`,
    };
  }

  if (stat.size === 0) {
    return {
      valid: false,
      reason: `Audio file has 0 byte size: ${stripped}`,
    };
  }

  try {
    fs.accessSync(candidateRealPath, fs.constants.R_OK);
  } catch {
    return {
      valid: false,
      reason: `Audio file is not readable: ${stripped}`,
    };
  }

  if (descriptor && stat.size !== descriptor.expectedByteSize) {
    return {
      valid: false,
      reason: `Byte size mismatch for '${fileName}': expected ${descriptor.expectedByteSize} bytes, got ${stat.size} bytes`,
    };
  }

  let calculatedSha256: string | undefined;

  if (verifyContent) {
    let fileBuffer: Buffer;
    try {
      fileBuffer = fs.readFileSync(candidateRealPath);
    } catch (err) {
      return {
        valid: false,
        reason: `Failed to read audio file '${stripped}': ${(err as Error).message}`,
      };
    }

    if (!hasValidMp3Signature(fileBuffer)) {
      return {
        valid: false,
        reason: `File '${fileName}' does not have a valid MP3 signature (neither ID3v2 header nor MPEG audio frame sync detected)`,
      };
    }

    calculatedSha256 = computeSha256(fileBuffer);

    if (
      descriptor &&
      calculatedSha256 !== descriptor.expectedSha256.toUpperCase()
    ) {
      return {
        valid: false,
        reason: `SHA-256 hash mismatch for '${fileName}': expected ${descriptor.expectedSha256}, got ${calculatedSha256}`,
      };
    }
  }

  const posixRel = stripped.replace(/\\/g, "/");

  return {
    valid: true,
    posixRelativePath: posixRel,
    absolutePath: candidateRealPath,
    byteSize: stat.size,
    sha256: calculatedSha256,
  };
}

export interface ResolvedAudioResult {
  sourceLocation: string;
  byteSize: number;
  sha256: string;
  targetPublicId: string;
}

export interface AudioResolver {
  resolveAudio(slug: LocalAudioSlug, repoRoot: string): ResolvedAudioResult;
}

export class DefaultLocalAudioResolver implements AudioResolver {
  constructor(
    private readonly descriptors: readonly LocalAudioDescriptor[] = LOCAL_AUDIO_DESCRIPTORS,
    private readonly allowedDir: string = LOCAL_AUDIO_INPUT_DIR
  ) {}

  resolveAudio(slug: LocalAudioSlug, repoRoot: string): ResolvedAudioResult {
    const descriptor = this.descriptors.find((d) => d.slug === slug);
    if (!descriptor) {
      throw new Error(`No local audio descriptor found for slug: ${slug}`);
    }

    const validation = validateLocalAudioSource(
      descriptor.relativeSourcePath,
      {
        repoRoot,
        allowedAudioDir: this.allowedDir,
        descriptor,
        verifyContent: true,
      }
    );

    if (!validation.valid) {
      throw new Error(
        `Failed to resolve local audio for slug '${slug}': ${validation.reason}`
      );
    }

    return {
      sourceLocation: validation.posixRelativePath!,
      byteSize: validation.byteSize!,
      sha256: validation.sha256!,
      targetPublicId: descriptor.targetPublicId,
    };
  }
}

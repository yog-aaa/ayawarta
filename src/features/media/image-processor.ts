import "server-only";

import crypto from "node:crypto";
import fs from "node:fs";
import sharp, { type Metadata } from "sharp";

export const MAX_INPUT_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_DECODED_PIXELS = 40_000_000; // 40 Megapixels
export const SAFETY_TARGET_BYTES = 9_500_000; // 9.5 MB
export const QUALITY_FLOOR = 82;
export const DEFAULT_QUALITY_LADDER = [95, 92, 90, 88, 86, 84, 82] as const;

export const SUPPORTED_INPUT_FORMATS = ["jpeg", "jpg", "png", "webp"] as const;
export type SupportedInputFormat = (typeof SUPPORTED_INPUT_FORMATS)[number];

export interface PrepareImageOptions {
  targetMaxBytes?: number;
  qualityLadder?: readonly number[];
  qualityFloor?: number;
  maxInputBytes?: number;
  maxDecodedPixels?: number;
}

export interface PreparedImageResult {
  buffer: Buffer;
  format: "jpg" | "png" | "webp";
  width: number;
  height: number;
  byteSize: number;
  sha256: string;
  selectedQuality: number;
  wasResized: boolean;
}

/**
 * Reusable server-only primitive for validating and preparing images for upload.
 * Decodes metadata, verifies size/pixel limits, auto-rotates via EXIF, strips unnecessary
 * metadata, and deterministically recompresses oversized JPEGs using a stepped quality ladder.
 */
export async function prepareImage(
  input: Buffer | string,
  options?: PrepareImageOptions
): Promise<PreparedImageResult> {
  const targetMaxBytes = options?.targetMaxBytes ?? SAFETY_TARGET_BYTES;
  const qualityLadder = options?.qualityLadder ?? DEFAULT_QUALITY_LADDER;
  const qualityFloor = options?.qualityFloor ?? QUALITY_FLOOR;
  const maxInputBytes = options?.maxInputBytes ?? MAX_INPUT_BYTES;
  const maxDecodedPixels = options?.maxDecodedPixels ?? MAX_DECODED_PIXELS;

  // 1. Read input buffer and check byte limits
  let inputBuffer: Buffer;
  if (typeof input === "string") {
    if (!fs.existsSync(input)) {
      throw new Error(`Image input file not found: '${input}'`);
    }
    inputBuffer = fs.readFileSync(input);
  } else if (Buffer.isBuffer(input)) {
    inputBuffer = input;
  } else {
    throw new Error("Invalid image input: expected file path or Buffer");
  }

  if (inputBuffer.length === 0) {
    throw new Error("Image input is empty (0 bytes)");
  }

  if (inputBuffer.length > maxInputBytes) {
    throw new Error(
      `Image input exceeds maximum size limit of ${maxInputBytes} bytes (got ${inputBuffer.length} bytes)`
    );
  }

  // 2. Decode metadata using sharp
  let metadata: Metadata;
  try {
    metadata = await sharp(inputBuffer).metadata();
  } catch (err) {
    throw new Error(`Failed to decode image metadata: ${(err as Error).message}`);
  }

  const rawFormat = metadata.format?.toLowerCase();
  if (!rawFormat || !SUPPORTED_INPUT_FORMATS.includes(rawFormat as SupportedInputFormat)) {
    throw new Error(
      `Unsupported image format: '${rawFormat ?? "unknown"}'. Supported formats: ${SUPPORTED_INPUT_FORMATS.join(", ")}`
    );
  }

  const width = metadata.width;
  const height = metadata.height;
  if (!width || !height || width <= 0 || height <= 0) {
    throw new Error(`Invalid image dimensions: ${width}x${height}`);
  }

  const pixelCount = width * height;
  if (pixelCount > maxDecodedPixels) {
    throw new Error(
      `Image decoded pixel count exceeds safety limit (${pixelCount} > ${maxDecodedPixels} pixels)`
    );
  }

  // 3. Normalization pipeline (EXIF rotation + metadata stripping)
  const isJpeg = rawFormat === "jpeg" || rawFormat === "jpg";

  // CLOUD-07: Explicitly reject oversized non-JPEG inputs until format-specific recompression is implemented
  if (!isJpeg && inputBuffer.length > targetMaxBytes) {
    throw new Error(
      `Oversized ${rawFormat.toUpperCase()} image (${inputBuffer.length} bytes) exceeds maximum target size of ${targetMaxBytes} bytes. Non-JPEG recompression is currently not supported.`
    );
  }

  // Check if recompression is required for oversized JPEGs
  const needsRecompression = isJpeg && inputBuffer.length > targetMaxBytes;

  if (!needsRecompression) {
    // Standard pass: auto-rotate and strip metadata
    let pipeline = sharp(inputBuffer).rotate();
    if (isJpeg) {
      pipeline = pipeline.jpeg({ quality: 95, mozjpeg: true });
    } else if (rawFormat === "png") {
      pipeline = pipeline.png();
    } else if (rawFormat === "webp") {
      pipeline = pipeline.webp({ quality: 95 });
    }

    const outputBuffer = await pipeline.toBuffer();

    if (outputBuffer.length > targetMaxBytes) {
      if (!isJpeg) {
        throw new Error(
          `Processed ${rawFormat.toUpperCase()} image (${outputBuffer.length} bytes) exceeds maximum target size of ${targetMaxBytes} bytes. Non-JPEG recompression is currently not supported.`
        );
      }
      // If a JPEG was slightly under inputBuffer limit but expanded during mozjpeg pass, fall through to quality ladder
    } else {
      const finalMeta = await sharp(outputBuffer).metadata();
      const sha256 = crypto
        .createHash("sha256")
        .update(outputBuffer)
        .digest("hex")
        .toUpperCase();

      const result: PreparedImageResult = {
        buffer: outputBuffer,
        format: (rawFormat === "jpeg" ? "jpg" : rawFormat) as "jpg" | "png" | "webp",
        width: finalMeta.width ?? width,
        height: finalMeta.height ?? height,
        byteSize: outputBuffer.length,
        sha256,
        selectedQuality: 95,
        wasResized: false,
      };

      // Postcondition invariant check: 0 < byteSize <= targetMaxBytes
      if (result.byteSize <= 0 || result.byteSize > targetMaxBytes) {
        throw new Error(
          `Image postcondition violated: byteSize ${result.byteSize} is not within (0, ${targetMaxBytes}] bytes`
        );
      }

      return result;
    }
  }

  // 4. Stepped quality ladder for oversized JPEGs
  let chosenBuffer: Buffer | null = null;
  let chosenQuality = qualityFloor;
  let finalWidth = width;
  let finalHeight = height;

  for (const q of qualityLadder) {
    if (q < qualityFloor) continue;

    const candidateBuffer = await sharp(inputBuffer)
      .rotate()
      .jpeg({ quality: q, mozjpeg: true })
      .toBuffer();

    if (candidateBuffer.length <= targetMaxBytes) {
      chosenBuffer = candidateBuffer;
      chosenQuality = q;
      break;
    }
  }

  // Fallback if quality floor still exceeds target: scale down while preserving aspect ratio
  let wasResized = false;
  if (!chosenBuffer) {
    let scale = 0.9;
    while (scale >= 0.5) {
      const targetW = Math.round(width * scale);
      const targetH = Math.round(height * scale);
      const candidateBuffer = await sharp(inputBuffer)
        .rotate()
        .resize(targetW, targetH, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: qualityFloor, mozjpeg: true })
        .toBuffer();

      if (candidateBuffer.length <= targetMaxBytes) {
        chosenBuffer = candidateBuffer;
        chosenQuality = qualityFloor;
        finalWidth = targetW;
        finalHeight = targetH;
        wasResized = true;
        break;
      }
      scale -= 0.1;
    }
  }

  if (!chosenBuffer) {
    throw new Error(
      `Unable to compress image below target size of ${targetMaxBytes} bytes within safety limits`
    );
  }

  const finalMeta = await sharp(chosenBuffer).metadata();
  const sha256 = crypto
    .createHash("sha256")
    .update(chosenBuffer)
    .digest("hex")
    .toUpperCase();

  const result: PreparedImageResult = {
    buffer: chosenBuffer,
    format: "jpg",
    width: finalMeta.width ?? finalWidth,
    height: finalMeta.height ?? finalHeight,
    byteSize: chosenBuffer.length,
    sha256,
    selectedQuality: chosenQuality,
    wasResized,
  };

  // Postcondition invariant check: 0 < byteSize <= targetMaxBytes
  if (result.byteSize <= 0 || result.byteSize > targetMaxBytes) {
    throw new Error(
      `Image postcondition violated: byteSize ${result.byteSize} is not within (0, ${targetMaxBytes}] bytes`
    );
  }

  return result;
}

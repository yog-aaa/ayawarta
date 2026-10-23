import { describe, it, expect } from "vitest";
import sharp from "sharp";
import {
  prepareImage,
  SAFETY_TARGET_BYTES,
} from "./image-processor";

describe("image-processor: prepareImage", () => {
  it("rejects empty input buffer", async () => {
    await expect(prepareImage(Buffer.alloc(0))).rejects.toThrow(
      "Image input is empty"
    );
  });

  it("rejects missing file path", async () => {
    await expect(
      prepareImage("non-existent-file-path-xyz.jpg")
    ).rejects.toThrow("Image input file not found");
  });

  it("rejects input exceeding maxInputBytes", async () => {
    const fakeBuffer = Buffer.alloc(1024);
    await expect(
      prepareImage(fakeBuffer, { maxInputBytes: 500 })
    ).rejects.toThrow("Image input exceeds maximum size limit");
  });

  it("rejects non-image or corrupted buffers", async () => {
    const corruptedBuffer = Buffer.from("this is definitely not an image");
    await expect(prepareImage(corruptedBuffer)).rejects.toThrow(
      "Failed to decode image metadata"
    );
  });

  it("rejects unsupported image formats (e.g. gif, svg)", async () => {
    // Generate a 10x10 GIF
    const gifBuffer = await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .gif()
      .toBuffer();

    await expect(prepareImage(gifBuffer)).rejects.toThrow(
      "Unsupported image format: 'gif'"
    );
  });

  it("rejects images exceeding maxDecodedPixels safety ceiling", async () => {
    const testImage = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 100, g: 150, b: 200 },
      },
    })
      .jpeg()
      .toBuffer();

    // 100x100 = 10,000 pixels. Set maxDecodedPixels to 5,000
    await expect(
      prepareImage(testImage, { maxDecodedPixels: 5000 })
    ).rejects.toThrow("Image decoded pixel count exceeds safety limit");
  });

  it("processes a normal-sized JPEG under targetMaxBytes without downscaling", async () => {
    const testImage = await sharp({
      create: {
        width: 120,
        height: 80,
        channels: 3,
        background: { r: 50, g: 100, b: 150 },
      },
    })
      .jpeg({ quality: 90 })
      .toBuffer();

    const result = await prepareImage(testImage);
    expect(result.format).toBe("jpg");
    expect(result.width).toBe(120);
    expect(result.height).toBe(80);
    expect(result.wasResized).toBe(false);
    expect(result.byteSize).toBeLessThan(SAFETY_TARGET_BYTES);
    expect(result.sha256).toMatch(/^[0-9A-F]{64}$/);
    expect(result.selectedQuality).toBe(95);
  });

  it("processes PNG and WebP images within limits", async () => {
    const pngImage = await sharp({
      create: {
        width: 50,
        height: 50,
        channels: 4,
        background: { r: 0, g: 255, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const pngResult = await prepareImage(pngImage);
    expect(pngResult.format).toBe("png");
    expect(pngResult.width).toBe(50);
    expect(pngResult.height).toBe(50);

    const webpImage = await sharp({
      create: {
        width: 60,
        height: 40,
        channels: 3,
        background: { r: 0, g: 0, b: 255 },
      },
    })
      .webp()
      .toBuffer();

    const webpResult = await prepareImage(webpImage);
    expect(webpResult.format).toBe("webp");
    expect(webpResult.width).toBe(60);
    expect(webpResult.height).toBe(40);
  });

  it("applies deterministic quality ladder when image exceeds targetMaxBytes", async () => {
    // Generate a noise/gradient pattern that doesn't compress too trivially
    const rawPixels = Buffer.alloc(400 * 400 * 3);
    for (let i = 0; i < rawPixels.length; i++) {
      rawPixels[i] = (i * 7 + (i % 251)) % 256;
    }

    const uncompressedJpeg = await sharp(rawPixels, {
      raw: { width: 400, height: 400, channels: 3 },
    })
      .jpeg({ quality: 100 })
      .toBuffer();

    const initialSize = uncompressedJpeg.length;
    // Set targetMaxBytes strictly smaller than initialSize but achievable with quality ladder
    const targetMaxBytes = Math.floor(initialSize * 0.7);

    const result = await prepareImage(uncompressedJpeg, {
      targetMaxBytes,
      qualityLadder: [95, 90, 85, 82],
      qualityFloor: 82,
    });

    expect(result.byteSize).toBeLessThanOrEqual(targetMaxBytes);
    expect(result.wasResized).toBe(false);
    expect(result.width).toBe(400);
    expect(result.height).toBe(400);
    expect(result.selectedQuality).toBeLessThanOrEqual(95);
    expect(result.selectedQuality).toBeGreaterThanOrEqual(82);

    // Determinism test: calling it again produces the exact same sha256 and byteSize
    const result2 = await prepareImage(uncompressedJpeg, {
      targetMaxBytes,
      qualityLadder: [95, 90, 85, 82],
      qualityFloor: 82,
    });
    expect(result2.sha256).toBe(result.sha256);
    expect(result2.byteSize).toBe(result.byteSize);
  });

  it("falls back to downscaling while preserving aspect ratio if quality floor is insufficient", async () => {
    // Generate high frequency noise
    const rawPixels = Buffer.alloc(300 * 200 * 3);
    for (let i = 0; i < rawPixels.length; i++) {
      rawPixels[i] = (i * 13 + (i % 173)) % 256;
    }

    const uncompressedJpeg = await sharp(rawPixels, {
      raw: { width: 300, height: 200, channels: 3 },
    })
      .jpeg({ quality: 95 })
      .toBuffer();

    // Check size at quality 82 without resizing:
    const atFloor = await sharp(uncompressedJpeg)
      .jpeg({ quality: 82 })
      .toBuffer();

    // Target size lower than quality 82 alone can reach, but reachable with modest scale
    const targetBytes = Math.floor(atFloor.length * 0.6);

    const result = await prepareImage(uncompressedJpeg, {
      targetMaxBytes: targetBytes,
      qualityLadder: [82],
      qualityFloor: 82,
    });

    expect(result.byteSize).toBeLessThanOrEqual(targetBytes);
    expect(result.wasResized).toBe(true);
    // Aspect ratio: 300 / 200 = 1.5
    const ratio = result.width / result.height;
    expect(Math.abs(ratio - 1.5)).toBeLessThan(0.05);
    expect(result.width).toBeLessThan(300);
    expect(result.height).toBeLessThan(200);
  });

  describe("CLOUD-07: Oversized non-JPEG handling & postcondition invariants", () => {
    it("rejects oversized PNG input exceeding targetMaxBytes with fail-closed error", async () => {
      // Create a PNG that is 5000 bytes
      const pngBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 255, g: 128, b: 0, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      // Set targetMaxBytes strictly below pngBuffer size
      const targetMaxBytes = Math.floor(pngBuffer.length / 2);

      await expect(
        prepareImage(pngBuffer, { targetMaxBytes })
      ).rejects.toThrow(/Oversized PNG image .* exceeds maximum target size/);
    });

    it("rejects oversized WebP input exceeding targetMaxBytes with fail-closed error", async () => {
      // Create a WebP that is ~2000 bytes
      const rawPixels = Buffer.alloc(200 * 200 * 3);
      for (let i = 0; i < rawPixels.length; i++) {
        rawPixels[i] = (i * 17) % 256;
      }

      const webpBuffer = await sharp(rawPixels, {
        raw: { width: 200, height: 200, channels: 3 },
      })
        .webp({ quality: 100 })
        .toBuffer();

      const targetMaxBytes = Math.floor(webpBuffer.length / 2);

      await expect(
        prepareImage(webpBuffer, { targetMaxBytes })
      ).rejects.toThrow(/Oversized WEBP image .* exceeds maximum target size/);
    });

    it("strictly guarantees postcondition 0 < byteSize <= targetMaxBytes on successful returns", async () => {
      const normalJpeg = await sharp({
        create: {
          width: 50,
          height: 50,
          channels: 3,
          background: { r: 10, g: 20, b: 30 },
        },
      })
        .jpeg({ quality: 90 })
        .toBuffer();

      const targetMax = 50_000;
      const res = await prepareImage(normalJpeg, { targetMaxBytes: targetMax });
      expect(res.byteSize).toBeGreaterThan(0);
      expect(res.byteSize).toBeLessThanOrEqual(targetMax);
    });
  });

  describe("CLOUD-08: Server-only boundary validation", () => {
    it("ensures no client components import image-processor or image-resolution", async () => {
      const fsModule = await import("node:fs");
      const pathModule = await import("node:path");

      const forbiddenImports = ["image-processor", "image-resolution"];
      const violations: { file: string; forbidden: string }[] = [];

      function scanDir(dir: string) {
        const entries = fsModule.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = pathModule.join(dir, entry.name);
          if (entry.isDirectory()) {
            scanDir(fullPath);
          } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
            const content = fsModule.readFileSync(fullPath, "utf-8");
            const isClientComponent = /['"]use client['"]/.test(content);
            if (isClientComponent) {
              for (const forbidden of forbiddenImports) {
                if (content.includes(forbidden)) {
                  violations.push({
                    file: pathModule.relative(process.cwd(), fullPath),
                    forbidden,
                  });
                }
              }
            }
          }
        }
      }

      scanDir(pathModule.resolve(process.cwd(), "src"));
      expect(violations).toEqual([]);
    });
  });
});

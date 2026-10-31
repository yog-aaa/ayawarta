import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import type { AdminCloudImage, AdminMediaCloudClient } from "../media-cloudinary";

type StoredImage = { image: AdminCloudImage; bytes: Buffer };

/** Test-only provider: canonical-looking receipts backed solely by process memory. */
export class FakeA7CloudClient implements AdminMediaCloudClient {
  static readonly images = new Map<string, StoredImage>();
  static uploadCount = 0;

  constructor(options: { cloudName: string; apiKey: string; apiSecret: string }) {
    if (options.cloudName !== "uhwi7xvb" || options.apiKey !== "a7-dummy" || options.apiSecret !== "a7-dummy") {
      throw new Error("A7 fake provider received an unexpected target or credential");
    }
  }

  static reset(): void {
    this.images.clear();
    this.uploadCount = 0;
  }

  async read(publicId: string): Promise<AdminCloudImage | null> {
    return FakeA7CloudClient.images.get(publicId)?.image ?? null;
  }

  async upload(buffer: Buffer, publicId: string): Promise<AdminCloudImage> {
    if (FakeA7CloudClient.images.has(publicId)) throw new Error("A7 fake provider forbids overwrite");
    const meta = await sharp(buffer).metadata();
    if (meta.format !== "webp" || !meta.width || !meta.height) throw new Error("A7 expected prepared WebP");
    const image: AdminCloudImage = {
      assetId: randomUUID(), publicId,
      secureUrl: `https://res.cloudinary.com/uhwi7xvb/image/upload/v1/${publicId}.webp`,
      resourceType: "image", format: "webp", version: 1,
      bytes: buffer.length, width: meta.width, height: meta.height,
    };
    FakeA7CloudClient.images.set(publicId, { image, bytes: Buffer.from(buffer) });
    FakeA7CloudClient.uploadCount += 1;
    return image;
  }

  async contentSha256(url: string, maxBytes: number): Promise<string> {
    const stored = [...FakeA7CloudClient.images.values()].find((item) => item.image.secureUrl === url);
    if (!stored || stored.bytes.length > maxBytes) throw new Error("A7 fake image is unavailable");
    return createHash("sha256").update(stored.bytes).digest("hex");
  }
}

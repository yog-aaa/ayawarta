import "server-only";

import { createHash } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import { validateCloudinaryAssetBinding, validateCloudinaryDeliveryUrl } from "@/features/media/cloudinary-uploader";
import type { AdminPreparedImage } from "./media-image";

export interface AdminCloudImage {
  assetId: string;
  publicId: string;
  secureUrl: string;
  resourceType: "image";
  format: string;
  version: number;
  bytes: number;
  width: number;
  height: number;
}

export interface AdminMediaCloudClient {
  read(publicId: string): Promise<AdminCloudImage | null>;
  upload(buffer: Buffer, publicId: string): Promise<AdminCloudImage>;
  contentSha256(url: string, maxBytes: number): Promise<string>;
}

export class AdminCloudIdentityError extends Error {
  constructor() { super("Cloudinary asset identity does not match the prepared image"); this.name = "AdminCloudIdentityError"; }
}

function parseResource(value: Record<string, unknown>): AdminCloudImage {
  const required = ["asset_id", "public_id", "secure_url", "format"] as const;
  if (required.some((field) => typeof value[field] !== "string" || !value[field])) throw new AdminCloudIdentityError();
  if (value.resource_type !== "image" || !Number.isSafeInteger(value.version) ||
      !Number.isSafeInteger(value.bytes) || !Number.isSafeInteger(value.width) || !Number.isSafeInteger(value.height)) {
    throw new AdminCloudIdentityError();
  }
  return {
    assetId: value.asset_id as string,
    publicId: value.public_id as string,
    secureUrl: value.secure_url as string,
    format: value.format as string,
    resourceType: "image",
    version: value.version as number,
    bytes: value.bytes as number,
    width: value.width as number,
    height: value.height as number,
  };
}

export function verifyAdminCloudImage(
  image: AdminCloudImage,
  prepared: Pick<AdminPreparedImage, "format" | "bytes" | "width" | "height">,
  publicId: string,
  cloudName: string,
): void {
  const binding = validateCloudinaryAssetBinding({
    secureUrl: image.secureUrl,
    expectedCloudName: cloudName,
    expectedResourceType: "image",
    expectedPublicId: publicId,
    expectedFormat: prepared.format,
  });
  if (!image.assetId || image.publicId !== publicId || image.resourceType !== "image" ||
      image.format !== prepared.format || image.version < 1 || image.bytes !== prepared.bytes ||
      image.width !== prepared.width || image.height !== prepared.height || !binding.valid ||
      !image.secureUrl.includes(`/image/upload/v${image.version}/`)) throw new AdminCloudIdentityError();
}

/** Used only after the A5 feature and exact target account gates pass. */
export class RealAdminMediaCloudClient implements AdminMediaCloudClient {
  constructor(options: { cloudName: string; apiKey: string; apiSecret: string }) {
    if (options.cloudName !== "uhwi7xvb" || !options.apiKey || !options.apiSecret) throw new AdminCloudIdentityError();
    cloudinary.config({ cloud_name: options.cloudName, api_key: options.apiKey, api_secret: options.apiSecret, secure: true });
  }

  async read(publicId: string): Promise<AdminCloudImage | null> {
    try {
      return parseResource(await cloudinary.api.resource(publicId, { resource_type: "image" }) as Record<string, unknown>);
    } catch (error) {
      if (typeof error === "object" && error !== null && "http_code" in error && error.http_code === 404) return null;
      throw error;
    }
  }

  async upload(buffer: Buffer, publicId: string): Promise<AdminCloudImage> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({
        public_id: publicId,
        resource_type: "image",
        overwrite: false,
        unique_filename: false,
      }, (error, response) => {
        if (error || !response) { reject(error ?? new AdminCloudIdentityError()); return; }
        try { resolve(parseResource(response as unknown as Record<string, unknown>)); }
        catch (parseError) { reject(parseError); }
      });
      stream.end(buffer);
    });
  }

  async contentSha256(url: string, maxBytes: number): Promise<string> {
    if (!validateCloudinaryDeliveryUrl(url, "uhwi7xvb").valid ||
        !/^\/uhwi7xvb\/image\/upload\/v\d+\//.test(new URL(url).pathname) ||
        !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 3 * 1024 * 1024) throw new AdminCloudIdentityError();
    const response = await fetch(url, { method: "GET", redirect: "error", signal: AbortSignal.timeout(30_000) });
    const declaredBytes = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) throw new AdminCloudIdentityError();
    if (!response.ok || !response.body || response.headers.get("content-type")?.split(";")[0] !== "image/webp") {
      throw new AdminCloudIdentityError();
    }
    const reader = response.body.getReader();
    const hash = createHash("sha256");
    let bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > maxBytes) throw new AdminCloudIdentityError();
        hash.update(value);
      }
    } finally {
      reader.releaseLock();
    }
    if (bytes < 1) throw new AdminCloudIdentityError();
    return hash.digest("hex");
  }
}

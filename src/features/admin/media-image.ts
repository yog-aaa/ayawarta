import "server-only";

import { createHash } from "node:crypto";
import sharp from "sharp";
import { prepareImage } from "@/features/media/image-processor";

export const MAX_ADMIN_IMAGE_INPUT_BYTES = 15 * 1024 * 1024;
export const MAX_ADMIN_IMAGE_OUTPUT_BYTES = 3 * 1024 * 1024;

export type AdminImageSlot = "hero" | "groom" | "bride" | `gallery:${string}`;

export class AdminImageInputError extends Error {
  constructor(public readonly field: "file" | "slot", message: string) {
    super(message);
    this.name = "AdminImageInputError";
  }
}

export function parseAdminImageSlot(input: string | null): AdminImageSlot {
  if (input === "hero" || input === "groom" || input === "bride") return input;
  if (input && /^gallery:[A-Za-z0-9_-]{1,80}$/.test(input)) return input as AdminImageSlot;
  throw new AdminImageInputError("slot", "Pilih kolom foto undangan yang valid.");
}

export interface AdminPreparedImage {
  buffer: Buffer;
  sha256: string;
  format: "webp";
  width: number;
  height: number;
  bytes: number;
}

function hasExpectedSignature(input: Buffer, format: "jpg" | "png" | "webp"): boolean {
  if (format === "jpg") return input.length > 5 && input[0] === 0xff && input[1] === 0xd8 && input[2] === 0xff &&
    input[input.length - 2] === 0xff && input[input.length - 1] === 0xd9;
  if (format === "png") return input.length > 20 &&
    input.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    input.subarray(input.length - 8, input.length - 4).toString("ascii") === "IEND";
  return input.length > 12 && input.subarray(0, 4).toString("ascii") === "RIFF" &&
    input.subarray(8, 12).toString("ascii") === "WEBP" && input.readUInt32LE(4) + 8 === input.length;
}

/** Turns one bounded, decoded source image into one slot-sized WebP derivative. */
export async function prepareAdminImage(input: Buffer, declaredType: string, slot: AdminImageSlot): Promise<AdminPreparedImage> {
  if (input.length === 0 || input.length > MAX_ADMIN_IMAGE_INPUT_BYTES) {
    throw new AdminImageInputError("file", "Ukuran foto harus lebih dari 0 dan paling besar 15 MB.");
  }
  const mimeFormat = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[declaredType];
  if (!mimeFormat) throw new AdminImageInputError("file", "Gunakan foto JPEG, PNG, atau WebP.");
  if (!hasExpectedSignature(input, mimeFormat as "jpg" | "png" | "webp")) {
    throw new AdminImageInputError("file", "Tanda berkas foto tidak valid atau berkas memiliki data tambahan.");
  }

  let source: Awaited<ReturnType<typeof prepareImage>>;
  try {
    source = await prepareImage(input, {
      maxInputBytes: MAX_ADMIN_IMAGE_INPUT_BYTES,
      targetMaxBytes: MAX_ADMIN_IMAGE_INPUT_BYTES,
    });
  } catch {
    throw new AdminImageInputError("file", "Foto tidak dapat diproses atau melampaui batas ukuran dan dimensi.");
  }
  if (source.format !== mimeFormat) throw new AdminImageInputError("file", "Jenis berkas tidak cocok dengan isi foto.");

  const limit = slot === "hero" ? { width: 1600, height: 2400 } :
    slot === "groom" || slot === "bride" ? { width: 900, height: 1200 } : { width: 1600, height: 1600 };
  for (const quality of [82, 76, 70, 64]) {
    const buffer = await sharp(source.buffer)
      .resize({ ...limit, fit: "inside", withoutEnlargement: true })
      .webp({ quality, effort: 5 })
      .toBuffer();
    if (buffer.length > MAX_ADMIN_IMAGE_OUTPUT_BYTES) continue;
    const meta = await sharp(buffer).metadata();
    if (!meta.width || !meta.height || meta.format !== "webp") break;
    return {
      buffer,
      sha256: createHash("sha256").update(buffer).digest("hex"),
      format: "webp",
      width: meta.width,
      height: meta.height,
      bytes: buffer.length,
    };
  }
  throw new AdminImageInputError("file", "Foto terlalu besar setelah dioptimalkan. Pilih foto lain.");
}

import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { AdminImageInputError, MAX_ADMIN_IMAGE_INPUT_BYTES, parseAdminImageSlot, prepareAdminImage } from "./media-image";

describe("admin image preparation", () => {
  it("accepts only stable image slots", () => {
    expect(parseAdminImageSlot("hero")).toBe("hero");
    expect(parseAdminImageSlot("gallery:row_1")).toBe("gallery:row_1");
    expect(parseAdminImageSlot(`gallery:${"a".repeat(80)}`)).toHaveLength(88);
    expect(() => parseAdminImageSlot(`gallery:${"a".repeat(81)}`)).toThrow(AdminImageInputError);
    expect(() => parseAdminImageSlot("gallery:../other")).toThrow(AdminImageInputError);
  });

  it("bounds and optimizes a portrait into a single WebP", async () => {
    const input = await sharp({ create: { width: 1800, height: 2400, channels: 3, background: "#d0a681" } }).jpeg().toBuffer();
    const prepared = await prepareAdminImage(input, "image/jpeg", "groom");
    expect(prepared).toMatchObject({ format: "webp", width: 900, height: 1200, bytes: expect.any(Number) });
    expect(prepared.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(prepared.buffer.length).toBe(prepared.bytes);
  });

  it("rejects MIME spoofing, oversize input, and invalid images", async () => {
    const image = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#ffffff" } }).png().toBuffer();
    await expect(prepareAdminImage(image, "image/jpeg", "hero")).rejects.toMatchObject({ field: "file" });
    await expect(prepareAdminImage(Buffer.concat([image, Buffer.from("<script>bad</script>")]), "image/png", "hero")).rejects.toMatchObject({ field: "file" });
    const jpeg = await sharp(image).jpeg().toBuffer();
    await expect(prepareAdminImage(Buffer.concat([jpeg, Buffer.from("trailing payload")]), "image/jpeg", "hero")).rejects.toMatchObject({ field: "file" });
    await expect(prepareAdminImage(Buffer.alloc(MAX_ADMIN_IMAGE_INPUT_BYTES + 1), "image/png", "hero")).rejects.toMatchObject({ field: "file" });
    await expect(prepareAdminImage(Buffer.from("not an image"), "image/png", "hero")).rejects.toMatchObject({ field: "file" });
  });

  it("accepts valid PNG and WebP sources above the shared 9.5 MB default, within the A5 15 MB limit", async () => {
    const width = 1900, height = 1900;
    const pixels = randomBytes(width * height * 3);
    for (const [format, contentType] of [["png", "image/png"], ["webp", "image/webp"]] as const) {
      const source = await sharp(pixels, { raw: { width, height, channels: 3 } })
        .toFormat(format, format === "png" ? { compressionLevel: 0 } : { lossless: true, effort: 0 }).toBuffer();
      expect(source.length).toBeGreaterThan(9_500_000);
      expect(source.length).toBeLessThan(MAX_ADMIN_IMAGE_INPUT_BYTES);
      await expect(prepareAdminImage(source, contentType, "hero")).resolves.toMatchObject({ format: "webp" });
    }
  }, 60_000);
});

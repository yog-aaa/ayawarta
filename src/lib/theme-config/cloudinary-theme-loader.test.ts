import { describe, expect, it } from "vitest";
import classicRoseMedia from "@/config/classic-rose-cloudinary.json";
import { classicRoseCloudinaryLoader, isClassicRoseCloudinaryAsset } from "./cloudinary-theme-loader";

describe("Classic Rose Cloudinary image loader", () => {
  it("builds width-specific Cloudinary delivery URLs", () => {
    const source = classicRoseMedia.sample.couple;
    const delivered = classicRoseCloudinaryLoader({ src: source, width: 384, quality: 75 });
    expect(delivered).toContain("/image/upload/c_limit,w_384/f_auto/q_auto/v");
    expect(delivered).toContain("/ayawarta/production/themes/classic-rose/sample/couple-");
    expect(delivered).toMatch(/\.webp$/);
  });

  it("only accepts this cloud's Classic Rose assets", () => {
    expect(isClassicRoseCloudinaryAsset(classicRoseMedia.variants.black.preview)).toBe(true);
    expect(isClassicRoseCloudinaryAsset("/images/themes/classic-rose/black/preview.webp")).toBe(false);
    expect(isClassicRoseCloudinaryAsset("https://res.cloudinary.com/other/image/upload/v1/ayawarta/production/themes/classic-rose/sample/couple.webp")).toBe(false);
  });
});

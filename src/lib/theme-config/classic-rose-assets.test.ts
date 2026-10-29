import { stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import classicRoseMedia from "@/config/classic-rose-cloudinary.json";
import { getClassicRoseThemeConfig } from "./classic-rose";

const variants = ["red", "green", "blue", "orange", "black", "white"];
const sourceRoot = path.join(process.cwd(), "assets/themes/classic-rose");

describe("Classic Rose delivery assets", () => {
  it.each(variants)("keeps the %s variant within the image budget", async (variant) => {
    const assets = getClassicRoseThemeConfig(variant).assets;
    const localNames = { background: "texture", flower: "bunga", photoFrame: "border-foto", bismillah: "bismillah" } as const;
    for (const [role, name] of Object.entries(localNames)) {
      const source = assets[role as keyof typeof localNames];
      const url = new URL(source);
      expect(url.protocol).toBe("https:");
      expect(url.hostname).toBe("res.cloudinary.com");
      expect(url.pathname).toMatch(new RegExp(`^/${classicRoseMedia.cloudName}/image/upload/v\\d+/ayawarta/production/themes/classic-rose/${variant}/${name}-[a-f0-9]{16}\\.webp$`));
      const file = path.join(sourceRoot, variant, `${name}.webp`);
      expect((await stat(file)).size).toBeLessThan(250 * 1024);
    }

    const texture = await sharp(path.join(sourceRoot, variant, "texture.webp")).metadata();
    expect(texture.width).toBe(1024);
    expect(texture.height).toBe(1024);
    expect(texture.hasAlpha).toBe(false);
  });

  it("gives every color variant its own corner ink", () => {
    const colors = variants.map((variant) => getClassicRoseThemeConfig(variant).colors.primary);
    expect(new Set(colors).size).toBe(variants.length);
  });

  it("keeps all five Cloudinary preview photos small at source", async () => {
    for (const name of ["couple", "walking", "details", "groom", "bride"]) {
      const file = path.join(sourceRoot, "sample", `${name}.webp`);
      expect((await stat(file)).size).toBeLessThan(180 * 1024);
      const url = new URL(classicRoseMedia.sample[name as keyof typeof classicRoseMedia.sample]);
      expect(url.hostname).toBe("res.cloudinary.com");
      expect(url.pathname).toMatch(new RegExp(`/classic-rose/sample/${name}-[a-f0-9]{16}\\.webp$`));
    }
  });
});

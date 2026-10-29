import { stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { getClassicRoseThemeConfig } from "./classic-rose";

const variants = ["red", "green", "blue", "orange", "black", "white"];
const publicRoot = path.join(process.cwd(), "public");

describe("Classic Rose delivery assets", () => {
  it.each(variants)("keeps the %s variant within the image budget", async (variant) => {
    const assets = getClassicRoseThemeConfig(variant).assets;
    for (const source of Object.values(assets)) {
      expect(source).toMatch(/\.webp$/);
      const file = path.join(publicRoot, source.slice(1));
      expect((await stat(file)).size).toBeLessThan(250 * 1024);
    }

    const texture = await sharp(path.join(publicRoot, assets.background.slice(1))).metadata();
    expect(texture.width).toBe(1024);
    expect(texture.height).toBe(1024);
    expect(texture.hasAlpha).toBe(false);
  });

  it("gives every color variant its own corner ink", () => {
    const colors = variants.map((variant) => getClassicRoseThemeConfig(variant).colors.primary);
    expect(new Set(colors).size).toBe(variants.length);
  });

  it("keeps all five local preview photos small", async () => {
    for (const name of ["couple", "walking", "details", "groom", "bride"]) {
      const file = path.join(publicRoot, `images/themes/classic-rose/sample/${name}.webp`);
      expect((await stat(file)).size).toBeLessThan(180 * 1024);
    }
  });
});

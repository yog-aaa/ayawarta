import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { sigerPrianganSample } from "./siger-priangan-sample";

describe("Siger Priangan illustrative sample", () => {
  it("is explicitly noninteractive and contains no borrowed production media", () => {
    expect(sigerPrianganSample.kind).toBe("illustrative-preview");
    expect(sigerPrianganSample.guestInteractions).toBe("read-only");
    expect(sigerPrianganSample.mediaStatus).toBe("illustrative-generated");
    expect(sigerPrianganSample.invitation.meta).toEqual({ theme: "siger-priangan", variant: "ivory" });
    expect(sigerPrianganSample.invitation.data.couple.heroImage).toBe("/themes/siger-priangan/sample/couple-portrait.webp");
    expect(sigerPrianganSample.invitation.data.couple.groom.photo).toBe("/themes/siger-priangan/sample/groom-portrait.webp");
    expect(sigerPrianganSample.invitation.data.couple.bride.photo).toBe("/themes/siger-priangan/sample/bride-portrait.webp");
    expect(sigerPrianganSample.invitation.data.gallery.items).toHaveLength(3);
    expect(sigerPrianganSample.invitation.data.prayer).toBe("");
    expect(sigerPrianganSample.invitation.data.greeting).toBe("Selamat datang dalam cerita kami.");
    expect(sigerPrianganSample.invitation.data.events[0]?.name).toBe("Upacara Pernikahan");
  });

  it("keeps every illustrative image within the mobile preview budget", async () => {
    const sample = sigerPrianganSample.invitation.data;
    const urls = new Set([
      sample.couple.heroImage,
      sample.couple.groom.photo,
      sample.couple.bride.photo,
      ...sample.gallery.items.map((item) => item.url),
    ]);
    let totalBytes = 0;
    for (const url of urls) {
      expect(url).toMatch(/^\/themes\/siger-priangan\/sample\/[\w-]+\.webp$/);
      const file = path.join(import.meta.dirname, "../../../public", url);
      const bytes = statSync(file).size;
      const metadata = await sharp(file).metadata();
      expect(metadata.format).toBe("webp");
      expect(Math.max(metadata.width ?? 0, metadata.height ?? 0)).toBeLessThanOrEqual(1100);
      expect(bytes).toBeLessThanOrEqual(110_000);
      totalBytes += bytes;
    }
    expect(totalBytes).toBeLessThanOrEqual(250_000);
  });

  it("keeps decorative runtime art lightweight and self-contained", () => {
    for (const name of ["paper-horizon.svg", "diamond-margin.svg"]) {
      const file = path.join(import.meta.dirname, "../../../public/themes/siger-priangan/scenes", name);
      const art = readFileSync(file, "utf8");
      expect(Buffer.byteLength(art)).toBeLessThanOrEqual(5_000);
      expect(art).toContain("<svg");
      expect(art).not.toMatch(/(?:href\s*=\s*["']https?:|url\(\s*["']?https?:)/i);
    }
  });
});

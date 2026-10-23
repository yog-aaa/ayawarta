import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DefaultLocalImageResolver,
  ensureDerivedHeroImage,
  LOCAL_DERIVED_IMAGE_DESCRIPTORS,
  validateLocalDerivedImageSource,
} from "./image-resolution";

describe("Image Resolution & Derived Hero Preparation Gate (CLOUD-05)", () => {
  let tempDir: string;
  const originalRelPath = "public/images/SAMPLE/FOTO - Couple.jpg";
  const derivedRelPath = ".media-migration/input/images/rika-fauzi-hero.jpg";

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ayawarta-derived-hero-test-"));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("validateLocalDerivedImageSource", () => {
    it("rejects path containing null bytes, backslashes, traversal, or drive prefix", () => {
      expect(validateLocalDerivedImageSource("bad\0file.jpg", { repoRoot: tempDir }).valid).toBe(
        false
      );
      expect(
        validateLocalDerivedImageSource("bad\\file.jpg", { repoRoot: tempDir }).valid
      ).toBe(false);
      expect(
        validateLocalDerivedImageSource("../outside/hero.jpg", { repoRoot: tempDir }).valid
      ).toBe(false);
      expect(
        validateLocalDerivedImageSource("C:/abs/hero.jpg", { repoRoot: tempDir }).valid
      ).toBe(false);
    });

    it("rejects unapproved filenames", () => {
      const res = validateLocalDerivedImageSource(".media-migration/input/images/unknown.jpg", {
        repoRoot: tempDir,
      });
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("not in approved derived image list");
    });

    it("rejects missing derived file", () => {
      const res = validateLocalDerivedImageSource(derivedRelPath, { repoRoot: tempDir });
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("does not exist");
    });

    it("rejects directory instead of regular file", () => {
      const dirPath = path.join(tempDir, derivedRelPath);
      fs.mkdirSync(dirPath, { recursive: true });

      const res = validateLocalDerivedImageSource(derivedRelPath, { repoRoot: tempDir });
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("not a regular file");
    });

    it("rejects file with mismatched byte size", () => {
      const filePath = path.join(tempDir, derivedRelPath);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, Buffer.alloc(100, 0x01)); // Wrong size (100 != 4,151,481)

      const res = validateLocalDerivedImageSource(derivedRelPath, { repoRoot: tempDir });
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("byte size mismatch");
    });

    it("rejects file with matching byte size but mismatched SHA-256 hash", () => {
      const desc = LOCAL_DERIVED_IMAGE_DESCRIPTORS[0];
      const filePath = path.join(tempDir, derivedRelPath);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      // Buffer of exact byte size but filled with zeroes (hash won't match)
      fs.writeFileSync(filePath, Buffer.alloc(desc.expectedByteSize, 0x00));

      const res = validateLocalDerivedImageSource(derivedRelPath, { repoRoot: tempDir });
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("SHA-256 hash mismatch");
    });

    it("accepts valid derived image matching exact descriptor", () => {
      // Copy real derived image from repository to tempDir
      const repoRealDerived = path.resolve(process.cwd(), derivedRelPath);
      const tempTarget = path.join(tempDir, derivedRelPath);
      fs.mkdirSync(path.dirname(tempTarget), { recursive: true });
      fs.copyFileSync(repoRealDerived, tempTarget);

      const res = validateLocalDerivedImageSource(derivedRelPath, { repoRoot: tempDir });
      expect(res.valid).toBe(true);
      expect(res.byteSize).toBe(4151481);
      expect(res.sha256).toBe(
        "9A268A4EEA90EAC96F4180D3AF0B121121DD4D32A17FD30484460A0752B3BC77"
      );
    });
  });

  describe("ensureDerivedHeroImage preparation gate", () => {
    it("fails closed when original JPEG source is missing", async () => {
      await expect(
        ensureDerivedHeroImage({ repoRoot: tempDir })
      ).rejects.toThrow(/Original source file not found/);
    });

    it("fails closed when original JPEG source hash is tampered", async () => {
      const tempOriginal = path.join(tempDir, originalRelPath);
      fs.mkdirSync(path.dirname(tempOriginal), { recursive: true });
      fs.writeFileSync(tempOriginal, Buffer.alloc(100, 0x42)); // Wrong size/hash

      await expect(
        ensureDerivedHeroImage({ repoRoot: tempDir })
      ).rejects.toThrow(/Original source byte size mismatch/);
    });

    it(
      "generates derived hero deterministically when missing and writes comparison artifact",
      async () => {
        // Set up real original in tempDir
        const realOriginal = path.resolve(process.cwd(), originalRelPath);
        const tempOriginal = path.join(tempDir, originalRelPath);
        fs.mkdirSync(path.dirname(tempOriginal), { recursive: true });
        fs.copyFileSync(realOriginal, tempOriginal);

        const result = await ensureDerivedHeroImage({
          repoRoot: tempDir,
          logger: { log: () => {}, warn: () => {}, error: () => {} },
        });

        expect(result.regenerated).toBe(true);

        // Verify derived file on disk
        const tempDerived = path.join(tempDir, derivedRelPath);
        expect(fs.existsSync(tempDerived)).toBe(true);
        const stat = fs.statSync(tempDerived);
        expect(stat.size).toBe(4151481);

        const hash = crypto
          .createHash("sha256")
          .update(fs.readFileSync(tempDerived))
          .digest("hex")
          .toUpperCase();
        expect(hash).toBe(
          "9A268A4EEA90EAC96F4180D3AF0B121121DD4D32A17FD30484460A0752B3BC77"
        );

        // Verify comparison artifact
        const artifactPath = path.join(
          tempDir,
          ".media-migration",
          "artifacts",
          "hero-comparison.json"
        );
        expect(fs.existsSync(artifactPath)).toBe(true);
        const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
        expect(artifact.objectiveMetrics.derivedByteSize).toBe(4151481);
        expect(artifact.objectiveMetrics.dimensionsPreserved).toBe(true);
        expect(artifact.reviewStatus.reviewerVerdict).toBe("accepted");
      },
      25_000
    );

    it("retains valid derived hero without rewrite", async () => {
      // Set up both real original and real derived in tempDir
      const realOriginal = path.resolve(process.cwd(), originalRelPath);
      const tempOriginal = path.join(tempDir, originalRelPath);
      fs.mkdirSync(path.dirname(tempOriginal), { recursive: true });
      fs.copyFileSync(realOriginal, tempOriginal);

      const realDerived = path.resolve(process.cwd(), derivedRelPath);
      const tempDerived = path.join(tempDir, derivedRelPath);
      fs.mkdirSync(path.dirname(tempDerived), { recursive: true });
      fs.copyFileSync(realDerived, tempDerived);

      const beforeMtime = fs.statSync(tempDerived).mtimeMs;

      const result = await ensureDerivedHeroImage({
        repoRoot: tempDir,
        logger: { log: () => {}, warn: () => {}, error: () => {} },
      });

      expect(result.regenerated).toBe(false);
      const afterMtime = fs.statSync(tempDerived).mtimeMs;
      expect(afterMtime).toBe(beforeMtime);
    });

    it(
      "detects tampered derived hero, regenerates it, and verifies match against descriptor",
      async () => {
        // Set up real original in tempDir
        const realOriginal = path.resolve(process.cwd(), originalRelPath);
        const tempOriginal = path.join(tempDir, originalRelPath);
        fs.mkdirSync(path.dirname(tempOriginal), { recursive: true });
        fs.copyFileSync(realOriginal, tempOriginal);

        // Seed a corrupted / tampered derived file
        const tempDerived = path.join(tempDir, derivedRelPath);
        fs.mkdirSync(path.dirname(tempDerived), { recursive: true });
        fs.writeFileSync(tempDerived, Buffer.from("corrupted tampered data 12345"));

        const warnings: string[] = [];
        const result = await ensureDerivedHeroImage({
          repoRoot: tempDir,
          logger: {
            log: () => {},
            warn: (msg: string) => warnings.push(msg),
            error: () => {},
          },
        });

        expect(result.regenerated).toBe(true);
        expect(warnings.some((w) => w.includes("tampered"))).toBe(true);

        // Now derived file is regenerated and matches exact descriptor
        const stat = fs.statSync(tempDerived);
        expect(stat.size).toBe(4151481);
        const hash = crypto
          .createHash("sha256")
          .update(fs.readFileSync(tempDerived))
          .digest("hex")
          .toUpperCase();
        expect(hash).toBe(
          "9A268A4EEA90EAC96F4180D3AF0B121121DD4D32A17FD30484460A0752B3BC77"
        );
      },
      25_000
    );
  });

  describe("DefaultLocalImageResolver", () => {
    it("throws when derived hero is missing on disk", () => {
      const resolver = new DefaultLocalImageResolver();
      expect(() => resolver.resolveDerivedHero("rika-fauzi", tempDir)).toThrow(
        /derived hero validation failed/
      );
    });

    it("returns verified descriptor when derived hero is valid on disk", () => {
      const realDerived = path.resolve(process.cwd(), derivedRelPath);
      const tempDerived = path.join(tempDir, derivedRelPath);
      fs.mkdirSync(path.dirname(tempDerived), { recursive: true });
      fs.copyFileSync(realDerived, tempDerived);

      const resolver = new DefaultLocalImageResolver();
      const resolved = resolver.resolveDerivedHero("rika-fauzi", tempDir);
      expect(resolved).not.toBeNull();
      expect(resolved?.byteSize).toBe(4151481);
      expect(resolved?.sha256).toBe(
        "9A268A4EEA90EAC96F4180D3AF0B121121DD4D32A17FD30484460A0752B3BC77"
      );
    });
  });
});

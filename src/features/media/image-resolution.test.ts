import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DefaultLocalImageResolver,
  ensureDerivedHeroImage,
  pathsEqual,
  type LocalImageDescriptor,
  validateLocalDerivedImageSource,
} from "./image-resolution";
import { prepareImage } from "./image-processor";

describe("Image Resolution & Derived Hero Preparation Gate (Hermetic CLOUD-05)", () => {
  let tempDir: string;
  let testDesc: LocalImageDescriptor;
  let syntheticOriginalBuffer: Buffer;
  let syntheticOriginalHash: string;
  let syntheticOriginalSize: number;

  const originalRelPath = "public/images/test/test-hero-original.jpg";
  const derivedRelPath = ".media-migration/input/images/rika-fauzi-hero.jpg";

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ayawarta-derived-hero-hermetic-"));

    // Generate small synthetic JPEG fixture in-memory using Sharp (100x100)
    syntheticOriginalBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 128, g: 64, b: 32 },
      },
    })
      .jpeg({ quality: 90 })
      .toBuffer();

    syntheticOriginalSize = syntheticOriginalBuffer.length;
    syntheticOriginalHash = crypto
      .createHash("sha256")
      .update(syntheticOriginalBuffer)
      .digest("hex")
      .toUpperCase();

    // Compute expected prepared output using production prepareImage logic
    const prepared = await prepareImage(syntheticOriginalBuffer, {
      targetMaxBytes: 9_500_000,
    });

    testDesc = {
      slug: "rika-fauzi",
      relativeSourcePath: derivedRelPath,
      fileName: "rika-fauzi-hero.jpg",
      expectedByteSize: prepared.byteSize,
      expectedWidth: prepared.width,
      expectedHeight: prepared.height,
      expectedSha256: prepared.sha256,
      targetPublicId: "ayawarta/production/invitations/rika-fauzi/couple/hero",
      originalSourcePath: originalRelPath,
    };
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  interface SimulatedLink {
    linkPath: string;
    targetPath: string;
  }

  function withSimulatedDirectoryLink<T>(
    link: SimulatedLink,
    fn: () => Promise<T> | T
  ): Promise<T> {
    const originalLstat = fs.lstatSync.bind(fs);
    const originalRealpath = fs.realpathSync.bind(fs);

    const normLink = path.normalize(path.resolve(link.linkPath));
    const normTarget = path.normalize(path.resolve(link.targetPath));

    const spyLstat = vi.spyOn(fs, "lstatSync").mockImplementation((...args: Parameters<typeof fs.lstatSync>) => {
      const [p] = args;
      const currentNorm = path.normalize(path.resolve(String(p)));
      if (pathsEqual(currentNorm, normLink)) {
        return {
          isSymbolicLink: () => true,
          isDirectory: () => false,
          isFile: () => false,
        } as fs.Stats;
      }
      return originalLstat(...args);
    });

    const spyRealpath = vi.spyOn(fs, "realpathSync").mockImplementation((...args: Parameters<typeof fs.realpathSync>) => {
      const [p] = args;
      const currentNorm = path.normalize(path.resolve(String(p)));
      if (pathsEqual(currentNorm, normLink)) {
        return normTarget;
      }
      return originalRealpath(...args);
    });

    return Promise.resolve()
      .then(() => fn())
      .finally(() => {
        spyLstat.mockRestore();
        spyRealpath.mockRestore();
      });
  }

  describe("validateLocalDerivedImageSource", () => {
    it("rejects path containing null bytes, backslashes, traversal, or drive prefix", () => {
      expect(
        validateLocalDerivedImageSource("bad\0file.jpg", { repoRoot: tempDir }).valid
      ).toBe(false);
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
      fs.writeFileSync(filePath, Buffer.alloc(100, 0x01));

      const res = validateLocalDerivedImageSource(derivedRelPath, {
        repoRoot: tempDir,
        descriptor: testDesc,
      });
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("byte size mismatch");
    });

    it("rejects file with matching byte size but mismatched SHA-256 hash", () => {
      const filePath = path.join(tempDir, derivedRelPath);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, Buffer.alloc(testDesc.expectedByteSize, 0x00));

      const res = validateLocalDerivedImageSource(derivedRelPath, {
        repoRoot: tempDir,
        descriptor: testDesc,
      });
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("SHA-256 hash mismatch");
    });

    it("accepts valid derived image matching exact descriptor", () => {
      const filePath = path.join(tempDir, derivedRelPath);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      // Generate synthetic buffer that matches testDesc
      const prepared = prepareImage(syntheticOriginalBuffer, { targetMaxBytes: 9_500_000 });
      return prepared.then((p) => {
        fs.writeFileSync(filePath, p.buffer);

        const res = validateLocalDerivedImageSource(derivedRelPath, {
          repoRoot: tempDir,
          descriptor: testDesc,
        });
        expect(res.valid).toBe(true);
        expect(res.byteSize).toBe(testDesc.expectedByteSize);
        expect(res.sha256).toBe(testDesc.expectedSha256);
      });
    });

    it("rejects unapproved filenames even when descriptor override is supplied", () => {
      const res = validateLocalDerivedImageSource(
        ".media-migration/input/images/unapproved-name.jpg",
        {
          repoRoot: tempDir,
          descriptor: { ...testDesc, fileName: "unapproved-name.jpg" },
        }
      );
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("not in approved derived image list");
    });

    it("rejects derived image path outside approved root even with approved filename", () => {
      const outsideApproved = "public/images/SAMPLE/rika-fauzi-hero.jpg";
      const fullPath = path.join(tempDir, outsideApproved);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, Buffer.alloc(testDesc.expectedByteSize, 0x00));

      const res = validateLocalDerivedImageSource(outsideApproved, {
        repoRoot: tempDir,
        descriptor: testDesc,
      });
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("escapes approved root");
    });

    it("rejects symbolic links targeting derived images", () => {
      const originalLstat = fs.lstatSync.bind(fs);
      const spy = vi.spyOn(fs, "lstatSync").mockImplementation((...args: Parameters<typeof fs.lstatSync>) => {
        const [p] = args;
        if (String(p).includes("rika-fauzi-hero.jpg")) {
          return { isSymbolicLink: () => true, isFile: () => true } as fs.Stats;
        }
        return originalLstat(...args);
      });

      try {
        const res = validateLocalDerivedImageSource(derivedRelPath, {
          repoRoot: tempDir,
          descriptor: testDesc,
        });
        expect(res.valid).toBe(false);
        expect(res.reason).toContain("cannot be a symbolic link");
      } finally {
        spy.mockRestore();
      }
    });

    it("rejects derived image when an ancestor directory is a symbolic link or junction", async () => {
      const insideOtherDir = path.join(tempDir, "public/images/ancestor-trap");
      fs.mkdirSync(insideOtherDir, { recursive: true });

      const linkPath = path.join(tempDir, ".media-migration", "input");
      fs.mkdirSync(linkPath, { recursive: true });

      await withSimulatedDirectoryLink({ linkPath, targetPath: insideOtherDir }, () => {
        const res = validateLocalDerivedImageSource(derivedRelPath, {
          repoRoot: tempDir,
          descriptor: testDesc,
        });
        expect(res.valid).toBe(false);
        expect(res.reason).toMatch(/symbolic link or junction/i);
      });
    });
  });

  describe("ensureDerivedHeroImage preparation gate", () => {
    it("fails closed when original JPEG source is missing", async () => {
      await expect(
        ensureDerivedHeroImage({
          repoRoot: tempDir,
          descriptor: testDesc,
          expectedOriginalSize: syntheticOriginalSize,
          expectedOriginalSha256: syntheticOriginalHash,
        })
      ).rejects.toThrow(/Original source file not found/);
    });

    it("fails closed when original JPEG source hash is tampered", async () => {
      const tempOriginal = path.join(tempDir, originalRelPath);
      fs.mkdirSync(path.dirname(tempOriginal), { recursive: true });
      fs.writeFileSync(tempOriginal, Buffer.alloc(100, 0x42));

      await expect(
        ensureDerivedHeroImage({
          repoRoot: tempDir,
          descriptor: testDesc,
          expectedOriginalSize: syntheticOriginalSize,
          expectedOriginalSha256: syntheticOriginalHash,
        })
      ).rejects.toThrow(/Original source byte size mismatch/);
    });

    it("generates derived hero deterministically when missing and writes comparison artifact", async () => {
      const tempOriginal = path.join(tempDir, originalRelPath);
      fs.mkdirSync(path.dirname(tempOriginal), { recursive: true });
      fs.writeFileSync(tempOriginal, syntheticOriginalBuffer);

      const result = await ensureDerivedHeroImage({
        repoRoot: tempDir,
        descriptor: testDesc,
        expectedOriginalSize: syntheticOriginalSize,
        expectedOriginalSha256: syntheticOriginalHash,
        logger: { log: () => {}, warn: () => {}, error: () => {} },
      });

      expect(result.regenerated).toBe(true);

      const tempDerived = path.join(tempDir, derivedRelPath);
      expect(fs.existsSync(tempDerived)).toBe(true);
      const stat = fs.statSync(tempDerived);
      expect(stat.size).toBe(testDesc.expectedByteSize);

      const hash = crypto
        .createHash("sha256")
        .update(fs.readFileSync(tempDerived))
        .digest("hex")
        .toUpperCase();
      expect(hash).toBe(testDesc.expectedSha256);

      const artifactPath = path.join(
        tempDir,
        ".media-migration",
        "artifacts",
        "hero-comparison.json"
      );
      expect(fs.existsSync(artifactPath)).toBe(true);
      const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
      expect(artifact.objectiveMetrics.derivedByteSize).toBe(testDesc.expectedByteSize);
      expect(artifact.objectiveMetrics.dimensionsPreserved).toBe(true);
      expect(artifact.reviewStatus.reviewerVerdict).toBe("accepted");
    });

    it("retains valid derived hero without rewrite", async () => {
      const tempOriginal = path.join(tempDir, originalRelPath);
      fs.mkdirSync(path.dirname(tempOriginal), { recursive: true });
      fs.writeFileSync(tempOriginal, syntheticOriginalBuffer);

      const prepared = await prepareImage(syntheticOriginalBuffer, { targetMaxBytes: 9_500_000 });
      const tempDerived = path.join(tempDir, derivedRelPath);
      fs.mkdirSync(path.dirname(tempDerived), { recursive: true });
      fs.writeFileSync(tempDerived, prepared.buffer);

      const beforeMtime = fs.statSync(tempDerived).mtimeMs;

      const result = await ensureDerivedHeroImage({
        repoRoot: tempDir,
        descriptor: testDesc,
        expectedOriginalSize: syntheticOriginalSize,
        expectedOriginalSha256: syntheticOriginalHash,
        logger: { log: () => {}, warn: () => {}, error: () => {} },
      });

      expect(result.regenerated).toBe(false);
      const afterMtime = fs.statSync(tempDerived).mtimeMs;
      expect(afterMtime).toBe(beforeMtime);
    });

    it("detects tampered derived hero, regenerates it, and verifies match against descriptor", async () => {
      const tempOriginal = path.join(tempDir, originalRelPath);
      fs.mkdirSync(path.dirname(tempOriginal), { recursive: true });
      fs.writeFileSync(tempOriginal, syntheticOriginalBuffer);

      // Tampered derived file
      const tempDerived = path.join(tempDir, derivedRelPath);
      fs.mkdirSync(path.dirname(tempDerived), { recursive: true });
      fs.writeFileSync(tempDerived, Buffer.from("corrupted tampered data 12345"));

      const warnings: string[] = [];
      const result = await ensureDerivedHeroImage({
        repoRoot: tempDir,
        descriptor: testDesc,
        expectedOriginalSize: syntheticOriginalSize,
        expectedOriginalSha256: syntheticOriginalHash,
        logger: {
          log: () => {},
          warn: (msg: string) => warnings.push(msg),
          error: () => {},
        },
      });

      expect(result.regenerated).toBe(true);
      expect(warnings.some((w) => w.includes("tampered"))).toBe(true);

      const stat = fs.statSync(tempDerived);
      expect(stat.size).toBe(testDesc.expectedByteSize);
      const hash = crypto
        .createHash("sha256")
        .update(fs.readFileSync(tempDerived))
        .digest("hex")
        .toUpperCase();
      expect(hash).toBe(testDesc.expectedSha256);
    });

    it("strictly uses pinned descriptor and pinned hashes in production default path without descriptor override", async () => {
      // Calling without options.descriptor strictly targets LOCAL_DERIVED_IMAGE_DESCRIPTORS[0]
      // and pinned ORIGINAL_HERO_EXPECTED_SIZE / SHA256 even if overrides are attempted in other fields
      await expect(
        ensureDerivedHeroImage({
          repoRoot: tempDir,
          expectedOriginalSize: 1234,
          expectedOriginalSha256: "DUMMYHASH",
        })
      ).rejects.toThrow(/Original source file not found at: 'public\/images\/SAMPLE\/FOTO - Couple.jpg'/);
    });

    it("rejects originalSourcePath with traversal (..) without reading files outside root", async () => {
      const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), "ayawarta-outside-orig-"));
      const canaryFile = path.join(outsideDir, "canary.txt");
      fs.writeFileSync(canaryFile, "CONFIDENTIAL_PAYLOAD_CANARY");
      const initialMtime = fs.statSync(canaryFile).mtimeMs;

      try {
        await expect(
          ensureDerivedHeroImage({
            repoRoot: tempDir,
            descriptor: {
              ...testDesc,
              originalSourcePath: "../../outside-secret.jpg",
            },
          })
        ).rejects.toThrow(/cannot contain traversal/i);

        // Prove no file outside root was modified or read
        expect(fs.readFileSync(canaryFile, "utf-8")).toBe("CONFIDENTIAL_PAYLOAD_CANARY");
        expect(fs.statSync(canaryFile).mtimeMs).toBe(initialMtime);
      } finally {
        fs.rmSync(outsideDir, { recursive: true, force: true });
      }
    });

    it("rejects originalSourcePath with absolute, drive-rooted, UNC, backslash, or null byte", async () => {
      await expect(
        ensureDerivedHeroImage({
          repoRoot: tempDir,
          descriptor: { ...testDesc, originalSourcePath: "/etc/passwd" },
        })
      ).rejects.toThrow(/cannot be absolute, drive-rooted, or UNC/i);

      await expect(
        ensureDerivedHeroImage({
          repoRoot: tempDir,
          descriptor: { ...testDesc, originalSourcePath: "C:/outside/secret.jpg" },
        })
      ).rejects.toThrow(/cannot be absolute, drive-rooted, or UNC/i);

      await expect(
        ensureDerivedHeroImage({
          repoRoot: tempDir,
          descriptor: { ...testDesc, originalSourcePath: "public\\images\\photo.jpg" },
        })
      ).rejects.toThrow(/cannot contain backslashes/i);

      await expect(
        ensureDerivedHeroImage({
          repoRoot: tempDir,
          descriptor: { ...testDesc, originalSourcePath: "public/images/test\0.jpg" },
        })
      ).rejects.toThrow(/cannot contain null bytes/i);
    });

    it("rejects originalSourcePath when it is a symbolic link", async () => {
      const tempOriginal = path.join(tempDir, originalRelPath);
      fs.mkdirSync(path.dirname(tempOriginal), { recursive: true });
      fs.writeFileSync(tempOriginal, syntheticOriginalBuffer);

      const originalLstat = fs.lstatSync.bind(fs);
      const spy = vi.spyOn(fs, "lstatSync").mockImplementation((...args: Parameters<typeof fs.lstatSync>) => {
        const [p] = args;
        if (String(p).includes("test-hero-original.jpg")) {
          return { isSymbolicLink: () => true, isFile: () => true } as fs.Stats;
        }
        return originalLstat(...args);
      });

      try {
        await expect(
          ensureDerivedHeroImage({
            repoRoot: tempDir,
            descriptor: testDesc,
            expectedOriginalSize: syntheticOriginalSize,
            expectedOriginalSha256: syntheticOriginalHash,
          })
        ).rejects.toThrow(/cannot be a symbolic link/i);
      } finally {
        spy.mockRestore();
      }
    });

    it("rejects relativeSourcePath with traversal (..) without writing files outside root", async () => {
      const tempOriginal = path.join(tempDir, originalRelPath);
      fs.mkdirSync(path.dirname(tempOriginal), { recursive: true });
      fs.writeFileSync(tempOriginal, syntheticOriginalBuffer);

      const outsideFile = path.join(tempDir, "evil.jpg");

      await expect(
        ensureDerivedHeroImage({
          repoRoot: tempDir,
          descriptor: {
            ...testDesc,
            relativeSourcePath: ".media-migration/input/images/../../evil.jpg",
          },
          expectedOriginalSize: syntheticOriginalSize,
          expectedOriginalSha256: syntheticOriginalHash,
        })
      ).rejects.toThrow(/cannot contain traversal/i);

      // Verify no write occurred
      expect(fs.existsSync(outsideFile)).toBe(false);
    });

    it("rejects relativeSourcePath located outside approved derived image root without writing files", async () => {
      const tempOriginal = path.join(tempDir, originalRelPath);
      fs.mkdirSync(path.dirname(tempOriginal), { recursive: true });
      fs.writeFileSync(tempOriginal, syntheticOriginalBuffer);

      const outsidePath = "public/images/SAMPLE/rika-fauzi-hero.jpg";
      const fullOutsidePath = path.join(tempDir, outsidePath);

      await expect(
        ensureDerivedHeroImage({
          repoRoot: tempDir,
          descriptor: {
            ...testDesc,
            relativeSourcePath: outsidePath,
          },
          expectedOriginalSize: syntheticOriginalSize,
          expectedOriginalSha256: syntheticOriginalHash,
        })
      ).rejects.toThrow(/must be located within approved derived root/i);

      expect(fs.existsSync(fullOutsidePath)).toBe(false);
    });

    it("rejects relativeSourcePath with unapproved filename without writing files", async () => {
      const tempOriginal = path.join(tempDir, originalRelPath);
      fs.mkdirSync(path.dirname(tempOriginal), { recursive: true });
      fs.writeFileSync(tempOriginal, syntheticOriginalBuffer);

      const unapprovedPath = ".media-migration/input/images/unapproved-name.jpg";
      const fullUnapproved = path.join(tempDir, unapprovedPath);

      await expect(
        ensureDerivedHeroImage({
          repoRoot: tempDir,
          descriptor: {
            ...testDesc,
            relativeSourcePath: unapprovedPath,
            fileName: "unapproved-name.jpg",
          },
          expectedOriginalSize: syntheticOriginalSize,
          expectedOriginalSha256: syntheticOriginalHash,
        })
      ).rejects.toThrow(/not in approved derived image list/i);

      expect(fs.existsSync(fullUnapproved)).toBe(false);
    });

    it("rejects relativeSourcePath with absolute, drive-rooted, backslash, or null byte without writing", async () => {
      const tempOriginal = path.join(tempDir, originalRelPath);
      fs.mkdirSync(path.dirname(tempOriginal), { recursive: true });
      fs.writeFileSync(tempOriginal, syntheticOriginalBuffer);

      await expect(
        ensureDerivedHeroImage({
          repoRoot: tempDir,
          descriptor: {
            ...testDesc,
            relativeSourcePath: "/tmp/rika-fauzi-hero.jpg",
          },
          expectedOriginalSize: syntheticOriginalSize,
          expectedOriginalSha256: syntheticOriginalHash,
        })
      ).rejects.toThrow(/cannot be absolute, drive-rooted, or UNC/i);

      await expect(
        ensureDerivedHeroImage({
          repoRoot: tempDir,
          descriptor: {
            ...testDesc,
            relativeSourcePath: "C:/tmp/rika-fauzi-hero.jpg",
          },
          expectedOriginalSize: syntheticOriginalSize,
          expectedOriginalSha256: syntheticOriginalHash,
        })
      ).rejects.toThrow(/cannot be absolute, drive-rooted, or UNC/i);

      await expect(
        ensureDerivedHeroImage({
          repoRoot: tempDir,
          descriptor: {
            ...testDesc,
            relativeSourcePath: ".media-migration\\input\\images\\rika-fauzi-hero.jpg",
          },
          expectedOriginalSize: syntheticOriginalSize,
          expectedOriginalSha256: syntheticOriginalHash,
        })
      ).rejects.toThrow(/cannot contain backslashes/i);

      await expect(
        ensureDerivedHeroImage({
          repoRoot: tempDir,
          descriptor: {
            ...testDesc,
            relativeSourcePath: ".media-migration/input/images/test\0hero.jpg",
          },
          expectedOriginalSize: syntheticOriginalSize,
          expectedOriginalSha256: syntheticOriginalHash,
        })
      ).rejects.toThrow(/cannot contain null bytes/i);
    });

    it("rejects relativeSourcePath when output path is a symbolic link before writing", async () => {
      const tempOriginal = path.join(tempDir, originalRelPath);
      fs.mkdirSync(path.dirname(tempOriginal), { recursive: true });
      fs.writeFileSync(tempOriginal, syntheticOriginalBuffer);

      const originalLstat = fs.lstatSync.bind(fs);
      const spy = vi.spyOn(fs, "lstatSync").mockImplementation((...args: Parameters<typeof fs.lstatSync>) => {
        const [p] = args;
        if (String(p).includes("rika-fauzi-hero.jpg")) {
          return { isSymbolicLink: () => true, isFile: () => true } as fs.Stats;
        }
        return originalLstat(...args);
      });

      try {
        await expect(
          ensureDerivedHeroImage({
            repoRoot: tempDir,
            descriptor: testDesc,
            expectedOriginalSize: syntheticOriginalSize,
            expectedOriginalSha256: syntheticOriginalHash,
          })
        ).rejects.toThrow(/cannot be a symbolic link/i);
      } finally {
        spy.mockRestore();
      }
    });

    it("rejects output when parent directory points outside repo and creates no files or directories at target", async () => {
      const tempOriginal = path.join(tempDir, originalRelPath);
      fs.mkdirSync(path.dirname(tempOriginal), { recursive: true });
      fs.writeFileSync(tempOriginal, syntheticOriginalBuffer);

      const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), "ayawarta-outside-parent-"));
      const linkPath = path.join(tempDir, ".media-migration");
      fs.mkdirSync(linkPath, { recursive: true });

      const mkdirSpy = vi.spyOn(fs, "mkdirSync");
      const writeSpy = vi.spyOn(fs, "writeFileSync");

      try {
        await withSimulatedDirectoryLink({ linkPath, targetPath: outsideDir }, async () => {
          await expect(
            ensureDerivedHeroImage({
              repoRoot: tempDir,
              descriptor: testDesc,
              expectedOriginalSize: syntheticOriginalSize,
              expectedOriginalSha256: syntheticOriginalHash,
            })
          ).rejects.toThrow(/symbolic link or junction/i);
        });

        // Prove no files or subdirectories were created at the target
        expect(fs.readdirSync(outsideDir)).toHaveLength(0);
        expect(mkdirSpy.mock.calls.some(([p]) => String(p).includes("ayawarta-outside-parent"))).toBe(false);
        expect(writeSpy.mock.calls.some(([p]) => String(p).includes("ayawarta-outside-parent"))).toBe(false);
      } finally {
        mkdirSpy.mockRestore();
        writeSpy.mockRestore();
        fs.rmSync(outsideDir, { recursive: true, force: true });
      }
    });

    it("rejects output when parent directory points to another location inside repo and creates no files or directories at target", async () => {
      const tempOriginal = path.join(tempDir, originalRelPath);
      fs.mkdirSync(path.dirname(tempOriginal), { recursive: true });
      fs.writeFileSync(tempOriginal, syntheticOriginalBuffer);

      const insideOtherDir = path.join(tempDir, "public/images/internal-trap");
      fs.mkdirSync(insideOtherDir, { recursive: true });

      const mediaMigrationDir = path.join(tempDir, ".media-migration");
      fs.mkdirSync(mediaMigrationDir, { recursive: true });
      const linkPath = path.join(mediaMigrationDir, "input");
      fs.mkdirSync(linkPath, { recursive: true });

      const mkdirSpy = vi.spyOn(fs, "mkdirSync");
      const writeSpy = vi.spyOn(fs, "writeFileSync");

      try {
        await withSimulatedDirectoryLink({ linkPath, targetPath: insideOtherDir }, async () => {
          await expect(
            ensureDerivedHeroImage({
              repoRoot: tempDir,
              descriptor: testDesc,
              expectedOriginalSize: syntheticOriginalSize,
              expectedOriginalSha256: syntheticOriginalHash,
            })
          ).rejects.toThrow(/symbolic link or junction/i);
        });

        // Prove no files or subdirectories (e.g. images) were created at the target
        expect(fs.readdirSync(insideOtherDir)).toHaveLength(0);
        expect(mkdirSpy.mock.calls.some(([p]) => String(p).includes("internal-trap"))).toBe(false);
        expect(writeSpy.mock.calls.some(([p]) => String(p).includes("internal-trap"))).toBe(false);
      } finally {
        mkdirSpy.mockRestore();
        writeSpy.mockRestore();
      }
    });

    it("rejects artifact generation when artifact directory points outside repo and creates no files at target", async () => {
      const tempOriginal = path.join(tempDir, originalRelPath);
      fs.mkdirSync(path.dirname(tempOriginal), { recursive: true });
      fs.writeFileSync(tempOriginal, syntheticOriginalBuffer);

      // Pre-create output directory so it proceeds towards artifact step
      const outputDir = path.join(tempDir, ".media-migration", "input", "images");
      fs.mkdirSync(outputDir, { recursive: true });

      const outsideArtifactDir = fs.mkdtempSync(path.join(os.tmpdir(), "ayawarta-outside-art-"));
      const artifactLink = path.join(tempDir, ".media-migration", "artifacts");
      fs.mkdirSync(artifactLink, { recursive: true });

      const writeSpy = vi.spyOn(fs, "writeFileSync");

      try {
        await withSimulatedDirectoryLink({ linkPath: artifactLink, targetPath: outsideArtifactDir }, async () => {
          await expect(
            ensureDerivedHeroImage({
              repoRoot: tempDir,
              descriptor: testDesc,
              expectedOriginalSize: syntheticOriginalSize,
              expectedOriginalSha256: syntheticOriginalHash,
            })
          ).rejects.toThrow(/symbolic link or junction/i);
        });

        // Prove no comparison artifact file was created at the outside target
        expect(fs.readdirSync(outsideArtifactDir)).toHaveLength(0);
        expect(writeSpy.mock.calls.some(([p]) => String(p).includes("ayawarta-outside-art"))).toBe(false);
      } finally {
        writeSpy.mockRestore();
        fs.rmSync(outsideArtifactDir, { recursive: true, force: true });
      }
    });

    it("rejects artifact generation when artifact directory points inside repo and creates no files at target", async () => {
      const tempOriginal = path.join(tempDir, originalRelPath);
      fs.mkdirSync(path.dirname(tempOriginal), { recursive: true });
      fs.writeFileSync(tempOriginal, syntheticOriginalBuffer);

      const outputDir = path.join(tempDir, ".media-migration", "input", "images");
      fs.mkdirSync(outputDir, { recursive: true });

      const insideOtherDir = path.join(tempDir, "public/images/internal-art-trap");
      fs.mkdirSync(insideOtherDir, { recursive: true });

      const artifactLink = path.join(tempDir, ".media-migration", "artifacts");
      fs.mkdirSync(artifactLink, { recursive: true });

      const writeSpy = vi.spyOn(fs, "writeFileSync");

      try {
        await withSimulatedDirectoryLink({ linkPath: artifactLink, targetPath: insideOtherDir }, async () => {
          await expect(
            ensureDerivedHeroImage({
              repoRoot: tempDir,
              descriptor: testDesc,
              expectedOriginalSize: syntheticOriginalSize,
              expectedOriginalSha256: syntheticOriginalHash,
            })
          ).rejects.toThrow(/symbolic link or junction/i);
        });

        // Prove no comparison artifact file was created inside the inside target
        expect(fs.readdirSync(insideOtherDir)).toHaveLength(0);
        expect(writeSpy.mock.calls.some(([p]) => String(p).includes("internal-art-trap"))).toBe(false);
      } finally {
        writeSpy.mockRestore();
      }
    });
  });

  describe("DefaultLocalImageResolver", () => {
    it("throws when derived hero is missing on disk", () => {
      const resolver = new DefaultLocalImageResolver({ descriptor: testDesc });
      expect(() => resolver.resolveDerivedHero("rika-fauzi", tempDir)).toThrow(
        /derived hero validation failed/
      );
    });

    it("returns verified descriptor when derived hero is valid on disk", async () => {
      const prepared = await prepareImage(syntheticOriginalBuffer, { targetMaxBytes: 9_500_000 });
      const tempDerived = path.join(tempDir, derivedRelPath);
      fs.mkdirSync(path.dirname(tempDerived), { recursive: true });
      fs.writeFileSync(tempDerived, prepared.buffer);

      const resolver = new DefaultLocalImageResolver({ descriptor: testDesc });
      const resolved = resolver.resolveDerivedHero("rika-fauzi", tempDir);
      expect(resolved).not.toBeNull();
      expect(resolved?.byteSize).toBe(testDesc.expectedByteSize);
      expect(resolved?.sha256).toBe(testDesc.expectedSha256);
    });
  });
});

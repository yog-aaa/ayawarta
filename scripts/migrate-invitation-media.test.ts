import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runMigrationCli } from "./migrate-invitation-media";
import { verifyOfflineDryRunReport } from "./verify-invitation-media";
import {
  buildDryRunReport,
  generateMediaManifest,
} from "./data/invitation-media-manifest";
import {
  createFixtureAudioResolver,
  createFixtureAudioValidator,
} from "@/features/media/testing/fixture-audio";
import {
  createFixtureImageResolver,
  createFixtureImageValidator,
} from "@/features/media/testing/fixture-image";

describe("migrate-invitation-media CLI and verify-invitation-media CLI", () => {
  let tempDir: string;
  const repoRoot = process.cwd();
  const fixtureAudioResolver = createFixtureAudioResolver();
  const fixtureAudioValidator = createFixtureAudioValidator();
  const fixtureImageResolver = createFixtureImageResolver();
  const fixtureImageValidator = createFixtureImageValidator();

  function verifyReport(reportPath: string) {
    return verifyOfflineDryRunReport({
      reportPath,
      repoRoot,
      audioValidator: fixtureAudioValidator,
      imageValidator: fixtureImageValidator,
    });
  }

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ayawarta-migration-test-"));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("CLI guards and options (MEDIA-04)", () => {
    it("guards live execution against missing credentials or old account", async () => {
      const logs: string[] = [];
      const errors: string[] = [];
      const mockLogger = {
        log: (msg: string) => logs.push(msg),
        warn: (msg: string) => logs.push(msg),
        error: (msg: string) => errors.push(msg),
      };

      // 1. Target cloud name is old account doig3gwek
      const code1 = await runMigrationCli(["--execute"], {
        cloudName: "doig3gwek",
        apiKey: "test-key",
        apiSecret: "test-secret",
        logger: mockLogger,
        repoRoot,
      });
      expect(code1).toBe(1);
      expect(errors.some((e) => e.includes("cannot be old account"))).toBe(true);

      // 2. Missing credentials
      const code2 = await runMigrationCli(["--execute"], {
        cloudName: "new-cloud",
        apiKey: "",
        apiSecret: "",
        logger: mockLogger,
        repoRoot,
      });
      expect(code2).toBe(1);
      expect(errors.some((e) => e.includes("must be configured"))).toBe(true);
    });

    it("rejects CLI output-dir with absolute paths", async () => {
      const errors: string[] = [];
      const mockLogger = {
        log: () => {},
        warn: () => {},
        error: (msg: string) => errors.push(msg),
      };

      const code = await runMigrationCli(["--output-dir", "C:/Windows"], {
        logger: mockLogger,
        repoRoot,
      });
      expect(code).toBe(1);
      expect(errors.some((e) => e.includes("must be relative"))).toBe(true);
    });

    it("rejects CLI output-dir with traversal (..)", async () => {
      const errors: string[] = [];
      const mockLogger = {
        log: () => {},
        warn: () => {},
        error: (msg: string) => errors.push(msg),
      };

      const code = await runMigrationCli(["--output-dir", "../outside"], {
        logger: mockLogger,
        repoRoot,
      });
      expect(code).toBe(1);
      expect(errors.some((e) => e.includes("cannot contain traversal"))).toBe(true);
    });

    it("rejects CLI output-dir with sibling-prefix (.media-migration-sibling)", async () => {
      const errors: string[] = [];
      const mockLogger = {
        log: () => {},
        warn: () => {},
        error: (msg: string) => errors.push(msg),
      };

      const code = await runMigrationCli(
        ["--output-dir", ".media-migration-sibling"],
        {
          logger: mockLogger,
          repoRoot,
        }
      );
      expect(code).toBe(1);
      expect(errors.some((e) => e.includes("must be confined to"))).toBe(true);
    });

    it("rejects CLI output-dir outside .media-migration (e.g. src/)", async () => {
      const errors: string[] = [];
      const mockLogger = {
        log: () => {},
        warn: () => {},
        error: (msg: string) => errors.push(msg),
      };

      const code = await runMigrationCli(["--output-dir", "src"], {
        logger: mockLogger,
        repoRoot,
      });
      expect(code).toBe(1);
      expect(errors.some((e) => e.includes("must be confined to"))).toBe(true);
    });
  });

  describe("dry-run report generation and verification baseline", () => {
    it("successfully runs dry-run and writes valid report file", async () => {
      const logs: string[] = [];
      const mockLogger = {
        log: (msg: string) => logs.push(msg),
        warn: (msg: string) => logs.push(msg),
        error: (msg: string) => logs.push(msg),
      };

      const code = await runMigrationCli(
        ["--dry-run"],
        {
          logger: mockLogger,
          repoRoot,
          outputDir: tempDir,
          audioResolver: fixtureAudioResolver,
          imageResolver: fixtureImageResolver,
        }
      );

      expect(code).toBe(0);

      const reportPath = path.join(tempDir, "manifest-dry-run-report.json");
      expect(fs.existsSync(reportPath)).toBe(true);

      const reportJson = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
      expect(reportJson.mode).toBe("dry-run");
      expect(reportJson.manifest.summary.totalPhysicalAssets).toBe(31);
      expect(reportJson.manifest.summary.totalLogicalUsages).toBe(37);
      expect(reportJson.manifest.summary.totalSlugs).toBe(4);
      expect(reportJson.manifest.summary.totalLocalAssets).toBe(15);
      expect(reportJson.manifest.summary.totalRemoteAssets).toBe(16);
      expect(reportJson.manifest.summary.totalAudio).toBe(4);
      expect(reportJson.manifest.summary.unresolvedExternalMusicCount).toBe(0);

      const verifyResult = verifyReport(reportPath);

      expect(verifyResult.passed).toBe(true);
      expect(verifyResult.errors).toEqual([]);
      expect(verifyResult.verifiedAssetsCount).toBe(31);
      expect(verifyResult.verifiedUsagesCount).toBe(37);
      expect(verifyResult.verifiedHeroesCount).toBe(4);
      expect(verifyResult.verifiedLocalFilesCount).toBe(15);
      expect(verifyResult.verifiedRemoteUrlsCount).toBe(16);
    });

    it("produces identical byte-for-byte report and matching SHA-256 hash across two default runs (MEDIA-03A)", async () => {
      const dir1 = path.join(tempDir, "run1");
      const dir2 = path.join(tempDir, "run2");
      const mockLogger = { log: () => {}, warn: () => {}, error: () => {} };

      const code1 = await runMigrationCli(["--dry-run"], {
        logger: mockLogger,
        repoRoot,
        outputDir: dir1,
        audioResolver: fixtureAudioResolver,
        imageResolver: fixtureImageResolver,
      });
      const code2 = await runMigrationCli(["--dry-run"], {
        logger: mockLogger,
        repoRoot,
        outputDir: dir2,
        audioResolver: fixtureAudioResolver,
        imageResolver: fixtureImageResolver,
      });

      expect(code1).toBe(0);
      expect(code2).toBe(0);

      const file1 = path.join(dir1, "manifest-dry-run-report.json");
      const file2 = path.join(dir2, "manifest-dry-run-report.json");

      const bytes1 = fs.readFileSync(file1);
      const bytes2 = fs.readFileSync(file2);

      const hash1 = crypto.createHash("sha256").update(bytes1).digest("hex");
      const hash2 = crypto.createHash("sha256").update(bytes2).digest("hex");

      expect(hash1).toBe(hash2);
      expect(Buffer.compare(bytes1, bytes2)).toBe(0);
    });

    it("fails verification if report does not exist", () => {
      const result = verifyReport(path.join(tempDir, "non-existent-report.json"));

      expect(result.passed).toBe(false);
      expect(result.errors[0]).toMatch(/Dry-run report not found/);
    });

    it("detects credential keywords inside the report", () => {
      const reportPath = path.join(tempDir, "leaked-report.json");
      fs.writeFileSync(
        reportPath,
        JSON.stringify({
          mode: "dry-run",
          manifest: {
            summary: {},
          },
          CLOUDINARY_API_KEY: "secret123",
        })
      );

      const result = verifyReport(reportPath);

      expect(result.passed).toBe(false);
      expect(result.errors.some((e) => e.includes("CLOUDINARY_API_KEY"))).toBe(
        true
      );
    });
  });

  describe("tampered report mutation tests (MEDIA-02 & MEDIA-02A)", () => {
    function createBaseReport() {
      const manifest = generateMediaManifest({
        repoRoot,
        audioResolver: fixtureAudioResolver,
        imageResolver: fixtureImageResolver,
      });
      return buildDryRunReport(manifest, "test-cloud");
    }

    describe("malformed root and element shapes (runtime guard defense)", () => {
      it("fails safely when root JSON is null without throwing", () => {
        const reportPath = path.join(tempDir, "null-root.json");
        fs.writeFileSync(reportPath, "null");

        const result = verifyReport(reportPath);
        expect(result.passed).toBe(false);
        expect(result.errors.some((e) => e.includes("schema validation failed"))).toBe(true);
      });

      it("fails safely when root JSON is a primitive number without throwing", () => {
        const reportPath = path.join(tempDir, "primitive-root.json");
        fs.writeFileSync(reportPath, "12345");

        const result = verifyReport(reportPath);
        expect(result.passed).toBe(false);
        expect(result.errors.some((e) => e.includes("schema validation failed"))).toBe(true);
      });

      it("fails safely when root JSON is an incomplete object without throwing", () => {
        const reportPath = path.join(tempDir, "incomplete-root.json");
        fs.writeFileSync(reportPath, JSON.stringify({ mode: "dry-run" }));

        const result = verifyReport(reportPath);
        expect(result.passed).toBe(false);
        expect(result.errors.some((e) => e.includes("schema validation failed"))).toBe(true);
      });

      it("fails safely when physicalAssets contains a null element without throwing", () => {
        const report = createBaseReport();
        (report.manifest.physicalAssets as unknown[])[0] = null;

        const reportPath = path.join(tempDir, "null-asset-element.json");
        fs.writeFileSync(reportPath, JSON.stringify(report));

        const result = verifyReport(reportPath);
        expect(result.passed).toBe(false);
        expect(result.errors.some((e) => e.includes("schema validation failed"))).toBe(true);
      });

      it("fails safely when logicalUsages contains a null element without throwing", () => {
        const report = createBaseReport();
        (report.manifest.logicalUsages as unknown[])[0] = null;

        const reportPath = path.join(tempDir, "null-usage-element.json");
        fs.writeFileSync(reportPath, JSON.stringify(report));

        const result = verifyReport(reportPath);
        expect(result.passed).toBe(false);
        expect(result.errors.some((e) => e.includes("schema validation failed"))).toBe(true);
      });
    });

    describe("referential integrity and public ID parse checks", () => {
      it("fails when usage references a non-existent physical asset", () => {
        const report = createBaseReport();
        report.manifest.logicalUsages[0].targetPublicId =
          "ayawarta/production/invitations/rika-fauzi/couple/nonexistent";

        const reportPath = path.join(tempDir, "mutated-1.json");
        fs.writeFileSync(reportPath, JSON.stringify(report));

        const result = verifyReport(reportPath);
        expect(result.passed).toBe(false);
        expect(
          result.errors.some((e) => e.includes("references non-existent physical asset"))
        ).toBe(true);
      });

      it("fails when usage references an asset belonging to a different slug", () => {
        const report = createBaseReport();
        report.manifest.logicalUsages[0].targetPublicId =
          "ayawarta/production/invitations/shidqi-mita/couple/hero";

        const reportPath = path.join(tempDir, "mutated-2.json");
        fs.writeFileSync(reportPath, JSON.stringify(report));

        const result = verifyReport(reportPath);
        expect(result.passed).toBe(false);
        expect(result.errors.some((e) => e.includes("Slug mismatch"))).toBe(true);
      });

      it("fails when physical asset targetPublicId has slug mismatch with asset.slug (MEDIA-02A)", () => {
        const report = createBaseReport();
        report.manifest.physicalAssets[0].slug = "shidqi-mita"; // asset public ID is rika-fauzi

        const reportPath = path.join(tempDir, "public-id-slug-mismatch.json");
        fs.writeFileSync(reportPath, JSON.stringify(report));

        const result = verifyReport(reportPath);
        expect(result.passed).toBe(false);
        expect(
          result.errors.some((e) => e.includes("Public ID parsed slug"))
        ).toBe(true);
      });

      it("fails when physical asset targetPublicId has category mismatch with asset.category (MEDIA-02A)", () => {
        const report = createBaseReport();
        report.manifest.physicalAssets[0].category = "gallery"; // asset public ID is rika-fauzi/couple/groom

        const reportPath = path.join(tempDir, "public-id-category-mismatch.json");
        fs.writeFileSync(reportPath, JSON.stringify(report));

        const result = verifyReport(reportPath);
        expect(result.passed).toBe(false);
        expect(
          result.errors.some((e) => e.includes("Public ID parsed category"))
        ).toBe(true);
      });

      it("fails when usageId is non-canonical (MEDIA-02A)", () => {
        const report = createBaseReport();
        report.manifest.logicalUsages[0].usageId = "rika-fauzi:couple:tampered";

        const reportPath = path.join(tempDir, "non-canonical-usage-id.json");
        fs.writeFileSync(reportPath, JSON.stringify(report));

        const result = verifyReport(reportPath);
        expect(result.passed).toBe(false);
        expect(
          result.errors.some((e) => e.includes("Canonical usageId mismatch"))
        ).toBe(true);
      });

      it("fails when duplicate usageId exists", () => {
        const report = createBaseReport();
        report.manifest.logicalUsages[1].usageId =
          report.manifest.logicalUsages[0].usageId;

        const reportPath = path.join(tempDir, "mutated-3.json");
        fs.writeFileSync(reportPath, JSON.stringify(report));

        const result = verifyReport(reportPath);
        expect(result.passed).toBe(false);
        expect(result.errors.some((e) => e.includes("Duplicate usageId"))).toBe(
          true
        );
      });
    });

    describe("reuse semantics recomputation (MEDIA-02A)", () => {
      it("fails when asset reusedInUsages is corrupted", () => {
        const report = createBaseReport();
        // Corrupt declared usages with a different usage ID
        report.manifest.physicalAssets[0].reusedInUsages = ["corrupted:usage:id"];

        const reportPath = path.join(tempDir, "mutated-4.json");
        fs.writeFileSync(reportPath, JSON.stringify(report));

        const result = verifyReport(reportPath);
        expect(result.passed).toBe(false);
        expect(
          result.errors.some((e) => e.includes("Reverse reference mismatch"))
        ).toBe(true);
      });

      it("fails when isReused flag is tampered (marked false on reused usage)", () => {
        const report = createBaseReport();
        // Rika gallery 6 is reused from couple hero
        const rikaGallery6 = report.manifest.logicalUsages.find(
          (u) => u.usageId === "rika-fauzi:gallery:06"
        );
        if (rikaGallery6) {
          rikaGallery6.isReused = false;
        }

        const reportPath = path.join(tempDir, "tampered-is-reused.json");
        fs.writeFileSync(reportPath, JSON.stringify(report));

        const result = verifyReport(reportPath);
        expect(result.passed).toBe(false);
        expect(
          result.errors.some((e) => e.includes("invalid isReused flag"))
        ).toBe(true);
      });

      it("fails when reuseNotes is tampered or missing on reused usage", () => {
        const report = createBaseReport();
        const rikaGallery6 = report.manifest.logicalUsages.find(
          (u) => u.usageId === "rika-fauzi:gallery:06"
        );
        if (rikaGallery6) {
          rikaGallery6.reuseNotes = "Tampered notes";
        }

        const reportPath = path.join(tempDir, "tampered-reuse-notes.json");
        fs.writeFileSync(reportPath, JSON.stringify(report));

        const result = verifyReport(reportPath);
        expect(result.passed).toBe(false);
        expect(
          result.errors.some((e) => e.includes("invalid reuseNotes"))
        ).toBe(true);
      });

      it("fails when primary asset usage has unexpected reuseNotes", () => {
        const report = createBaseReport();
        // First usage of hero asset should not have reuseNotes
        report.manifest.logicalUsages[0].reuseNotes = "Unexpected note";

        const reportPath = path.join(tempDir, "unexpected-reuse-notes.json");
        fs.writeFileSync(reportPath, JSON.stringify(report));

        const result = verifyReport(reportPath);
        expect(result.passed).toBe(false);
        expect(
          result.errors.some((e) => e.includes("must not have reuseNotes"))
        ).toBe(true);
      });
    });

    describe("format and filename validation against source (MEDIA-02A)", () => {
      it("fails when format does not match source file extension", () => {
        const report = createBaseReport();
        report.manifest.physicalAssets[0].format = "png"; // source is .jpg

        const reportPath = path.join(tempDir, "tampered-format.json");
        fs.writeFileSync(reportPath, JSON.stringify(report));

        const result = verifyReport(reportPath);
        expect(result.passed).toBe(false);
        expect(result.errors.some((e) => e.includes("Format mismatch"))).toBe(
          true
        );
      });

      it("fails when originalFileName does not match source basename", () => {
        const report = createBaseReport();
        report.manifest.physicalAssets[0].originalFileName = "wrong-file.jpg";

        const reportPath = path.join(tempDir, "tampered-original-file-name.json");
        fs.writeFileSync(reportPath, JSON.stringify(report));

        const result = verifyReport(reportPath);
        expect(result.passed).toBe(false);
        expect(
          result.errors.some((e) => e.includes("originalFileName mismatch"))
        ).toBe(true);
      });
    });

    describe("summary forgery and counter recomputation (MEDIA-02A)", () => {
      it("fails when collisionsDetected is forged in summary", () => {
        const report = createBaseReport();
        report.manifest.summary.collisionsDetected = 3;

        const reportPath = path.join(tempDir, "forged-collisions.json");
        fs.writeFileSync(reportPath, JSON.stringify(report));

        const result = verifyReport(reportPath);
        expect(result.passed).toBe(false);
        expect(
          result.errors.some((e) => e.includes("Summary collisionsDetected mismatch"))
        ).toBe(true);
      });

      it("fails when missingLocalFilesCount is forged in summary", () => {
        const report = createBaseReport();
        report.manifest.summary.missingLocalFilesCount = 2;

        const reportPath = path.join(tempDir, "forged-missing-local.json");
        fs.writeFileSync(reportPath, JSON.stringify(report));

        const result = verifyReport(reportPath);
        expect(result.passed).toBe(false);
        expect(
          result.errors.some((e) => e.includes("Summary missingLocalFilesCount mismatch"))
        ).toBe(true);
      });

      it("fails when global summary values are forged", () => {
        const report = createBaseReport();
        report.manifest.summary.totalPhysicalAssets = 99;

        const reportPath = path.join(tempDir, "mutated-5.json");
        fs.writeFileSync(reportPath, JSON.stringify(report));

        const result = verifyReport(reportPath);
        expect(result.passed).toBe(false);
        expect(result.errors.some((e) => e.includes("Summary forgery"))).toBe(true);
      });

      it("fails when per-slug breakdown summary values are forged", () => {
        const report = createBaseReport();
        report.manifest.summary.slugBreakdown["rika-fauzi"].physicalAssets = 99;

        const reportPath = path.join(tempDir, "mutated-6.json");
        fs.writeFileSync(reportPath, JSON.stringify(report));

        const result = verifyReport(reportPath);
        expect(result.passed).toBe(false);
        expect(
          result.errors.some((e) => e.includes("Slug breakdown forgery"))
        ).toBe(true);
      });
    });

    describe("stage5BProposedEffects validation (MEDIA-02A)", () => {
      it("fails when stage5BProposedEffects totalUploads does not match manifest", () => {
        const report = createBaseReport();
        report.stage5BProposedEffects.totalUploads = 99;

        const reportPath = path.join(tempDir, "tampered-effects-total.json");
        fs.writeFileSync(reportPath, JSON.stringify(report));

        const result = verifyReport(reportPath);
        expect(result.passed).toBe(false);
        expect(
          result.errors.some((e) => e.includes("Proposed effects totalUploads mismatch"))
        ).toBe(true);
      });

      it("fails when stage5BProposedEffects claims database mutations", () => {
        const report = createBaseReport();
        report.stage5BProposedEffects.databaseMutations = 1;

        const reportPath = path.join(tempDir, "tampered-effects-db.json");
        fs.writeFileSync(reportPath, JSON.stringify(report));

        const result = verifyReport(reportPath);
        expect(result.passed).toBe(false);
        expect(
          result.errors.some((e) => e.includes("Proposed effects databaseMutations must be 0"))
        ).toBe(true);
      });

      it("fails when stage5BProposedEffects claims file deletions", () => {
        const report = createBaseReport();
        report.stage5BProposedEffects.fileDeletions = 1;

        const reportPath = path.join(tempDir, "tampered-effects-deletions.json");
        fs.writeFileSync(reportPath, JSON.stringify(report));

        const result = verifyReport(reportPath);
        expect(result.passed).toBe(false);
        expect(
          result.errors.some((e) => e.includes("Proposed effects fileDeletions must be 0"))
        ).toBe(true);
      });

      it("fails when stage5BProposedEffects details text is missing key disclaimers", () => {
        const report = createBaseReport();
        report.stage5BProposedEffects.details = ["Just some uploads"];

        const reportPath = path.join(tempDir, "tampered-effects-details.json");
        fs.writeFileSync(reportPath, JSON.stringify(report));

        const result = verifyReport(reportPath);
        expect(result.passed).toBe(false);
        expect(
          result.errors.some((e) => e.includes("Proposed effects details missing"))
        ).toBe(true);
      });
    });

    describe("structure and remote validation", () => {
      it("fails when hero usage is missing", () => {
        const report = createBaseReport();
        const heroUsage = report.manifest.logicalUsages.find(
          (u) => u.slug === "rika-fauzi" && u.role === "hero"
        );
        if (heroUsage) {
          heroUsage.role = "groom";
        }

        const reportPath = path.join(tempDir, "mutated-7.json");
        fs.writeFileSync(reportPath, JSON.stringify(report));

        const result = verifyReport(reportPath);
        expect(result.passed).toBe(false);
        expect(
          result.errors.some((e) => e.includes("must have exactly 1 hero usage"))
        ).toBe(true);
      });

      it("fails when gallery positions are non-sequential", () => {
        const report = createBaseReport();
        const rikaGallery2 = report.manifest.logicalUsages.find(
          (u) => u.slug === "rika-fauzi" && u.category === "gallery" && u.position === 2
        );
        if (rikaGallery2) {
          rikaGallery2.position = 9;
        }

        const reportPath = path.join(tempDir, "mutated-8.json");
        fs.writeFileSync(reportPath, JSON.stringify(report));

        const result = verifyReport(reportPath);
        expect(result.passed).toBe(false);
        expect(
          result.errors.some((e) => e.includes("Gallery position mismatch"))
        ).toBe(true);
      });

      it("fails when remote asset has query parameters or credentials (MEDIA-05)", () => {
        const report = createBaseReport();
        const remoteAsset = report.manifest.physicalAssets.find(
          (a) => a.sourceType === "remote"
        );
        if (remoteAsset) {
          remoteAsset.sourceLocation =
            "https://res.cloudinary.com/doig3gwek/image/upload/foo.jpg?token=secret";
        }

        const reportPath = path.join(tempDir, "mutated-9.json");
        fs.writeFileSync(reportPath, JSON.stringify(report));

        const result = verifyReport(reportPath);
        expect(result.passed).toBe(false);
        expect(
          result.errors.some((e) => e.includes("Remote source validation failed"))
        ).toBe(true);
      });
    });
  });
});

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  auditSingleAssetContentIdentity,
  computeStreamDigest,
  runContentIdentityAudit,
  validateAuditUrl,
  validateLocalAuditSource,
  type AuditTargetAssetInput,
  type HttpStreamFetcher,
  type HttpStreamResponse,
} from "./identity-auditor";
import { generateMediaManifest } from "../../../scripts/data/invitation-media-manifest";
import { createFixtureAudioResolver } from "./testing/fixture-audio";
import { createFixtureImageResolver } from "./testing/fixture-image";
import type { SlugUploadSummary } from "./types";
import { runAuditCli } from "../../../scripts/audit-media-identity";

describe("Identity Auditor (CLOUD-06, CLOUD-09, CLOUD-10)", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ayawarta-audit-test-"));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("validateAuditUrl security checks", () => {
    it("accepts valid HTTPS Cloudinary delivery URLs", () => {
      const url =
        "https://res.cloudinary.com/uhwi7xvb/image/upload/v12345/hero.jpg";
      const res = validateAuditUrl(url, "uhwi7xvb");
      expect(res.valid).toBe(true);
    });

    it("rejects non-HTTPS URLs", () => {
      const url =
        "http://res.cloudinary.com/uhwi7xvb/image/upload/v12345/hero.jpg";
      const res = validateAuditUrl(url);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("Must use HTTPS");
    });

    it("rejects URLs with foreign hostname", () => {
      const url = "https://evil.com/uhwi7xvb/image/upload/v12345/hero.jpg";
      const res = validateAuditUrl(url);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("Hostname must be strictly 'res.cloudinary.com'");
    });

    it("rejects URLs with query parameters", () => {
      const url =
        "https://res.cloudinary.com/uhwi7xvb/image/upload/v12345/hero.jpg?token=secret";
      const res = validateAuditUrl(url);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("must not contain query parameters");
    });

    it("rejects URLs with hash fragments", () => {
      const url =
        "https://res.cloudinary.com/uhwi7xvb/image/upload/v12345/hero.jpg#section";
      const res = validateAuditUrl(url);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("must not contain hash fragments");
    });

    it("rejects URLs containing user credentials", () => {
      const url =
        "https://user:pass@res.cloudinary.com/uhwi7xvb/image/upload/v12345/hero.jpg";
      const res = validateAuditUrl(url);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("must not contain user credentials");
    });

    it("rejects URLs with custom ports", () => {
      const url =
        "https://res.cloudinary.com:8443/uhwi7xvb/image/upload/v12345/hero.jpg";
      const res = validateAuditUrl(url);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("must not specify custom port");
    });
  });

  describe("computeStreamDigest", () => {
    it("computes accurate SHA-256 and byte size from stream", async () => {
      const content = Buffer.from("Hello AyaWarta Stream Verification!");
      const stream = Readable.from([content]);
      const result = await computeStreamDigest(stream);

      expect(result.byteCount).toBe(content.length);
      expect(result.sha256).toMatch(/^[0-9A-F]{64}$/);
    });

    it("aborts and throws when stream exceeds maxBytes limit (oversize response protection)", async () => {
      const chunk = Buffer.alloc(1024, 0x41); // 1 KB
      const stream = Readable.from([chunk, chunk, chunk]);

      await expect(computeStreamDigest(stream, 2048)).rejects.toThrow(
        /exceeded maximum safety limit of 2048 bytes/
      );
    });
  });

  describe("validateLocalAuditSource containment (CLOUD-09)", () => {
    it("accepts valid file inside approved root", () => {
      const sampleDir = path.join(tempDir, "public/images/SAMPLE");
      fs.mkdirSync(sampleDir, { recursive: true });
      const sampleFile = path.join(sampleDir, "sample.jpg");
      fs.writeFileSync(sampleFile, Buffer.from("test bytes"));

      const res = validateLocalAuditSource("public/images/SAMPLE/sample.jpg", tempDir);
      expect(res.valid).toBe(true);
      expect(res.absolutePath).toBe(path.resolve(sampleFile));
    });

    it("rejects null bytes in path", () => {
      const res = validateLocalAuditSource("public/images/SAMPLE\0/test.jpg", tempDir);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("null bytes");
    });

    it("rejects backslashes in path", () => {
      const res = validateLocalAuditSource("public\\images\\SAMPLE\\test.jpg", tempDir);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("backslashes");
    });

    it("rejects path traversal (..)", () => {
      const res = validateLocalAuditSource("public/images/SAMPLE/../secret.txt", tempDir);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("path traversal");
    });

    it("rejects drive and UNC paths", () => {
      const res1 = validateLocalAuditSource("C:/secret.txt", tempDir);
      expect(res1.valid).toBe(false);
      expect(res1.reason).toContain("drive or UNC path");

      const res2 = validateLocalAuditSource("//server/share/test.jpg", tempDir);
      expect(res2.valid).toBe(false);
      expect(res2.reason).toContain("drive or UNC path");
    });

    it("rejects empty segments (//)", () => {
      const res = validateLocalAuditSource("public/images//SAMPLE/test.jpg", tempDir);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("empty segments");
    });

    it("rejects non-existent files", () => {
      const res = validateLocalAuditSource("public/images/SAMPLE/nonexistent.jpg", tempDir);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("does not exist");
    });

    it("rejects files outside approved roots even if inside repo", () => {
      const outsideDir = path.join(tempDir, "src/features/media");
      fs.mkdirSync(outsideDir, { recursive: true });
      const outsideFile = path.join(outsideDir, "types.ts");
      fs.writeFileSync(outsideFile, Buffer.from("export const foo = 1;"));

      const res = validateLocalAuditSource("src/features/media/types.ts", tempDir);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("outside approved local roots");
    });
  });

  describe("auditSingleAssetContentIdentity with injected fetcher (CLOUD-06, CLOUD-09, CLOUD-10)", () => {
    it("verifies identity when source and target streams match exactly", async () => {
      const content = Buffer.from("identical media bytes 12345");

      const mockFetcher: HttpStreamFetcher = async () => ({
        status: 200,
        stream: Readable.from([content]),
      });

      const asset: AuditTargetAssetInput = {
        targetPublicId: "ayawarta/production/invitations/shidqi-mita/couple/groom",
        slug: "shidqi-mita",
        category: "couple",
        sourceType: "remote",
        sourceLocation:
          "https://res.cloudinary.com/doig3gwek/image/upload/v1/PWD_Shidqi_im7frp.jpg",
        secureUrl:
          "https://res.cloudinary.com/test-cloud/image/upload/v1/ayawarta/production/invitations/shidqi-mita/couple/groom.jpg",
      };

      const record = await auditSingleAssetContentIdentity(asset, {
        targetCloudName: "test-cloud",
        fetcher: mockFetcher,
      });

      expect(record.match).toBe(true);
      expect(record.sourceBytes).toBe(content.length);
      expect(record.targetBytes).toBe(content.length);
      expect(record.sourceSha256).toBe(record.targetSha256);
      expect(record.error).toBeNull();
    });

    it("detects mismatch when target stream differs from source stream", async () => {
      const sourceContent = Buffer.from("original source media");
      const alteredContent = Buffer.from("altered target media!");

      const mockFetcher: HttpStreamFetcher = async (url) => {
        const isOld = url.includes("doig3gwek");
        return {
          status: 200,
          stream: Readable.from([isOld ? sourceContent : alteredContent]),
        };
      };

      const asset: AuditTargetAssetInput = {
        targetPublicId: "ayawarta/production/invitations/shidqi-mita/couple/groom",
        slug: "shidqi-mita",
        category: "couple",
        sourceType: "remote",
        sourceLocation:
          "https://res.cloudinary.com/doig3gwek/image/upload/v1/PWD_Shidqi_im7frp.jpg",
        secureUrl:
          "https://res.cloudinary.com/test-cloud/image/upload/v1/ayawarta/production/invitations/shidqi-mita/couple/groom.jpg",
      };

      const record = await auditSingleAssetContentIdentity(asset, {
        targetCloudName: "test-cloud",
        fetcher: mockFetcher,
      });

      expect(record.match).toBe(false);
      expect(record.sourceSha256).not.toBe(record.targetSha256);
      expect(record.error).toContain("Content digest mismatch");
    });

    it("rejects non-2xx target HTTP response from injected fetcher (CLOUD-10)", async () => {
      const mockFetcher: HttpStreamFetcher = async () => ({
        status: 404,
        stream: Readable.from([Buffer.from("Not Found")]),
      });

      const asset: AuditTargetAssetInput = {
        targetPublicId: "ayawarta/production/invitations/shidqi-mita/couple/groom",
        slug: "shidqi-mita",
        category: "couple",
        sourceType: "remote",
        sourceLocation:
          "https://res.cloudinary.com/doig3gwek/image/upload/v1/PWD_Shidqi_im7frp.jpg",
        secureUrl:
          "https://res.cloudinary.com/test-cloud/image/upload/v1/ayawarta/production/invitations/shidqi-mita/couple/groom.jpg",
      };

      const record = await auditSingleAssetContentIdentity(asset, {
        targetCloudName: "test-cloud",
        fetcher: mockFetcher,
      });

      expect(record.match).toBe(false);
      expect(record.error).toContain("Target HTTP GET failed with status 404");
    });

    it("rejects non-2xx remote source HTTP response from injected fetcher (CLOUD-10)", async () => {
      const mockFetcher: HttpStreamFetcher = async (url) => {
        if (url.includes("doig3gwek")) {
          return {
            status: 502,
            stream: Readable.from([Buffer.from("Bad Gateway")]),
          };
        }
        return {
          status: 200,
          stream: Readable.from([Buffer.from("Valid Target Stream")]),
        };
      };

      const asset: AuditTargetAssetInput = {
        targetPublicId: "ayawarta/production/invitations/shidqi-mita/couple/groom",
        slug: "shidqi-mita",
        category: "couple",
        sourceType: "remote",
        sourceLocation:
          "https://res.cloudinary.com/doig3gwek/image/upload/v1/PWD_Shidqi_im7frp.jpg",
        secureUrl:
          "https://res.cloudinary.com/test-cloud/image/upload/v1/ayawarta/production/invitations/shidqi-mita/couple/groom.jpg",
      };

      const record = await auditSingleAssetContentIdentity(asset, {
        targetCloudName: "test-cloud",
        fetcher: mockFetcher,
      });

      expect(record.match).toBe(false);
      expect(record.error).toContain("Remote source HTTP GET failed with status 502");
    });

    it("safely handles HTTP errors and sanitizes error messages", async () => {
      const mockFetcher: HttpStreamFetcher = async () => {
        throw new Error("HTTP 404 with api_key=SECRET_KEY_12345 and token=SECRET_TOKEN");
      };

      const asset: AuditTargetAssetInput = {
        targetPublicId: "ayawarta/production/invitations/shidqi-mita/couple/groom",
        slug: "shidqi-mita",
        category: "couple",
        sourceType: "remote",
        sourceLocation:
          "https://res.cloudinary.com/doig3gwek/image/upload/v1/PWD_Shidqi_im7frp.jpg",
        secureUrl:
          "https://res.cloudinary.com/test-cloud/image/upload/v1/ayawarta/production/invitations/shidqi-mita/couple/groom.jpg",
      };

      const record = await auditSingleAssetContentIdentity(asset, {
        targetCloudName: "test-cloud",
        fetcher: mockFetcher,
      });

      expect(record.match).toBe(false);
      expect(record.error).not.toContain("SECRET_KEY_12345");
      expect(record.error).toContain("[REDACTED]");
    });

    it("handles timeout via AbortSignal", async () => {
      const mockFetcher: HttpStreamFetcher = async (_url, options) => {
        return new Promise((_resolve, reject) => {
          options.signal.addEventListener("abort", () => {
            reject(new Error("Request timed out"));
          });
        });
      };

      const asset: AuditTargetAssetInput = {
        targetPublicId: "ayawarta/production/invitations/shidqi-mita/couple/groom",
        slug: "shidqi-mita",
        category: "couple",
        sourceType: "remote",
        sourceLocation:
          "https://res.cloudinary.com/doig3gwek/image/upload/v1/PWD_Shidqi_im7frp.jpg",
        secureUrl:
          "https://res.cloudinary.com/test-cloud/image/upload/v1/ayawarta/production/invitations/shidqi-mita/couple/groom.jpg",
      };

      const record = await auditSingleAssetContentIdentity(asset, {
        targetCloudName: "test-cloud",
        fetcher: mockFetcher,
        timeoutMs: 50,
      });

      expect(record.match).toBe(false);
      expect(record.error).toContain("timed out");
    });

    it("verifies local source file against target delivery URL inside approved root", async () => {
      const sampleDir = path.join(tempDir, "public/images/SAMPLE");
      fs.mkdirSync(sampleDir, { recursive: true });
      const testContent = Buffer.from("local file test bytes 98765");
      const localRelPath = "public/images/SAMPLE/test-groom.jpg";
      const localAbsPath = path.join(tempDir, localRelPath);
      fs.writeFileSync(localAbsPath, testContent);

      const mockFetcher: HttpStreamFetcher = async () => ({
        status: 200,
        stream: Readable.from([testContent]),
      });

      const asset: AuditTargetAssetInput = {
        targetPublicId: "ayawarta/production/invitations/rika-fauzi/couple/groom",
        slug: "rika-fauzi",
        category: "couple",
        sourceType: "local",
        sourceLocation: localRelPath,
        secureUrl:
          "https://res.cloudinary.com/test-cloud/image/upload/v1/ayawarta/production/invitations/rika-fauzi/couple/groom.jpg",
      };

      const record = await auditSingleAssetContentIdentity(asset, {
        repoRoot: tempDir,
        targetCloudName: "test-cloud",
        fetcher: mockFetcher,
      });

      expect(record.match).toBe(true);
      expect(record.sourceBytes).toBe(testContent.length);
      expect(record.targetBytes).toBe(testContent.length);
      expect(record.sourceSha256).toBe(record.targetSha256);
    });

    it("fails closed on local source path traversal (CLOUD-09)", async () => {
      const mockFetcher: HttpStreamFetcher = async () => ({
        status: 200,
        stream: Readable.from([Buffer.from("dummy")]),
      });

      const asset: AuditTargetAssetInput = {
        targetPublicId: "ayawarta/production/invitations/rika-fauzi/couple/groom",
        slug: "rika-fauzi",
        category: "couple",
        sourceType: "local",
        sourceLocation: "public/images/SAMPLE/../../secret.txt",
        secureUrl:
          "https://res.cloudinary.com/test-cloud/image/upload/v1/ayawarta/production/invitations/rika-fauzi/couple/groom.jpg",
      };

      const record = await auditSingleAssetContentIdentity(asset, {
        repoRoot: tempDir,
        targetCloudName: "test-cloud",
        fetcher: mockFetcher,
      });

      expect(record.match).toBe(false);
      expect(record.error).toContain("Local source containment failed");
      expect(record.error).toContain("path traversal");
    });
  });

  describe("runContentIdentityAudit orchestration (CLOUD-09 & CLOUD-10)", () => {
    function setupHermeticFixture(dir: string) {
      const localFileMap = new Map<string, Buffer>();

      const localPaths = [
        "public/images/SAMPLE/FOTO - Fauzi.jpg",
        "public/images/SAMPLE/FOTO - Rika Widiarti.jpg",
        ".media-migration/input/images/rika-fauzi-hero.jpg",
        "public/images/SAMPLE/IMG-20250802-WA0006.jpg",
        "public/images/SAMPLE/IMG-20250802-WA0005.jpg",
        "public/images/SAMPLE/IMG-20250802-WA0007.jpg",
        "public/images/SAMPLE/IMG-20250802-WA0008.jpg",
        "public/images/SAMPLE/IMG-20250802-WA0009.jpg",
        ".media-migration/input/audio/rika-fauzi.mp3",
        ".media-migration/input/audio/shidqi-mita.mp3",
        "public/images/dummy-couples/groom.jpg",
        "public/images/dummy-couples/bride.jpg",
        "public/images/dummy-couples/hero.png",
        "public/images/dummy-couples/photo-sample.jpg",
        ".media-migration/input/audio/default-preview.mp3",
      ];

      for (const relPath of localPaths) {
        const absPath = path.join(dir, relPath);
        fs.mkdirSync(path.dirname(absPath), { recursive: true });
        const content = Buffer.from(`hermetic-test-content-for-${path.basename(relPath)}`);
        fs.writeFileSync(absPath, content);
        localFileMap.set(relPath, content);
      }

      const audioResolver = createFixtureAudioResolver();
      const imageResolver = createFixtureImageResolver();

      const manifest = generateMediaManifest({
        repoRoot: dir,
        audioResolver,
        imageResolver,
      });

      const targetCloudName = "test-cloud";
      const assets = manifest.physicalAssets.map((a) => ({
        id: a.id,
        slug: a.slug,
        category: a.category,
        targetPublicId: a.targetPublicId,
        resourceType: a.cloudinaryResourceType,
        status: "uploaded" as const,
        sourceType: a.sourceType,
        sourceLocation: a.sourceLocation,
        secureUrl: `https://res.cloudinary.com/${targetCloudName}/${a.cloudinaryResourceType}/upload/v1/${a.targetPublicId}.${a.format}`,
        format: a.format,
        bytes: a.byteSize ?? 2048,
        width: 200,
        height: 200,
      }));

      const slugBreakdown: Record<string, SlugUploadSummary> = {};
      for (const slug of ["rika-fauzi", "shidqi-mita", "dudi-aini", "default-preview"]) {
        slugBreakdown[slug] = {
          totalAssets: assets.filter((a) => a.slug === slug).length,
          uploaded: assets.filter((a) => a.slug === slug).length,
          existingVerified: 0,
          failed: 0,
          heroTargetPublicId: `ayawarta/production/invitations/${slug}/couple/hero`,
          heroVerified: true,
          audioTargetPublicId: `ayawarta/production/invitations/${slug}/audio/background-music`,
          audioVerified: true,
        };
      }

      const validReport = {
        mode: "stage-5b-upload" as const,
        targetCloudName,
        generatedAt: new Date().toISOString(),
        summary: {
          totalPhysicalAssets: 31,
          uploadedCount: 31,
          existingVerifiedCount: 0,
          failedCount: 0,
          imagesCount: manifest.summary.totalImages,
          audioCount: manifest.summary.totalAudio,
          videoCount: 0,
          heroesVerifiedCount: 4,
          audiosVerifiedCount: 4,
          slugBreakdown,
        },
        assets,
        externalEffects: {
          targetCloudName,
          uploadsPerformed: 31,
          remoteFetched: 16,
          databaseMutations: 0 as const,
          fileDeletions: 0 as const,
          details: ["Verified 4/4 heroes and 4/4 audio"],
        },
      };

      const reportDir = path.join(dir, ".media-migration");
      fs.mkdirSync(reportDir, { recursive: true });
      const reportPath = path.join(reportDir, "cloudinary-upload-report.json");
      fs.writeFileSync(reportPath, JSON.stringify(validReport, null, 2), "utf-8");

      const remoteSharedContent = Buffer.from("remote-stream-content-for-old-cloudinary");
      const createMockFetcher = (customHandlers?: {
        onTargetUrl?: (url: string) => Promise<HttpStreamResponse> | HttpStreamResponse;
        onSourceUrl?: (url: string) => Promise<HttpStreamResponse> | HttpStreamResponse;
      }): HttpStreamFetcher => {
        return async (url) => {
          if (url.includes("doig3gwek")) {
            if (customHandlers?.onSourceUrl) {
              return customHandlers.onSourceUrl(url);
            }
            return {
              status: 200,
              stream: Readable.from([remoteSharedContent]),
            };
          }
          if (customHandlers?.onTargetUrl) {
            return customHandlers.onTargetUrl(url);
          }
          // For target delivery URL
          const matched = assets.find((a) => url.includes(a.targetPublicId));
          if (matched && matched.sourceType === "local") {
            const fileContent = localFileMap.get(matched.sourceLocation);
            if (fileContent) {
              return {
                status: 200,
                stream: Readable.from([fileContent]),
              };
            }
          }
          return {
            status: 200,
            stream: Readable.from([remoteSharedContent]),
          };
        };
      };

      return {
        manifest,
        validReport,
        reportPath,
        audioResolver,
        imageResolver,
        createMockFetcher,
      };
    }

    it("verifies all 31 targets, 4 heroes, 4 audio and records exactly 47 network requests on match (CLOUD-10)", async () => {
      const fixture = setupHermeticFixture(tempDir);
      const mockFetcher = fixture.createMockFetcher();

      const auditReport = await runContentIdentityAudit({
        repoRoot: tempDir,
        reportPath: fixture.reportPath,
        targetCloudName: "test-cloud",
        fetcher: mockFetcher,
        audioResolver: fixture.audioResolver,
        imageResolver: fixture.imageResolver,
        logger: { log: () => {}, warn: () => {}, error: () => {} },
      });

      expect(auditReport.passed).toBe(true);
      expect(auditReport.summary.totalAssets).toBe(31);
      expect(auditReport.summary.matchedCount).toBe(31);
      expect(auditReport.summary.mismatchedCount).toBe(0);
      expect(auditReport.summary.heroesMatchedCount).toBe(4);
      expect(auditReport.summary.audiosMatchedCount).toBe(4);
      expect(auditReport.summary.remoteMatchedCount).toBe(16);
      expect(auditReport.summary.localMatchedCount).toBe(15);
      expect(auditReport.externalEffects.uploadsPerformed).toBe(0);
      expect(auditReport.externalEffects.fileDeletions).toBe(0);
      // CLOUD-10: Exactly 47 requests: 31 targets + 16 remote sources; 15 local files read from disk
      expect(auditReport.externalEffects.networkRequestsMade).toBe(47);
    });

    it("records accurate request count on partial early failure (CLOUD-10)", async () => {
      const fixture = setupHermeticFixture(tempDir);
      // Fail on the very first target request attempt
      const failingFetcher: HttpStreamFetcher = async () => {
        throw new Error("Network connection dropped");
      };

      const auditReport = await runContentIdentityAudit({
        repoRoot: tempDir,
        reportPath: fixture.reportPath,
        targetCloudName: "test-cloud",
        fetcher: failingFetcher,
        audioResolver: fixture.audioResolver,
        imageResolver: fixture.imageResolver,
        logger: { log: () => {}, warn: () => {}, error: () => {} },
      });

      expect(auditReport.passed).toBe(false);
      expect(auditReport.summary.matchedCount).toBe(0);
      expect(auditReport.summary.mismatchedCount).toBe(31);
      // For each asset, target fetch was attempted and threw.
      // Remote source fetch was never attempted for any asset because target threw.
      // Total requests made = 31 target fetch attempts.
      expect(auditReport.externalEffects.networkRequestsMade).toBe(31);
    });

    describe("CLOUD-09 Untrusted Report Boundary Hardening", () => {
      it("rejects non-existent upload report file", async () => {
        await expect(
          runContentIdentityAudit({
            repoRoot: tempDir,
            reportPath: path.join(tempDir, "nonexistent-report.json"),
          })
        ).rejects.toThrow(/report not found/i);
      });

      it("rejects malformed JSON report safely without throwing unhandled error", async () => {
        const reportPath = path.join(tempDir, "malformed-report.json");
        fs.writeFileSync(reportPath, "NOT VALID JSON {{{{");

        await expect(
          runContentIdentityAudit({
            repoRoot: tempDir,
            reportPath,
          })
        ).rejects.toThrow(/Failed to parse upload report JSON/);
      });

      it("rejects null JSON root safely without dereferencing", async () => {
        const reportPath = path.join(tempDir, "null-root-report.json");
        fs.writeFileSync(reportPath, "null");

        await expect(
          runContentIdentityAudit({
            repoRoot: tempDir,
            reportPath,
          })
        ).rejects.toThrow(/Upload report validation failed/);
      });

      it("rejects primitive JSON root safely without dereferencing", async () => {
        const reportPath = path.join(tempDir, "primitive-root-report.json");
        fs.writeFileSync(reportPath, "42");

        await expect(
          runContentIdentityAudit({
            repoRoot: tempDir,
            reportPath,
          })
        ).rejects.toThrow(/Upload report validation failed/);
      });

      it("rejects upload report containing credential keywords", async () => {
        const fixture = setupHermeticFixture(tempDir);
        const secretReport = {
          ...fixture.validReport,
          externalEffects: {
            ...fixture.validReport.externalEffects,
            details: ["CLOUDINARY_API_KEY=exposed_secret_12345"],
          },
        };
        const reportPath = path.join(tempDir, "secret-report.json");
        fs.writeFileSync(reportPath, JSON.stringify(secretReport));

        await expect(
          runContentIdentityAudit({
            repoRoot: tempDir,
            reportPath,
            audioResolver: fixture.audioResolver,
            imageResolver: fixture.imageResolver,
          })
        ).rejects.toThrow(/Secret keyword 'CLOUDINARY_API_KEY' detected/);
      });

      it("rejects report failing schema validation (missing assets)", async () => {
        const invalidReport = {
          mode: "stage-5b-upload",
          targetCloudName: "test-cloud",
          generatedAt: new Date().toISOString(),
          // missing summary, assets, externalEffects
        };
        const reportPath = path.join(tempDir, "schema-invalid-report.json");
        fs.writeFileSync(reportPath, JSON.stringify(invalidReport));

        await expect(
          runContentIdentityAudit({
            repoRoot: tempDir,
            reportPath,
          })
        ).rejects.toThrow(/Upload report validation failed at/);
      });

      it("rejects report with duplicate target public IDs", async () => {
        const fixture = setupHermeticFixture(tempDir);
        const dupReport = {
          ...fixture.validReport,
          assets: [
            ...fixture.validReport.assets.slice(0, 30),
            { ...fixture.validReport.assets[0] }, // Duplicate of first asset
          ],
        };
        const reportPath = path.join(tempDir, "dup-id-report.json");
        fs.writeFileSync(reportPath, JSON.stringify(dupReport));

        await expect(
          runContentIdentityAudit({
            repoRoot: tempDir,
            reportPath,
            audioResolver: fixture.audioResolver,
            imageResolver: fixture.imageResolver,
          })
        ).rejects.toThrow(/Duplicate target public ID in upload report/);
      });

      it("rejects report with missing target public ID", async () => {
        const fixture = setupHermeticFixture(tempDir);
        // Replace an asset with a valid but non-canonical public ID
        const missingReport = {
          ...fixture.validReport,
          assets: [
            ...fixture.validReport.assets.slice(1),
            {
              ...fixture.validReport.assets[0],
              targetPublicId: "ayawarta/production/invitations/rika-fauzi/gallery/gallery-99",
            },
          ],
        };
        const reportPath = path.join(tempDir, "missing-id-report.json");
        fs.writeFileSync(reportPath, JSON.stringify(missingReport));

        await expect(
          runContentIdentityAudit({
            repoRoot: tempDir,
            reportPath,
            audioResolver: fixture.audioResolver,
            imageResolver: fixture.imageResolver,
          })
        ).rejects.toThrow(/Extra or unrecognized target public ID in upload report/);
      });

      it("rejects report with metadata substitution: slug mismatch", async () => {
        const fixture = setupHermeticFixture(tempDir);
        const tamperedReport = {
          ...fixture.validReport,
          assets: fixture.validReport.assets.map((a, idx) =>
            idx === 0 ? { ...a, slug: "shidqi-mita" as const } : a
          ),
        };
        const reportPath = path.join(tempDir, "slug-subst-report.json");
        fs.writeFileSync(reportPath, JSON.stringify(tamperedReport));

        await expect(
          runContentIdentityAudit({
            repoRoot: tempDir,
            reportPath,
            audioResolver: fixture.audioResolver,
            imageResolver: fixture.imageResolver,
          })
        ).rejects.toThrow(/Metadata substitution .* slug mismatch/);
      });

      it("rejects report with metadata substitution: category mismatch", async () => {
        const fixture = setupHermeticFixture(tempDir);
        const tamperedReport = {
          ...fixture.validReport,
          assets: fixture.validReport.assets.map((a, idx) =>
            idx === 0 ? { ...a, category: "gallery" as const } : a
          ),
        };
        const reportPath = path.join(tempDir, "cat-subst-report.json");
        fs.writeFileSync(reportPath, JSON.stringify(tamperedReport));

        await expect(
          runContentIdentityAudit({
            repoRoot: tempDir,
            reportPath,
            audioResolver: fixture.audioResolver,
            imageResolver: fixture.imageResolver,
          })
        ).rejects.toThrow(/Metadata substitution .* category mismatch/);
      });

      it("rejects report with metadata substitution: sourceType mismatch", async () => {
        const fixture = setupHermeticFixture(tempDir);
        const tamperedReport = {
          ...fixture.validReport,
          assets: fixture.validReport.assets.map((a, idx) =>
            idx === 0
              ? {
                  ...a,
                  sourceType: (a.sourceType === "local" ? "remote" : "local") as "local" | "remote",
                }
              : a
          ),
        };
        const reportPath = path.join(tempDir, "sourcetype-subst-report.json");
        fs.writeFileSync(reportPath, JSON.stringify(tamperedReport));

        await expect(
          runContentIdentityAudit({
            repoRoot: tempDir,
            reportPath,
            audioResolver: fixture.audioResolver,
            imageResolver: fixture.imageResolver,
          })
        ).rejects.toThrow(/Metadata substitution .* sourceType mismatch/);
      });

      it("rejects report with metadata substitution: sourceLocation mismatch", async () => {
        const fixture = setupHermeticFixture(tempDir);
        const tamperedReport = {
          ...fixture.validReport,
          assets: fixture.validReport.assets.map((a, idx) =>
            idx === 0 ? { ...a, sourceLocation: "public/images/SAMPLE/tampered.jpg" } : a
          ),
        };
        const reportPath = path.join(tempDir, "sourceloc-subst-report.json");
        fs.writeFileSync(reportPath, JSON.stringify(tamperedReport));

        await expect(
          runContentIdentityAudit({
            repoRoot: tempDir,
            reportPath,
            audioResolver: fixture.audioResolver,
            imageResolver: fixture.imageResolver,
          })
        ).rejects.toThrow(/Metadata substitution .* sourceLocation mismatch/);
      });

      it("rejects report with metadata substitution: resourceType mismatch", async () => {
        const fixture = setupHermeticFixture(tempDir);
        const tamperedReport = {
          ...fixture.validReport,
          assets: fixture.validReport.assets.map((a, idx) =>
            idx === 0 ? { ...a, resourceType: "video" as const } : a
          ),
        };
        const reportPath = path.join(tempDir, "resourcetype-subst-report.json");
        fs.writeFileSync(reportPath, JSON.stringify(tamperedReport));

        await expect(
          runContentIdentityAudit({
            repoRoot: tempDir,
            reportPath,
            audioResolver: fixture.audioResolver,
            imageResolver: fixture.imageResolver,
          })
        ).rejects.toThrow(/Metadata substitution .* resourceType mismatch/);
      });

      it("sanitizes top-level CLI errors and prevents credential leakage (CLOUD-09)", async () => {
        const consoleErrors: string[] = [];
        const originalConsoleError = console.error;
        console.error = (msg: string) => consoleErrors.push(msg);

        // Point cwd to a clean tempDir without reports, simulating CLI execution
        const origCwd = process.cwd();
        try {
          process.chdir(tempDir);
          const exitCode = await runAuditCli();
          expect(exitCode).toBe(1);
          expect(consoleErrors.some((e) => e.includes("[FATAL] Identity audit failed:"))).toBe(true);
        } finally {
          process.chdir(origCwd);
          console.error = originalConsoleError;
        }
      });
    });
  });
});

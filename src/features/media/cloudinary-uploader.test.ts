import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  type CloudinaryResourceInfo,
  type CloudinaryUploadOptions,
  executeCloudinaryMigration,
  type ICloudinaryClient,
  OLD_CLOUDINARY_CLOUD_NAME,
  RealCloudinaryClient,
  sanitizeErrorMessage,
  validateCloudinaryDeliveryUrl,
} from "./cloudinary-uploader";
import {
  verifyCloudinaryUploadReport,
} from "../../../scripts/verify-cloudinary-upload";
import {
  createFixtureMediaManifest,
  setupFixtureLocalFiles,
} from "./testing/fixture-manifest";

class MockCloudinaryClient implements ICloudinaryClient {
  public resources: Map<string, CloudinaryResourceInfo> = new Map();
  public uploadCalls: { source: string; options: CloudinaryUploadOptions }[] = [];
  public pingSuccess = true;
  public failUploadOnId: string | null = null;
  public dropFromReadBackId: string | null = null;

  async ping(): Promise<{ status: string }> {
    if (!this.pingSuccess) {
      throw new Error("Mock ping failure: Invalid API Key or Secret");
    }
    return { status: "ok" };
  }

  async getResourcesByIds(
    publicIds: string[],
    options: { resource_type: "image" | "video" }
  ): Promise<CloudinaryResourceInfo[]> {
    const matched: CloudinaryResourceInfo[] = [];
    for (const id of publicIds) {
      if (this.dropFromReadBackId && id === this.dropFromReadBackId) {
        continue;
      }
      const found = this.resources.get(id);
      if (found && found.resource_type === options.resource_type) {
        matched.push(found);
      }
    }
    return matched;
  }

  async upload(
    sourceLocation: string,
    options: CloudinaryUploadOptions
  ): Promise<CloudinaryResourceInfo> {
    this.uploadCalls.push({ source: sourceLocation, options });

    if (this.failUploadOnId && options.public_id === this.failUploadOnId) {
      throw new Error(`Simulated Cloudinary upload failure for '${options.public_id}'`);
    }

    const ext = path.extname(sourceLocation).replace(/^\./, "").toLowerCase() || "jpg";

    let byteSize = 123456;
    let width = options.resource_type === "image" ? 800 : undefined;
    let height = options.resource_type === "image" ? 600 : undefined;

    if (options.public_id.includes("rika-fauzi/audio/background-music")) {
      byteSize = 7369389;
    } else if (
      options.public_id.includes("shidqi-mita/audio/background-music") ||
      options.public_id.includes("default-preview/audio/background-music")
    ) {
      byteSize = 2263386;
    } else if (options.public_id.includes("rika-fauzi/couple/hero")) {
      byteSize = 4151481;
      width = 3877;
      height = 5816;
    } else {
      const resolved = path.isAbsolute(sourceLocation)
        ? sourceLocation
        : path.resolve(process.cwd(), sourceLocation);
      if (fs.existsSync(resolved)) {
        byteSize = fs.statSync(resolved).size;
      }
    }

    const info: CloudinaryResourceInfo = {
      public_id: options.public_id,
      format: ext === "jpeg" ? "jpg" : ext,
      resource_type: options.resource_type,
      bytes: byteSize,
      secure_url: `https://res.cloudinary.com/test-target-cloud/${options.resource_type}/upload/v12345/${options.public_id}.${ext}`,
      width,
      height,
      created_at: new Date().toISOString(),
    };

    this.resources.set(options.public_id, info);
    return info;
  }
}

describe("Cloudinary Uploader & Stage 5B Migration (Hermetic)", () => {
  let tempDir: string;
  let repoRoot: string;
  const targetCloudName = "test-target-cloud";

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ayawarta-stage5b-test-"));
    repoRoot = tempDir;
    setupFixtureLocalFiles(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("Security Guards and Target Cloud Name", () => {
    it("refuses empty target cloud name", () => {
      expect(() => {
        new RealCloudinaryClient({
          cloudName: "",
          apiKey: "key",
          apiSecret: "secret",
        });
      }).toThrow(/cannot be empty/i);
    });

    it("refuses old Cloudinary account 'doig3gwek'", () => {
      expect(() => {
        new RealCloudinaryClient({
          cloudName: OLD_CLOUDINARY_CLOUD_NAME,
          apiKey: "key",
          apiSecret: "secret",
        });
      }).toThrow(/cannot be old account/i);
    });

    it("sanitizes error messages containing API keys or secrets", () => {
      const sensitiveErr = new Error(
        "Upload failed with api_key=123456789012345&api_secret=supersecretvalue123 and Bearer secrettoken"
      );
      const sanitized = sanitizeErrorMessage(sensitiveErr);
      expect(sanitized).not.toContain("123456789012345");
      expect(sanitized).not.toContain("supersecretvalue123");
      expect(sanitized).not.toContain("secrettoken");
      expect(sanitized).toContain("api_key=[REDACTED]");
      expect(sanitized).toContain("api_secret=[REDACTED]");
      expect(sanitized).toContain("Bearer [REDACTED]");
    });
  });

  describe("Manifest Selection and Option Mapping", () => {
    it("selects exactly 31 physical assets and NOT 37 logical usages", async () => {
      const manifest = createFixtureMediaManifest();

      expect(manifest.physicalAssets.length).toBe(31);
      expect(manifest.logicalUsages.length).toBe(37);

      const mockClient = new MockCloudinaryClient();
      const mockLogger = { log: () => {}, warn: () => {}, error: () => {} };

      const result = await executeCloudinaryMigration({
        manifest,
        client: mockClient,
        cloudName: targetCloudName,
        repoRoot,
        logger: mockLogger,
      });



      expect(result.success).toBe(true);
      expect(mockClient.uploadCalls.length).toBe(31);
      expect(result.report.summary.totalPhysicalAssets).toBe(31);
      expect(result.report.summary.uploadedCount).toBe(31);
      expect(result.report.summary.existingVerifiedCount).toBe(0);
      expect(result.report.summary.failedCount).toBe(0);
    });

    it("maps image resources to 'image' and audio resources to 'video' with unique_filename: false and overwrite: false", async () => {
      const manifest = createFixtureMediaManifest();

      const mockClient = new MockCloudinaryClient();
      const mockLogger = { log: () => {}, warn: () => {}, error: () => {} };

      await executeCloudinaryMigration({
        manifest,
        client: mockClient,
        cloudName: targetCloudName,
        repoRoot,
        logger: mockLogger,
      });

      for (const call of mockClient.uploadCalls) {
        expect(call.options.unique_filename).toBe(false);
        expect(call.options.overwrite).toBe(false);

        if (call.options.public_id.includes("/audio/")) {
          expect(call.options.resource_type).toBe("video");
        } else {
          expect(call.options.resource_type).toBe("image");
        }
      }
    });
  });

  describe("Idempotency and Existing Resource Verification", () => {
    it("marks existing matching resources as 'existing_verified' without calling upload()", async () => {
      const manifest = createFixtureMediaManifest();

      const mockClient = new MockCloudinaryClient();
      const mockLogger = { log: () => {}, warn: () => {}, error: () => {} };

      // Pre-populate mock client with 1 matching asset
      const groomAsset = manifest.physicalAssets.find(
        (a) => a.targetPublicId === "ayawarta/production/invitations/rika-fauzi/couple/groom"
      )!;

      mockClient.resources.set(groomAsset.targetPublicId, {
        public_id: groomAsset.targetPublicId,
        format: "jpg",
        resource_type: "image",
        bytes: groomAsset.byteSize!,
        secure_url: `https://res.cloudinary.com/${targetCloudName}/image/upload/v1/${groomAsset.targetPublicId}.jpg`,
        width: 800,
        height: 600,
      });

      const result = await executeCloudinaryMigration({
        manifest,
        client: mockClient,
        cloudName: targetCloudName,
        repoRoot,
        logger: mockLogger,
      });



      expect(result.success).toBe(true);
      // 30 uploaded, 1 existing_verified
      expect(result.report.summary.uploadedCount).toBe(30);
      expect(result.report.summary.existingVerifiedCount).toBe(1);
      expect(mockClient.uploadCalls.length).toBe(30);

      const groomRecord = result.report.assets.find(
        (a) => a.targetPublicId === groomAsset.targetPublicId
      )!;
      expect(groomRecord.status).toBe("existing_verified");
    });

    it("converges on rerun when all assets are already uploaded", async () => {
      const manifest = createFixtureMediaManifest();

      const mockClient = new MockCloudinaryClient();
      const mockLogger = { log: () => {}, warn: () => {}, error: () => {} };

      // First run: uploads all 31
      const res1 = await executeCloudinaryMigration({
        manifest,
        client: mockClient,
        cloudName: targetCloudName,
        repoRoot,
        logger: mockLogger,
      });
      expect(res1.report.summary.uploadedCount).toBe(31);
      expect(res1.report.summary.existingVerifiedCount).toBe(0);

      // Second run: 0 uploads, 31 existing_verified
      const res2 = await executeCloudinaryMigration({
        manifest,
        client: mockClient,
        cloudName: targetCloudName,
        repoRoot,
        logger: mockLogger,
      });
      expect(res2.report.summary.uploadedCount).toBe(0);
      expect(res2.report.summary.existingVerifiedCount).toBe(31);
      expect(res2.report.summary.failedCount).toBe(0);
    });
  });

  describe("Conflict Refusal", () => {
    it("refuses overwrite and throws when existing asset has mismatched resource_type", async () => {
      const manifest = createFixtureMediaManifest();

      const mockClient = new MockCloudinaryClient();
      const mockLogger = { log: () => {}, warn: () => {}, error: () => {} };

      // Put an existing resource with conflicting resource_type (image instead of video for audio)
      const audioAsset = manifest.physicalAssets.find((a) => a.category === "audio")!;
      mockClient.resources.set(audioAsset.targetPublicId, {
        public_id: audioAsset.targetPublicId,
        format: "mp3",
        resource_type: "image", // WRONG
        bytes: 100000,
        secure_url: `https://res.cloudinary.com/${targetCloudName}/image/upload/v1/${audioAsset.targetPublicId}.mp3`,
      });

      await expect(
        executeCloudinaryMigration({
          manifest,
          client: mockClient,
          cloudName: targetCloudName,
          repoRoot,
          logger: mockLogger,
        })
      ).rejects.toThrow(/CONFLICT REFUSAL/i);

      // Ensure no uploads occurred
      expect(mockClient.uploadCalls.length).toBe(0);
    });

    it("refuses overwrite when existing asset points to old cloud name 'doig3gwek'", async () => {
      const manifest = createFixtureMediaManifest();

      const mockClient = new MockCloudinaryClient();
      const mockLogger = { log: () => {}, warn: () => {}, error: () => {} };

      const asset = manifest.physicalAssets[0];
      mockClient.resources.set(asset.targetPublicId, {
        public_id: asset.targetPublicId,
        format: "jpg",
        resource_type: "image",
        bytes: 100000,
        secure_url: `https://res.cloudinary.com/${OLD_CLOUDINARY_CLOUD_NAME}/image/upload/v1/${asset.targetPublicId}.jpg`,
      });

      await expect(
        executeCloudinaryMigration({
          manifest,
          client: mockClient,
          cloudName: targetCloudName,
          repoRoot,
          logger: mockLogger,
        })
      ).rejects.toThrow(/CONFLICT REFUSAL/i);
    });
  });

  describe("Partial Failure and Safe Stop", () => {
    it("halts safely on first upload failure, records partial results, and does not delete", async () => {
      const manifest = createFixtureMediaManifest();

      const mockClient = new MockCloudinaryClient();
      const mockLogger = { log: () => {}, warn: () => {}, error: () => {} };

      // Fail on the 3rd asset
      const thirdAsset = manifest.physicalAssets[2];
      mockClient.failUploadOnId = thirdAsset.targetPublicId;

      const result = await executeCloudinaryMigration({
        manifest,
        client: mockClient,
        cloudName: targetCloudName,
        repoRoot,
        logger: mockLogger,
      });



      expect(result.success).toBe(false);
      expect(result.report.summary.uploadedCount).toBe(30);
      expect(result.report.summary.failedCount).toBe(1);

      // Successfully uploaded assets remain stored in mockClient.resources (no deletion)
      expect(mockClient.resources.size).toBe(30);

      const failedRecord = result.report.assets.find(
        (a) => a.targetPublicId === thirdAsset.targetPublicId
      )!;
      expect(failedRecord.status).toBe("failed");
      expect(failedRecord.error).toContain("Simulated Cloudinary upload failure");
    });
  });

  describe("Report Verification Contract (verifyCloudinaryUploadReport)", () => {
    it("verifies a valid upload report successfully", async () => {
      const manifest = createFixtureMediaManifest();

      const mockClient = new MockCloudinaryClient();
      const mockLogger = { log: () => {}, warn: () => {}, error: () => {} };

      const result = await executeCloudinaryMigration({
        manifest,
        client: mockClient,
        cloudName: targetCloudName,
        repoRoot,
        logger: mockLogger,
      });



      const reportPath = path.join(tempDir, "cloudinary-upload-report.json");
      fs.writeFileSync(reportPath, JSON.stringify(result.report, null, 2), "utf-8");

      const verifyResult = verifyCloudinaryUploadReport({
        reportPath,
        expectedCloudName: targetCloudName,
      });

      expect(verifyResult.passed).toBe(true);
      expect(verifyResult.errors.length).toBe(0);
      expect(verifyResult.verifiedAssetsCount).toBe(31);
      expect(verifyResult.uploadedCount).toBe(31);
      expect(verifyResult.heroesVerifiedCount).toBe(4);
      expect(verifyResult.audiosVerifiedCount).toBe(4);
    });

    it("rejects report containing secret keywords or tokens", () => {
      const reportPath = path.join(tempDir, "leaked-report.json");
      const badReport = {
        mode: "stage-5b-upload",
        targetCloudName,
        generatedAt: new Date().toISOString(),
        summary: {},
        assets: [],
        externalEffects: {},
        leakedSecret: "CLOUDINARY_API_SECRET",
      };
      fs.writeFileSync(reportPath, JSON.stringify(badReport, null, 2), "utf-8");

      const verifyResult = verifyCloudinaryUploadReport({ reportPath });
      expect(verifyResult.passed).toBe(false);
      expect(verifyResult.errors.some((e) => e.includes("Secret keyword"))).toBe(true);
    });

    it("rejects report with targetCloudName === 'doig3gwek'", async () => {
      const manifest = createFixtureMediaManifest();

      const mockClient = new MockCloudinaryClient();
      const mockLogger = { log: () => {}, warn: () => {}, error: () => {} };

      const result = await executeCloudinaryMigration({
        manifest,
        client: mockClient,
        cloudName: targetCloudName,
        repoRoot,
        logger: mockLogger,
      });



      // Tamper cloud name
      result.report.targetCloudName = OLD_CLOUDINARY_CLOUD_NAME;
      const reportPath = path.join(tempDir, "bad-cloud-report.json");
      fs.writeFileSync(reportPath, JSON.stringify(result.report, null, 2), "utf-8");

      const verifyResult = verifyCloudinaryUploadReport({ reportPath });
      expect(verifyResult.passed).toBe(false);
      expect(verifyResult.errors.some((e) => e.includes("old account"))).toBe(true);
    });

    it("rejects report when hero asset is missing or failed", async () => {
      const manifest = createFixtureMediaManifest();

      const mockClient = new MockCloudinaryClient();
      const mockLogger = { log: () => {}, warn: () => {}, error: () => {} };

      const result = await executeCloudinaryMigration({
        manifest,
        client: mockClient,
        cloudName: targetCloudName,
        repoRoot,
        logger: mockLogger,
      });



      // Tamper hero asset status
      const hero = result.report.assets.find((a) =>
        a.targetPublicId.endsWith("/couple/hero")
      )!;
      hero.status = "failed";
      hero.error = "Simulated missing hero";

      const reportPath = path.join(tempDir, "bad-hero-report.json");
      fs.writeFileSync(reportPath, JSON.stringify(result.report, null, 2), "utf-8");

      const verifyResult = verifyCloudinaryUploadReport({ reportPath });
      expect(verifyResult.passed).toBe(false);
      expect(verifyResult.errors.some((e) => e.includes("Required hero asset"))).toBe(true);
    });

    it("rejects report when externalEffects.details makes inconsistent claims (CLOUD-04)", async () => {
      const manifest = createFixtureMediaManifest();

      const mockClient = new MockCloudinaryClient();
      const mockLogger = { log: () => {}, warn: () => {}, error: () => {} };

      const result = await executeCloudinaryMigration({
        manifest,
        client: mockClient,
        cloudName: targetCloudName,
        repoRoot,
        logger: mockLogger,
      });



      // Tamper details to claim a false hero count
      result.report.externalEffects.details = [
        "Target Cloudinary account: 'test-target-cloud'",
        "Verified 99/4 explicit heroes and 4/4 audio assets.",
      ];

      const reportPath = path.join(tempDir, "tampered-details-report.json");
      fs.writeFileSync(reportPath, JSON.stringify(result.report, null, 2), "utf-8");

      const verifyResult = verifyCloudinaryUploadReport({ reportPath });
      expect(verifyResult.passed).toBe(false);
      expect(
        verifyResult.errors.some((e) =>
          e.includes("externalEffects.details claims '99/4 explicit heroes'")
        )
      ).toBe(true);
    });
  });

  describe("Post-Upload Live Read-Back Hardening (CLOUD-02)", () => {
    it("fails migration if an uploaded asset is missing on post-upload live read-back", async () => {
      const manifest = createFixtureMediaManifest();

      const mockClient = new MockCloudinaryClient();
      const mockLogger = { log: () => {}, warn: () => {}, error: () => {} };

      // Simulate asset missing from target account on post-upload Admin API query
      const missingId = "ayawarta/production/invitations/rika-fauzi/couple/hero";
      mockClient.dropFromReadBackId = missingId;

      const result = await executeCloudinaryMigration({
        manifest,
        client: mockClient,
        cloudName: targetCloudName,
        repoRoot,
        logger: mockLogger,
      });



      expect(result.success).toBe(false);
      const droppedRecord = result.report.assets.find((a) => a.targetPublicId === missingId)!;
      expect(droppedRecord.status).toBe("failed");
      expect(droppedRecord.error).toContain("Missing from target account on post-upload live read-back");
    });
  });

  describe("Strong Existing-Resource Matching (CLOUD-03)", () => {
    it("rejects existing asset with mismatched dimensions or byte size as conflict", async () => {
      const manifest = createFixtureMediaManifest();

      const mockClient = new MockCloudinaryClient();
      const mockLogger = { log: () => {}, warn: () => {}, error: () => {} };

      // Seed hero with wrong byte size
      const heroId = "ayawarta/production/invitations/rika-fauzi/couple/hero";
      mockClient.resources.set(heroId, {
        public_id: heroId,
        format: "jpg",
        resource_type: "image",
        bytes: 999999, // Mismatched! Expected: 4151481
        width: 3877,
        height: 5816,
        secure_url: `https://res.cloudinary.com/${targetCloudName}/image/upload/v1/${heroId}.jpg`,
      });

      await expect(
        executeCloudinaryMigration({
          manifest,
          client: mockClient,
          cloudName: targetCloudName,
          repoRoot,
          logger: mockLogger,
        })
      ).rejects.toThrow(/CONFLICT REFUSAL.*Derived hero image byte size mismatch/i);
    });
  });

  describe("Strict Cloudinary Delivery URL Validation (CLOUD-04)", () => {
    it("accepts valid HTTPS delivery URL under expected cloud name", () => {
      const validUrl =
        `https://res.cloudinary.com/${targetCloudName}/image/upload/v12345/ayawarta/production/invitations/rika-fauzi/couple/hero.jpg`;
      const result = validateCloudinaryDeliveryUrl(validUrl, targetCloudName);
      expect(result.valid).toBe(true);
    });

    it("rejects non-HTTPS delivery URL", () => {
      const httpUrl =
        `http://res.cloudinary.com/${targetCloudName}/image/upload/v12345/hero.jpg`;
      const result = validateCloudinaryDeliveryUrl(httpUrl, targetCloudName);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Must use HTTPS");
    });

    it("rejects delivery URL with hostname other than res.cloudinary.com", () => {
      const badHostUrl =
        `https://malicious-res.cloudinary.com/${targetCloudName}/image/upload/v12345/hero.jpg`;
      const result = validateCloudinaryDeliveryUrl(badHostUrl, targetCloudName);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Hostname must be strictly 'res.cloudinary.com'");
    });

    it("rejects delivery URL containing query parameters or fragments", () => {
      const queryUrl =
        `https://res.cloudinary.com/${targetCloudName}/image/upload/v12345/hero.jpg?token=secret`;
      const resQuery = validateCloudinaryDeliveryUrl(queryUrl, targetCloudName);
      expect(resQuery.valid).toBe(false);
      expect(resQuery.reason).toContain("must not contain query parameters");

      const fragUrl =
        `https://res.cloudinary.com/${targetCloudName}/image/upload/v12345/hero.jpg#section`;
      const resFrag = validateCloudinaryDeliveryUrl(fragUrl, targetCloudName);
      expect(resFrag.valid).toBe(false);
      expect(resFrag.reason).toContain("must not contain hash fragments");
    });

    it("rejects delivery URL where first path segment is not expected target cloud name", () => {
      const wrongCloudUrl =
        `https://res.cloudinary.com/another-cloud-account/image/upload/v12345/hero.jpg`;
      const result = validateCloudinaryDeliveryUrl(wrongCloudUrl, targetCloudName);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("First path segment must be target cloud name");
    });

    it("rejects delivery URL pointing to old Cloudinary cloud name", () => {
      const oldCloudUrl =
        `https://res.cloudinary.com/${OLD_CLOUDINARY_CLOUD_NAME}/image/upload/v12345/hero.jpg`;
      const result = validateCloudinaryDeliveryUrl(oldCloudUrl, targetCloudName);
      expect(result.valid).toBe(false);
    });
  });
});

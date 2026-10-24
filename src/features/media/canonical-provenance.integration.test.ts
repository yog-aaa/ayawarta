import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { describe, expect, it } from "vitest";
import {
  STAGE_5B_UPLOAD_REPORT_SHA256,
  getCanonicalMediaAssetMap,
} from "./canonical-catalog";
import { assertLocalDatabaseTarget } from "@/features/invitations/db-guard";

describe("Canonical Media Provenance & Equality Verification (Stage 10B)", () => {
  const reportPath = path.resolve(
    process.cwd(),
    ".media-migration/cloudinary-upload-report.json"
  );

  describe("Stage 5B Upload Report Provenance", () => {
    it("strictly requires Stage 5B upload report file and matches pinned SHA-256", () => {
      expect(
        fs.existsSync(reportPath),
        `Stage 5B upload report not found at '${reportPath}'. Provenance cannot be verified without the accepted artifact.`
      ).toBe(true);

      const raw = fs.readFileSync(reportPath);
      const computedHash = crypto
        .createHash("sha256")
        .update(raw)
        .digest("hex")
        .toUpperCase();

      expect(computedHash).toBe(STAGE_5B_UPLOAD_REPORT_SHA256);
    });

    it("verifies 1:1 metadata equality across all 31 assets (including folder and originalName) against upload report", () => {
      expect(fs.existsSync(reportPath)).toBe(true);

      const raw = fs.readFileSync(reportPath, "utf-8");
      const report = JSON.parse(raw);

      expect(report.assets).toHaveLength(31);
      const catalogMap = getCanonicalMediaAssetMap();

      for (const repAsset of report.assets) {
        const canonical = catalogMap.get(repAsset.targetPublicId);
        expect(
          canonical,
          `Asset '${repAsset.targetPublicId}' from upload report missing from canonical catalog.`
        ).toBeDefined();

        // 1. Identity & Routing
        expect(canonical!.publicId).toBe(repAsset.targetPublicId);
        expect(canonical!.slug).toBe(repAsset.slug);
        expect(canonical!.category).toBe(repAsset.category);

        // 2. Folder binding
        const expectedFolder = `ayawarta/production/invitations/${repAsset.slug}/${repAsset.category}`;
        expect(canonical!.folder).toBe(expectedFolder);

        // 3. Original Name derived as basename of sourceLocation
        const cleanSourceLoc = repAsset.sourceLocation.split("?")[0].split("#")[0];
        const expectedOriginalName = path.basename(cleanSourceLoc);
        expect(canonical!.originalName).toBe(expectedOriginalName);

        // 4. Delivery URL and formats
        expect(canonical!.secureUrl).toBe(repAsset.secureUrl);
        expect(canonical!.format).toBe(repAsset.format);
        expect(canonical!.bytes).toBe(repAsset.bytes);

        // 5. Resource Type and Dimensions
        if (repAsset.resourceType === "video") {
          expect(canonical!.resourceType).toBe("AUDIO");
          expect(canonical!.width).toBeNull();
          expect(canonical!.height).toBeNull();
        } else {
          expect(canonical!.resourceType).toBe("IMAGE");
          expect(canonical!.width).toBe(repAsset.width);
          expect(canonical!.height).toBe(repAsset.height);
        }
      }
    });
  });

  describe("Local Database 31 MediaAsset Metadata Equality (Read-Only)", () => {
    it("verifies all 31 MediaAsset rows in local PostgreSQL match canonical catalog 1:1", async () => {
      assertLocalDatabaseTarget(process.env.DATABASE_URL);

      const { prisma } = await import("@/lib/server/db");
      try {
        const dbAssets = await prisma.mediaAsset.findMany({
          orderBy: { publicId: "asc" },
        });

        expect(dbAssets).toHaveLength(31);
        const catalogMap = getCanonicalMediaAssetMap();

        for (const dbAsset of dbAssets) {
          const canonical = catalogMap.get(dbAsset.publicId);
          expect(
            canonical,
            `Database MediaAsset '${dbAsset.publicId}' not in canonical catalog.`
          ).toBeDefined();

          expect(dbAsset.publicId).toBe(canonical!.publicId);
          expect(dbAsset.folder).toBe(canonical!.folder);
          expect(dbAsset.originalName).toBe(canonical!.originalName);
          expect(dbAsset.secureUrl).toBe(canonical!.secureUrl);
          expect(dbAsset.resourceType).toBe(canonical!.resourceType);
          expect(dbAsset.format).toBe(canonical!.format);
          expect(dbAsset.bytes).toBe(canonical!.bytes);
          if (canonical!.resourceType === "AUDIO") {
            // Audio assets have null canonical dimensions; DB from Stage 6 upload report stored 0 or null
            expect(dbAsset.width === null || dbAsset.width === 0).toBe(true);
            expect(dbAsset.height === null || dbAsset.height === 0).toBe(true);
          } else {
            expect(dbAsset.width).toBe(canonical!.width);
            expect(dbAsset.height).toBe(canonical!.height);
          }
        }
      } finally {
        await prisma.$disconnect();
      }
    });
  });
});

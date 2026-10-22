import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildDryRunReport,
  generateMediaManifest,
  validateLocalSource,
  validateRemoteCloudinaryUrl,
} from "./invitation-media-manifest";
import { validateInvitationPublicId } from "@/features/media/public-id";

describe("invitation-media-manifest", () => {
  const repoRoot = process.cwd();

  describe("remote URL validation (MEDIA-05)", () => {
    it("accepts valid HTTPS old Cloudinary URLs", () => {
      const validUrl =
        "https://res.cloudinary.com/doig3gwek/image/upload/v1758636624/PWD_Shidqi_im7frp.jpg";
      expect(validateRemoteCloudinaryUrl(validUrl).valid).toBe(true);
    });

    it("rejects non-HTTPS URLs", () => {
      const httpUrl =
        "http://res.cloudinary.com/doig3gwek/image/upload/v1758636624/PWD_Shidqi_im7frp.jpg";
      const result = validateRemoteCloudinaryUrl(httpUrl);
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/HTTPS/);
    });

    it("rejects URLs containing username or password credentials", () => {
      const userinfoUrl =
        "https://admin:secret@res.cloudinary.com/doig3gwek/image/upload/foo.jpg";
      const result = validateRemoteCloudinaryUrl(userinfoUrl);
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/user credentials/);
    });

    it("rejects URLs with non-default ports", () => {
      const customPortUrl =
        "https://res.cloudinary.com:8443/doig3gwek/image/upload/foo.jpg";
      const result = validateRemoteCloudinaryUrl(customPortUrl);
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/custom port/);
    });

    it("rejects URLs with query parameters", () => {
      const queryUrl =
        "https://res.cloudinary.com/doig3gwek/image/upload/foo.jpg?token=secret123";
      const result = validateRemoteCloudinaryUrl(queryUrl);
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/query parameters/);
    });

    it("rejects URLs with hash fragments", () => {
      const hashUrl =
        "https://res.cloudinary.com/doig3gwek/image/upload/foo.jpg#preview";
      const result = validateRemoteCloudinaryUrl(hashUrl);
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/hash fragments/);
    });

    it("rejects unapproved hostnames", () => {
      const evilUrl = "https://evil.com/doig3gwek/image/upload/foo.jpg";
      const result = validateRemoteCloudinaryUrl(evilUrl);
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/not in approved allowlist/);
    });

    it("rejects unapproved cloud account paths", () => {
      const wrongAccount =
        "https://res.cloudinary.com/other-cloud/image/upload/foo.jpg";
      const result = validateRemoteCloudinaryUrl(wrongAccount);
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/does not match old account prefix/);
    });
  });

  describe("local source validation and containment (MEDIA-01)", () => {
    it("accepts existing files inside both approved source roots", () => {
      // SAMPLE root
      const sampleFile = "/images/SAMPLE/FOTO - Fauzi.jpg";
      const result1 = validateLocalSource(sampleFile, repoRoot);
      expect(result1.valid).toBe(true);
      expect(result1.byteSize).toBeGreaterThan(0);
      expect(result1.posixRelativePath).toBe("public/images/SAMPLE/FOTO - Fauzi.jpg");

      // dummy-couples root
      const previewFile = "/images/dummy-couples/groom.jpg";
      const result2 = validateLocalSource(previewFile, repoRoot);
      expect(result2.valid).toBe(true);
      expect(result2.byteSize).toBeGreaterThan(0);
      expect(result2.posixRelativePath).toBe("public/images/dummy-couples/groom.jpg");
    });

    it("rejects normalized path traversal in raw input even if target exists", () => {
      // Even though /images/dummy-couples/groom.jpg exists, raw input contains '..'
      const traversalToExisting = "/images/SAMPLE/../dummy-couples/groom.jpg";
      const result = validateLocalSource(traversalToExisting, repoRoot);
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/path traversal/);
    });

    it("rejects sibling-prefix source paths", () => {
      const siblingPath = "/images/SAMPLE-sibling/FOTO.jpg";
      const result = validateLocalSource(siblingPath, repoRoot);
      expect(result.valid).toBe(false);
    });

    it("rejects null bytes in raw input", () => {
      const nullBytePath = "/images/SAMPLE/FOTO\0.jpg";
      const result = validateLocalSource(nullBytePath, repoRoot);
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/null bytes/);
    });

    it("rejects backslashes in raw input", () => {
      const backslashPath = "/images\\SAMPLE\\FOTO - Fauzi.jpg";
      const result = validateLocalSource(backslashPath, repoRoot);
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/backslashes/);
    });

    it("rejects drive letters and UNC paths in raw input", () => {
      const drivePath = "C:/images/SAMPLE/FOTO - Fauzi.jpg";
      expect(validateLocalSource(drivePath, repoRoot).valid).toBe(false);

      const uncPath = "//server/share/FOTO.jpg";
      expect(validateLocalSource(uncPath, repoRoot).valid).toBe(false);
    });

    it("rejects empty segments (consecutive slashes)", () => {
      const emptySegmentPath = "/images//SAMPLE/FOTO - Fauzi.jpg";
      const result = validateLocalSource(emptySegmentPath, repoRoot);
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/empty segments/);
    });

    it("rejects local sources outside approved source roots", () => {
      // Existing file in public/ but outside SAMPLE and dummy-couples
      const outsideFile = "/images/landing/payments/BCA.png";
      const result = validateLocalSource(outsideFile, repoRoot);
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/outside approved source roots/);
    });

    it("rejects non-existent local files", () => {
      const nonExistent = "/images/SAMPLE/does-not-exist.jpg";
      const result = validateLocalSource(nonExistent, repoRoot);
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/does not exist/);
    });

    it("rejects symlink or junction whose target escapes approved roots", () => {
      const sampleDir = path.resolve(repoRoot, "public/images/SAMPLE");
      const symlinkPath = path.join(sampleDir, "temp-test-symlink.jpg");
      const outsideTarget = path.resolve(repoRoot, "package.json");

      let symlinkCreated = false;
      try {
        fs.symlinkSync(outsideTarget, symlinkPath, "file");
        symlinkCreated = true;
      } catch {
        // On Windows without Developer Mode, creating symlinks may throw EPERM.
        // If symlink creation is not permitted, skip the filesystem mutation.
      }

      if (symlinkCreated) {
        try {
          const testInput = "/images/SAMPLE/temp-test-symlink.jpg";
          const result = validateLocalSource(testInput, repoRoot);
          expect(result.valid).toBe(false);
          expect(result.reason).toMatch(/outside approved source roots/);
        } finally {
          if (fs.existsSync(symlinkPath)) {
            fs.unlinkSync(symlinkPath);
          }
        }
      }
    });
  });

  describe("generateMediaManifest invariants", () => {
    const manifest = generateMediaManifest({ repoRoot });

    it("contains exactly the 4 approved production slugs", () => {
      expect(manifest.slugs).toEqual([
        "rika-fauzi",
        "shidqi-mita",
        "dudi-aini",
        "default-preview",
      ]);
      expect(manifest.summary.totalSlugs).toBe(4);
    });

    it("contains exactly 28 physical upload assets and 34 logical usages", () => {
      expect(manifest.physicalAssets.length).toBe(28);
      expect(manifest.logicalUsages.length).toBe(34);
      expect(manifest.summary.totalPhysicalAssets).toBe(28);
      expect(manifest.summary.totalLogicalUsages).toBe(34);
    });

    it("has 12 local physical assets and 16 remote physical assets", () => {
      expect(manifest.summary.totalLocalAssets).toBe(12);
      expect(manifest.summary.totalRemoteAssets).toBe(16);

      // Verify all local assets have non-null byteSize
      const localAssets = manifest.physicalAssets.filter(
        (a) => a.sourceType === "local"
      );
      expect(localAssets.length).toBe(12);
      for (const asset of localAssets) {
        expect(asset.byteSize).toBeTypeOf("number");
        expect(asset.byteSize).toBeGreaterThan(0);
      }

      // Verify all remote assets have null byteSize in offline dry-run
      const remoteAssets = manifest.physicalAssets.filter(
        (a) => a.sourceType === "remote"
      );
      expect(remoteAssets.length).toBe(16);
      for (const asset of remoteAssets) {
        expect(asset.byteSize).toBeNull();
      }
    });

    it("has 27 images and 1 audio resource (0 videos)", () => {
      expect(manifest.summary.totalImages).toBe(27);
      expect(manifest.summary.totalAudio).toBe(1);
      expect(manifest.summary.totalVideo).toBe(0);

      const audioAsset = manifest.physicalAssets.find(
        (a) => a.category === "audio"
      );
      expect(audioAsset).toBeDefined();
      expect(audioAsset?.slug).toBe("dudi-aini");
      expect(audioAsset?.cloudinaryResourceType).toBe("video");
      expect(audioAsset?.targetPublicId).toBe(
        "ayawarta/production/invitations/dudi-aini/audio/background-music"
      );
    });

    it("has exactly 1 hero usage per slug (4 heroes total)", () => {
      for (const slug of manifest.slugs) {
        const heroUsages = manifest.logicalUsages.filter(
          (u) => u.slug === slug && u.category === "couple" && u.role === "hero"
        );
        expect(heroUsages.length).toBe(1);
        expect(heroUsages[0].targetPublicId).toBe(
          `ayawarta/production/invitations/${slug}/couple/hero`
        );
        expect(manifest.summary.slugBreakdown[slug].heroTargetPublicId).toBe(
          `ayawarta/production/invitations/${slug}/couple/hero`
        );
      }
    });

    it("tracks asset reuse cleanly without duplicate uploads", () => {
      // rika-fauzi: 8 physical assets vs 9 logical usages
      expect(manifest.summary.slugBreakdown["rika-fauzi"].physicalAssets).toBe(8);
      expect(manifest.summary.slugBreakdown["rika-fauzi"].logicalUsages).toBe(9);

      // rika-fauzi hero is reused in gallery position 6
      const rikaHeroAsset = manifest.physicalAssets.find(
        (a) =>
          a.targetPublicId ===
          "ayawarta/production/invitations/rika-fauzi/couple/hero"
      );
      expect(rikaHeroAsset?.reusedInUsages).toContain("rika-fauzi:couple:hero");
      expect(rikaHeroAsset?.reusedInUsages).toContain("rika-fauzi:gallery:06");

      const rikaGallery6Usage = manifest.logicalUsages.find(
        (u) => u.usageId === "rika-fauzi:gallery:06"
      );
      expect(rikaGallery6Usage?.isReused).toBe(true);
      expect(rikaGallery6Usage?.targetPublicId).toBe(
        "ayawarta/production/invitations/rika-fauzi/couple/hero"
      );

      // default-preview: 4 physical assets vs 9 logical usages
      expect(
        manifest.summary.slugBreakdown["default-preview"].physicalAssets
      ).toBe(4);
      expect(
        manifest.summary.slugBreakdown["default-preview"].logicalUsages
      ).toBe(9);

      // default-preview photo-sample is reused in gallery 01..06
      const previewGallery1Asset = manifest.physicalAssets.find(
        (a) =>
          a.targetPublicId ===
          "ayawarta/production/invitations/default-preview/gallery/gallery-01"
      );
      expect(previewGallery1Asset?.reusedInUsages.length).toBe(6);

      const previewGalleryUsages = manifest.logicalUsages.filter(
        (u) => u.slug === "default-preview" && u.category === "gallery"
      );
      expect(previewGalleryUsages.length).toBe(6);
      expect(previewGalleryUsages[0].isReused).toBe(false);
      for (let i = 1; i < 6; i++) {
        expect(previewGalleryUsages[i].isReused).toBe(true);
        expect(previewGalleryUsages[i].targetPublicId).toBe(
          "ayawarta/production/invitations/default-preview/gallery/gallery-01"
        );
      }
    });

    it("ensures all gallery items have 1-indexed, sequential, unique positions", () => {
      for (const slug of manifest.slugs) {
        const galleryItems = manifest.logicalUsages
          .filter((u) => u.slug === slug && u.category === "gallery")
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

        galleryItems.forEach((item, index) => {
          expect(item.position).toBe(index + 1);
        });
      }
    });

    it("provides meaningful non-empty alt text for all image usages", () => {
      const imageUsages = manifest.logicalUsages.filter(
        (u) => u.category === "couple" || u.category === "gallery"
      );
      for (const usage of imageUsages) {
        expect(usage.altText).toBeDefined();
        expect(usage.altText?.trim().length).toBeGreaterThan(10);
      }
    });

    it("strictly validates all physical target public IDs", () => {
      for (const asset of manifest.physicalAssets) {
        const validation = validateInvitationPublicId(asset.targetPublicId);
        expect(validation.valid).toBe(true);
      }
    });

    it("has zero target public ID collisions", () => {
      const seenIds = new Set<string>();
      for (const asset of manifest.physicalAssets) {
        expect(seenIds.has(asset.targetPublicId)).toBe(false);
        seenIds.add(asset.targetPublicId);
      }
      expect(seenIds.size).toBe(28);
    });

    it("identifies exactly 3 unresolved YouTube music blockers", () => {
      expect(manifest.unresolvedMusicBlockers.length).toBe(3);
      expect(manifest.summary.unresolvedExternalMusicCount).toBe(3);

      const blockedSlugs = manifest.unresolvedMusicBlockers.map((b) => b.slug);
      expect(blockedSlugs).toEqual([
        "rika-fauzi",
        "shidqi-mita",
        "default-preview",
      ]);

      for (const blocker of manifest.unresolvedMusicBlockers) {
        expect(blocker.musicUrl).toMatch(/youtu/);
        expect(blocker.reason.length).toBeGreaterThan(5);
        expect(blocker.actionRequired.length).toBeGreaterThan(5);
      }
    });

    it("completely excludes galleryVideoUrl from manifest and blockers", () => {
      // Confirm no video in physical assets
      const videoAssets = manifest.physicalAssets.filter(
        (a) => a.category === "video"
      );
      expect(videoAssets.length).toBe(0);

      // Confirm no video in logical usages
      const videoUsages = manifest.logicalUsages.filter(
        (u) => u.category === "video"
      );
      expect(videoUsages.length).toBe(0);

      // Confirm Rickroll URL is not in physical assets or blockers
      const rickroll = "dQw4w9WgXcQ";
      const hasRickrollInAssets = manifest.physicalAssets.some((a) =>
        a.sourceLocation.includes(rickroll)
      );
      const hasRickrollInBlockers = manifest.unresolvedMusicBlockers.some((b) =>
        b.musicUrl.includes(rickroll)
      );
      expect(hasRickrollInAssets).toBe(false);
      expect(hasRickrollInBlockers).toBe(false);
    });

    it("is pure and deterministic across repeated runs", () => {
      const manifest1 = generateMediaManifest({ repoRoot });
      const manifest2 = generateMediaManifest({ repoRoot });
      expect(manifest1).toEqual(manifest2);
    });
  });

  describe("buildDryRunReport (MEDIA-03A)", () => {
    it("produces byte-for-byte identical reports across runs", () => {
      const manifest1 = generateMediaManifest({ repoRoot });
      const manifest2 = generateMediaManifest({ repoRoot });

      const report1 = buildDryRunReport(manifest1, "my-cloudinary-cloud");
      const report2 = buildDryRunReport(manifest2, "my-cloudinary-cloud");

      expect(JSON.stringify(report1)).toBe(JSON.stringify(report2));
      expect(report1.mode).toBe("dry-run");
      expect(report2.mode).toBe("dry-run");
    });

    it("builds a safe report without credential values", () => {
      const manifest = generateMediaManifest({ repoRoot });
      const report = buildDryRunReport(manifest, "my-cloudinary-cloud");

      expect(report.mode).toBe("dry-run");
      expect(report.stage5BProposedEffects.targetCloudName).toBe(
        "my-cloudinary-cloud"
      );
      expect(report.stage5BProposedEffects.databaseMutations).toBe(0);
      expect(report.stage5BProposedEffects.fileDeletions).toBe(0);
      expect(report.stage5BProposedEffects.totalUploads).toBe(28);

      const reportJson = JSON.stringify(report);
      // Ensure no sensitive substrings
      expect(reportJson).not.toMatch(/CLOUDINARY_API_SECRET/i);
      expect(reportJson).not.toMatch(/AUTH_SECRET/i);
      expect(reportJson).not.toMatch(/ADMIN_PASSWORD/i);
      expect(reportJson).not.toMatch(/DATABASE_URL/i);
    });
  });
});

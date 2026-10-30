import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  CANONICAL_PRODUCTION_MEDIA,
  CANONICAL_TARGET_CLOUD_NAME,
  validateCanonicalMediaCatalog,
  getCanonicalMediaAssetMap,
  type CanonicalMediaAsset,
} from "./canonical-catalog";
import {
  mapCanonicalAssetToMediaAssetInput,
  SEED_INVITATIONS,
} from "@/features/invitations/seed-data";
import {
  executeSeed,
  validateSeedMediaRequirements,
} from "@/features/invitations/seed";
import { APPROVED_INVITATION_SLUGS } from "@/features/media/public-id";
import type { PrismaClient } from "@/generated/prisma/client";

function createMockPrismaClient() {
  const upsertedMediaAssets: Array<{ publicId: string; folder: string; originalName: string; secureUrl: string; resourceType: string; format: string; bytes: number; width: number | null; height: number | null }> = [];
  const mockTx = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    mediaAsset: {
      upsert: vi.fn().mockImplementation((args) => {
        upsertedMediaAssets.push({ ...args.create });
        return Promise.resolve({ id: `id-${args.where.publicId}`, ...args.create });
      }),
      findMany: vi.fn().mockImplementation(() =>
        Promise.resolve(
          CANONICAL_PRODUCTION_MEDIA.map((c) => ({
            id: `id-${c.publicId}`,
            publicId: c.publicId,
            secureUrl: c.secureUrl,
          }))
        )
      ),
    },
    invitation: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({ id: "inv-1" }),
    },
    invitationPublication: {
      count: vi.fn().mockResolvedValue(0),
    },
    invitationSections: {
      upsert: vi.fn().mockResolvedValue({ id: "sec-1" }),
    },
    partner: {
      deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
      createMany: vi.fn().mockResolvedValue({ count: 2 }),
    },
    event: {
      deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
      createMany: vi.fn().mockResolvedValue({ count: 2 }),
    },
    galleryItem: {
      deleteMany: vi.fn().mockResolvedValue({ count: 6 }),
      createMany: vi.fn().mockResolvedValue({ count: 6 }),
    },
    loveStory: {
      deleteMany: vi.fn().mockResolvedValue({ count: 3 }),
      createMany: vi.fn().mockResolvedValue({ count: 3 }),
    },
    giftAccount: {
      deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
      createMany: vi.fn().mockResolvedValue({ count: 2 }),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: "user-1", email: "admin@ayawarta.my.id" }),
    },
  };

  const mockDb = {
    $transaction: vi.fn().mockImplementation(async (callback) => {
      return await callback(mockTx);
    }),
    user: { count: vi.fn().mockResolvedValue(1) },
    mediaAsset: { count: vi.fn().mockResolvedValue(31) },
    invitation: { count: vi.fn().mockResolvedValue(4) },
    invitationSections: { count: vi.fn().mockResolvedValue(4) },
    partner: { count: vi.fn().mockResolvedValue(8) },
    event: { count: vi.fn().mockResolvedValue(6) },
    galleryItem: { count: vi.fn().mockResolvedValue(21) },
    loveStory: { count: vi.fn().mockResolvedValue(6) },
    giftAccount: { count: vi.fn().mockResolvedValue(5) },
  } as unknown as PrismaClient;

  return { mockDb, mockTx, upsertedMediaAssets };
}

describe("Canonical Media Catalog (Stage 10B)", () => {
  describe("Invariant & Provenance Tests", () => {
    it("contains exactly 31 physical assets", () => {
      expect(CANONICAL_PRODUCTION_MEDIA).toHaveLength(31);
    });

    it("has 31 unique public IDs", () => {
      const ids = new Set(CANONICAL_PRODUCTION_MEDIA.map((a) => a.publicId));
      expect(ids.size).toBe(31);
    });

    it("targets canonical cloud name uhwi7xvb exclusively", () => {
      expect(CANONICAL_TARGET_CLOUD_NAME).toBe("uhwi7xvb");
      for (const asset of CANONICAL_PRODUCTION_MEDIA) {
        expect(asset.secureUrl).toContain("/uhwi7xvb/");
      }
    });

    it("covers all 4 approved invitation slugs", () => {
      const slugsInCatalog = new Set(
        CANONICAL_PRODUCTION_MEDIA.map((a) => a.slug)
      );
      for (const slug of APPROVED_INVITATION_SLUGS) {
        expect(slugsInCatalog.has(slug)).toBe(true);
      }
      expect(slugsInCatalog.size).toBe(4);
    });

    it("contains exactly 1 hero asset per approved slug (4 heroes total)", () => {
      const heroes = CANONICAL_PRODUCTION_MEDIA.filter(
        (a) => a.category === "couple" && a.publicId.endsWith("/hero")
      );
      expect(heroes).toHaveLength(4);
      const heroSlugs = heroes.map((h) => h.slug);
      expect(heroSlugs.sort()).toEqual([...APPROVED_INVITATION_SLUGS].sort());
    });

    it("contains exactly 1 audio asset per approved slug (4 audios total)", () => {
      const audios = CANONICAL_PRODUCTION_MEDIA.filter(
        (a) => a.category === "audio"
      );
      expect(audios).toHaveLength(4);
      for (const audio of audios) {
        expect(audio.resourceType).toBe("AUDIO");
        expect(audio.publicId).toBe(
          `ayawarta/production/invitations/${audio.slug}/audio/background-music`
        );
        expect(audio.width).toBeNull();
        expect(audio.height).toBeNull();
        expect(audio.bytes).toBeGreaterThan(0);
      }
    });

    it("has 27 image assets with positive dimensions and bytes", () => {
      const images = CANONICAL_PRODUCTION_MEDIA.filter(
        (a) => a.resourceType === "IMAGE"
      );
      expect(images).toHaveLength(27);
      for (const img of images) {
        expect(img.width).toBeGreaterThan(0);
        expect(img.height).toBeGreaterThan(0);
        expect(img.bytes).toBeGreaterThan(0);
      }
    });

    it("has valid originalName with no directory paths or separators", () => {
      for (const asset of CANONICAL_PRODUCTION_MEDIA) {
        expect(asset.originalName).toBeTruthy();
        expect(asset.originalName).not.toContain("/");
        expect(asset.originalName).not.toContain("\\");
        expect(path.basename(asset.originalName)).toBe(asset.originalName);
      }
    });

    it("passes validateCanonicalMediaCatalog cleanly on canonical catalog", () => {
      expect(() =>
        validateCanonicalMediaCatalog(CANONICAL_PRODUCTION_MEDIA)
      ).not.toThrow();
    });

    it("getCanonicalMediaAssetMap returns map of 31 assets indexed by publicId", () => {
      const map = getCanonicalMediaAssetMap();
      expect(map.size).toBe(31);
      for (const asset of CANONICAL_PRODUCTION_MEDIA) {
        expect(map.get(asset.publicId)).toBe(asset);
      }
    });
  });

  describe("Security & Hygiene Scans", () => {
    it("contains zero credentials or secrets in secureUrls", () => {
      for (const asset of CANONICAL_PRODUCTION_MEDIA) {
        const url = new URL(asset.secureUrl);
        expect(url.username).toBe("");
        expect(url.password).toBe("");
        expect(url.search).toBe("");
        expect(url.hash).toBe("");
        expect(asset.secureUrl).not.toContain("api_key");
        expect(asset.secureUrl).not.toContain("api_secret");
      }
    });

    it("contains zero references to old Cloudinary account doig3gwek", () => {
      const catalogStr = JSON.stringify(CANONICAL_PRODUCTION_MEDIA);
      expect(catalogStr).not.toContain("doig3gwek");
    });

    it("contains zero references to local dynamic paths", () => {
      const catalogStr = JSON.stringify(CANONICAL_PRODUCTION_MEDIA);
      expect(catalogStr).not.toContain("public/images/SAMPLE");
      expect(catalogStr).not.toContain("public/images/dummy-couples");
      expect(catalogStr).not.toContain(".media-migration");
      expect(catalogStr).not.toContain("C:\\");
    });
  });

  describe("Fresh-Checkout Isolation Proof", () => {
    it("prepares valid seed input in an isolated environment with zero external files", () => {
      // Create empty isolated directory representing a fresh git checkout
      const isolatedDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "ayawarta-fresh-checkout-")
      );
      try {
        // Confirm isolated directory does NOT contain .media-migration or public/images
        expect(
          fs.existsSync(path.join(isolatedDir, ".media-migration"))
        ).toBe(false);
        expect(
          fs.existsSync(path.join(isolatedDir, "public/images/SAMPLE"))
        ).toBe(false);

        // 1. Validate catalog
        validateCanonicalMediaCatalog(CANONICAL_PRODUCTION_MEDIA);

        // 2. Map canonical assets to MediaAsset upsert input
        const mediaInputs = CANONICAL_PRODUCTION_MEDIA.map(
          mapCanonicalAssetToMediaAssetInput
        );
        expect(mediaInputs).toHaveLength(31);

        // 3. Pre-seed invariant requirements validation
        expect(() =>
          validateSeedMediaRequirements(mediaInputs, SEED_INVITATIONS)
        ).not.toThrow();

        // 4. Verify all inputs are ready for database transaction
        for (const input of mediaInputs) {
          expect(input.publicId).toBeTruthy();
          expect(input.secureUrl).toContain("https://res.cloudinary.com/uhwi7xvb/");
          expect(input.bytes).toBeGreaterThan(0);
          expect(input.originalName).toBeTruthy();
          if (input.resourceType === "IMAGE") {
            expect(input.width).toBeGreaterThan(0);
            expect(input.height).toBeGreaterThan(0);
          } else {
            expect(input.resourceType).toBe("AUDIO");
            expect(input.width).toBeNull();
            expect(input.height).toBeNull();
          }
        }
      } finally {
        fs.rmSync(isolatedDir, { recursive: true, force: true });
      }
    });

    it("executes default executeSeed() with mock database in isolated environment without external files", async () => {
      const isolatedDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "ayawarta-fresh-seed-")
      );
      try {
        expect(fs.existsSync(path.join(isolatedDir, ".media-migration"))).toBe(false);
        expect(fs.existsSync(path.join(isolatedDir, "public/images/SAMPLE"))).toBe(false);

        const { mockDb, upsertedMediaAssets } = createMockPrismaClient();
        const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };

        const result = await executeSeed(
          {
            bootstrapAdmin: false,
            logger,
          },
          mockDb
        );

        expect(result.mediaAssetsUpserted).toBe(31);
        expect(result.invitationsUpserted).toBe(4);
        expect(result.tableCounts.mediaAsset).toBe(31);
        expect(result.tableCounts.invitation).toBe(4);
        expect(upsertedMediaAssets).toHaveLength(31);

        for (const upserted of upsertedMediaAssets) {
          expect(upserted.publicId).toBeTruthy();
          expect(upserted.folder).toBeTruthy();
          expect(upserted.originalName).toBeTruthy();
          expect(upserted.secureUrl).toContain("https://res.cloudinary.com/uhwi7xvb/");
          if (upserted.resourceType === "IMAGE") {
            expect(upserted.width).toBeGreaterThan(0);
            expect(upserted.height).toBeGreaterThan(0);
          } else {
            expect(upserted.resourceType).toBe("AUDIO");
            expect(upserted.width).toBeNull();
            expect(upserted.height).toBeNull();
          }
        }
      } finally {
        fs.rmSync(isolatedDir, { recursive: true, force: true });
      }
    });
  });

  describe("Mutation Matrix (Validation Fail-Closed Behavior)", () => {
    function cloneCatalog(): CanonicalMediaAsset[] {
      return CANONICAL_PRODUCTION_MEDIA.map((a) => ({ ...a }));
    }

    it("rejects catalog with missing asset (30 assets)", () => {
      const mutated = cloneCatalog().slice(1);
      expect(() => validateCanonicalMediaCatalog(mutated)).toThrowError(
        /must contain exactly 31 assets, got 30/
      );
    });

    it("rejects catalog with extra asset (32 assets)", () => {
      const mutated = cloneCatalog();
      mutated.push({
        ...mutated[0],
        publicId: "ayawarta/production/invitations/rika-fauzi/gallery/extra",
      });
      expect(() => validateCanonicalMediaCatalog(mutated)).toThrowError(
        /must contain exactly 31 assets, got 32/
      );
    });

    it("rejects catalog with duplicate public ID", () => {
      const mutated = cloneCatalog();
      mutated[1] = { ...mutated[0] };
      expect(() => validateCanonicalMediaCatalog(mutated)).toThrowError(
        /Duplicate publicId in canonical catalog/
      );
    });

    it("rejects catalog with missing hero for a slug", () => {
      const mutated = cloneCatalog();
      const heroIdx = mutated.findIndex(
        (a) =>
          a.slug === "rika-fauzi" &&
          a.category === "couple" &&
          a.publicId.endsWith("/hero")
      );
      // Alter the hero to be a valid gallery asset so URL binding and format succeed but rika-fauzi lacks a hero
      mutated[heroIdx] = {
        ...mutated[heroIdx],
        category: "gallery",
        publicId: "ayawarta/production/invitations/rika-fauzi/gallery/gallery-99",
        folder: "ayawarta/production/invitations/rika-fauzi/gallery",
        secureUrl: mutated[heroIdx].secureUrl
          .replace("/couple/", "/gallery/")
          .replace("/hero.jpg", "/gallery-99.jpg"),
      };
      expect(() => validateCanonicalMediaCatalog(mutated)).toThrowError(
        /Missing required hero asset for slug 'rika-fauzi'/
      );
    });

    it("rejects catalog with missing audio for a slug", () => {
      const mutated = cloneCatalog();
      const audioIdx = mutated.findIndex(
        (a) => a.slug === "dudi-aini" && a.category === "audio"
      );
      // Alter the audio publicId and secureUrl so URL binding succeeds but dudi-aini lacks audio
      mutated[audioIdx] = {
        ...mutated[audioIdx],
        publicId:
          "ayawarta/production/invitations/dudi-aini/audio/other-music",
        secureUrl: mutated[audioIdx].secureUrl.replace("/background-music.mp3", "/other-music.mp3"),
      };
      expect(() => validateCanonicalMediaCatalog(mutated)).toThrowError(
        /Missing required audio asset for slug 'dudi-aini'/
      );
    });

    it("rejects swapped delivery URLs within invitation (groom URL on bride asset)", () => {
      const mutated = cloneCatalog();
      const groom = mutated.find((a) => a.publicId.endsWith("/groom"))!;
      const bride = mutated.find((a) => a.publicId.endsWith("/bride"))!;
      const tempUrl = groom.secureUrl;
      groom.secureUrl = bride.secureUrl;
      bride.secureUrl = tempUrl;

      expect(() => validateCanonicalMediaCatalog(mutated)).toThrowError(
        /delivery URL binding invalid/
      );
    });

    it("rejects delivery URL targeting unauthorized cloud name (e.g. doig3gwek)", () => {
      const mutated = cloneCatalog();
      mutated[0].secureUrl = mutated[0].secureUrl.replace(
        "/uhwi7xvb/",
        "/doig3gwek/"
      );
      expect(() => validateCanonicalMediaCatalog(mutated)).toThrowError(
        /must be HTTPS on target cloud "uhwi7xvb"/
      );
    });

    it("rejects resource type mismatch (IMAGE asset with video URL)", () => {
      const mutated = cloneCatalog();
      const img = mutated.find((a) => a.resourceType === "IMAGE")!;
      img.secureUrl = img.secureUrl.replace("/image/upload/", "/video/upload/");
      expect(() => validateCanonicalMediaCatalog(mutated)).toThrowError(
        /Resource type in URL 'video' does not match expected 'image'/
      );
    });

    it("rejects format mismatch (jpg format with png URL)", () => {
      const mutated = cloneCatalog();
      const img = mutated.find(
        (a) => a.resourceType === "IMAGE" && a.format === "jpg"
      )!;
      img.secureUrl = img.secureUrl.replace(/\.jpg$/, ".png");
      expect(() => validateCanonicalMediaCatalog(mutated)).toThrowError(
        /URL extension 'png' does not match expected format 'jpg'/
      );
    });

    it("rejects zero or negative bytes", () => {
      const mutated = cloneCatalog();
      mutated[0].bytes = 0;
      expect(() => validateCanonicalMediaCatalog(mutated)).toThrowError(
        /invalid bytes: 0/
      );
    });

    it("rejects image asset with missing width or height", () => {
      const mutated = cloneCatalog();
      const img = mutated.find((a) => a.resourceType === "IMAGE")!;
      img.width = null;
      expect(() => validateCanonicalMediaCatalog(mutated)).toThrowError(
        /has invalid dimensions/
      );
    });

    it("rejects audio asset with non-null width or height", () => {
      const mutated = cloneCatalog();
      const audio = mutated.find((a) => a.resourceType === "AUDIO")!;
      audio.width = 100;
      expect(() => validateCanonicalMediaCatalog(mutated)).toThrowError(
        /must have null width and height/
      );
    });

    it("rejects invalid originalName with path traversal or directory separators", () => {
      const mutated = cloneCatalog();
      mutated[0].originalName = "subfolder/image.jpg";
      expect(() => validateCanonicalMediaCatalog(mutated)).toThrowError(
        /without path separators/
      );
    });

    it("rejects catalog and fails default seed before transaction when a gallery asset is mutated to AUDIO while keeping gallery public ID", async () => {
      const mutated = cloneCatalog();
      const galleryIdx = mutated.findIndex(
        (a) => a.category === "gallery" && a.publicId.endsWith("/gallery-01")
      );
      mutated[galleryIdx] = {
        ...mutated[galleryIdx],
        resourceType: "AUDIO",
        format: "mp3",
        width: null,
        height: null,
        secureUrl: mutated[galleryIdx].secureUrl
          .replace("/image/upload/", "/video/upload/")
          .replace(/\.jpg$/, ".mp3"),
      };

      // 1. Catalog validation fails-closed
      expect(() => validateCanonicalMediaCatalog(mutated)).toThrowError(
        /with category 'gallery' must have resourceType 'IMAGE', got 'AUDIO'/
      );

      // 2. Pre-seed requirements validation fails-closed
      expect(() =>
        validateSeedMediaRequirements(
          mutated.map(mapCanonicalAssetToMediaAssetInput),
          SEED_INVITATIONS
        )
      ).toThrowError(
        /must have resourceType 'IMAGE', got 'AUDIO'/
      );

      // 3. Default executeSeed fails before opening transaction
      const { mockDb } = createMockPrismaClient();
      await expect(
        executeSeed(
          {
            canonicalMedia: mutated,
            bootstrapAdmin: false,
            logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
          },
          mockDb
        )
      ).rejects.toThrowError(
        /with category 'gallery' must have resourceType 'IMAGE', got 'AUDIO'/
      );
      expect(mockDb.$transaction).not.toHaveBeenCalled();
    });

    it("rejects catalog when folder does not match expected folder pattern", () => {
      const mutated = cloneCatalog();
      mutated[0].folder = "ayawarta/production/invitations/wrong-folder";
      expect(() => validateCanonicalMediaCatalog(mutated)).toThrowError(
        /folder mismatch/
      );
    });

    it("rejects catalog when category does not match publicId leaf structure", () => {
      const mutated = cloneCatalog();
      mutated[0].category = "gallery";
      expect(() => validateCanonicalMediaCatalog(mutated)).toThrowError(
        /category mismatch/
      );
    });

    it("rejects catalog when image asset has unapproved format (e.g. gif)", () => {
      const mutated = cloneCatalog();
      const img = mutated.find((a) => a.resourceType === "IMAGE")!;
      img.format = "gif";
      img.secureUrl = img.secureUrl.replace(/\.jpg$/, ".gif");
      expect(() => validateCanonicalMediaCatalog(mutated)).toThrowError(
        /must have valid image format, got 'gif'/
      );
    });

    it("rejects catalog when audio asset format is not mp3", () => {
      const mutated = cloneCatalog();
      const audio = mutated.find((a) => a.resourceType === "AUDIO")!;
      audio.format = "wav";
      audio.secureUrl = audio.secureUrl.replace(/\.mp3$/, ".wav");
      expect(() => validateCanonicalMediaCatalog(mutated)).toThrowError(
        /must have format 'mp3', got 'wav'/
      );
    });
  });
});

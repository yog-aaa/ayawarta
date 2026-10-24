import { describe, expect, it, vi } from "vitest";
import {
  mapUploadAssetToMediaAssetInput,
  SEED_INVITATIONS,
} from "./seed-data";
import {
  reconcileUploadReport,
} from "./seed-report-reader";
import {
  executeSeed,
  validateSeedMediaRequirements,
} from "./seed";
import type { ValidatedCloudinaryUploadReport } from "@/features/media/schema";
import { CANONICAL_PRODUCTION_MEDIA } from "@/features/media/canonical-catalog";
import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Creates a valid, fully canonical mock report that matches CANONICAL_PRODUCTION_MEDIA 1:1.
 */
function createValidCanonicalMockReport(
  overrides?: Partial<ValidatedCloudinaryUploadReport>
): ValidatedCloudinaryUploadReport {
  const uploadedCount = 1;
  const existingVerifiedCount = 30;

  const assets: ValidatedCloudinaryUploadReport["assets"] =
    CANONICAL_PRODUCTION_MEDIA.map((c, idx) => ({
      id: c.publicId,
      slug: c.slug,
      category: c.category,
      targetPublicId: c.publicId,
      resourceType: c.resourceType === "AUDIO" ? "video" : "image",
      status: idx === 0 ? "uploaded" : "existing_verified",
      sourceType: "remote",
      sourceLocation: c.secureUrl,
      secureUrl: c.secureUrl,
      format: c.format,
      bytes: c.bytes,
      width: c.width ?? null,
      height: c.height ?? null,
      error: null,
    }));

  return {
    mode: "stage-5b-upload",
    targetCloudName: "uhwi7xvb",
    generatedAt: "2026-10-23T00:00:00.000Z",
    summary: {
      totalPhysicalAssets: 31,
      uploadedCount,
      existingVerifiedCount,
      failedCount: 0,
      imagesCount: 27,
      audioCount: 4,
      videoCount: 0,
      heroesVerifiedCount: 4,
      audiosVerifiedCount: 4,
      slugBreakdown: {
        "rika-fauzi": {
          totalAssets: 9,
          uploaded: 1,
          existingVerified: 8,
          failed: 0,
          heroTargetPublicId:
            "ayawarta/production/invitations/rika-fauzi/couple/hero",
          heroVerified: true,
          audioTargetPublicId:
            "ayawarta/production/invitations/rika-fauzi/audio/background-music",
          audioVerified: true,
        },
        "shidqi-mita": {
          totalAssets: 10,
          uploaded: 0,
          existingVerified: 10,
          failed: 0,
          heroTargetPublicId:
            "ayawarta/production/invitations/shidqi-mita/couple/hero",
          heroVerified: true,
          audioTargetPublicId:
            "ayawarta/production/invitations/shidqi-mita/audio/background-music",
          audioVerified: true,
        },
        "dudi-aini": {
          totalAssets: 7,
          uploaded: 0,
          existingVerified: 7,
          failed: 0,
          heroTargetPublicId:
            "ayawarta/production/invitations/dudi-aini/couple/hero",
          heroVerified: true,
          audioTargetPublicId:
            "ayawarta/production/invitations/dudi-aini/audio/background-music",
          audioVerified: true,
        },
        "default-preview": {
          totalAssets: 5,
          uploaded: 0,
          existingVerified: 5,
          failed: 0,
          heroTargetPublicId:
            "ayawarta/production/invitations/default-preview/couple/hero",
          heroVerified: true,
          audioTargetPublicId:
            "ayawarta/production/invitations/default-preview/audio/background-music",
          audioVerified: true,
        },
      },
    },
    assets,
    externalEffects: {
      targetCloudName: "uhwi7xvb",
      uploadsPerformed: 1,
      remoteFetched: 0,
      databaseMutations: 0,
      fileDeletions: 0,
      details: ["1 uploaded, 30 verified"],
    },
    ...overrides,
  };
}

describe("Seed Data Invariants & Timestamps (SEED-04)", () => {
  it("defines exactly 4 approved invitations", () => {
    expect(SEED_INVITATIONS).toHaveLength(4);
    const slugs = SEED_INVITATIONS.map((i) => i.slug);
    expect(slugs).toEqual([
      "rika-fauzi",
      "shidqi-mita",
      "dudi-aini",
      "default-preview",
    ]);
  });

  it("normalizes galleryVideoUrl properly: YouTube URL on default-preview, null on others", () => {
    const preview = SEED_INVITATIONS.find((i) => i.slug === "default-preview");
    expect(preview?.galleryVideoUrl).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    );

    const others = SEED_INVITATIONS.filter((i) => i.slug !== "default-preview");
    for (const inv of others) {
      expect(inv.galleryVideoUrl).toBeNull();
    }
  });

  it("defines exact deterministic WIB (+07:00) ISO instants for all wedding dates (SEED-04)", () => {
    const bySlug = Object.fromEntries(
      SEED_INVITATIONS.map((i) => [i.slug, i.weddingDate.toISOString()])
    );
    expect(bySlug).toEqual({
      "rika-fauzi": "2025-09-07T01:00:00.000Z",
      "shidqi-mita": "2025-10-12T02:00:00.000Z",
      "dudi-aini": "2025-12-21T01:00:00.000Z",
      "default-preview": "2025-10-28T01:00:00.000Z",
    });
  });

  it("maps upload asset to MediaAsset input correctly with audio as AUDIO", () => {
    const audioInput = mapUploadAssetToMediaAssetInput({
      id: "test-audio",
      slug: "rika-fauzi",
      category: "audio",
      targetPublicId:
        "ayawarta/production/invitations/rika-fauzi/audio/background-music",
      resourceType: "video",
      status: "uploaded",
      sourceType: "local",
      sourceLocation: ".media-migration/input/audio/rika-fauzi.mp3",
      secureUrl: "https://res.cloudinary.com/uhwi7xvb/video/upload/v1/song.mp3",
      format: "mp3",
      bytes: 5000000,
      width: null,
      height: null,
      error: null,
    });

    expect(audioInput.resourceType).toBe("AUDIO");
    expect(audioInput.folder).toBe(
      "ayawarta/production/invitations/rika-fauzi/audio"
    );
    expect(audioInput.originalName).toBe("rika-fauzi.mp3");
    expect(audioInput.bytes).toBe(5000000);
  });

  it("fails closed in mapUploadAssetToMediaAssetInput when bytes is zero or negative (SEED-03)", () => {
    expect(() =>
      mapUploadAssetToMediaAssetInput({
        id: "test-zero",
        slug: "rika-fauzi",
        category: "couple",
        targetPublicId: "ayawarta/production/invitations/rika-fauzi/couple/hero",
        resourceType: "image",
        status: "uploaded",
        sourceType: "local",
        sourceLocation: "public/images/SAMPLE/FOTO - Couple.jpg",
        secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1/hero.jpg",
        format: "jpg",
        bytes: 0,
        width: 100,
        height: 100,
        error: null,
      })
    ).toThrowError(/bytes must be a positive integer/);
  });

  it("fails closed in mapUploadAssetToMediaAssetInput when image dimensions are missing or non-positive (SEED-03)", () => {
    expect(() =>
      mapUploadAssetToMediaAssetInput({
        id: "test-no-dim",
        slug: "rika-fauzi",
        category: "couple",
        targetPublicId: "ayawarta/production/invitations/rika-fauzi/couple/hero",
        resourceType: "image",
        status: "uploaded",
        sourceType: "local",
        sourceLocation: "public/images/SAMPLE/FOTO - Couple.jpg",
        secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1/hero.jpg",
        format: "jpg",
        bytes: 100000,
        width: null,
        height: null,
        error: null,
      })
    ).toThrowError(/invalid dimensions/);
  });
});

describe("Report Reconciliation Mutation Matrix (SEED-03)", () => {
  it("passes reconciliation cleanly for valid canonical report", () => {
    const validReport = createValidCanonicalMockReport();
    const result = reconcileUploadReport(validReport);
    expect(result.targetCloudName).toBe("uhwi7xvb");
    expect(result.assets).toHaveLength(31);
  });

  it("rejects wrong target cloud name", () => {
    const report = createValidCanonicalMockReport({
      targetCloudName: "wrong-cloud",
    });
    expect(() => reconcileUploadReport(report)).toThrowError(
      /does not match expected target/
    );
  });

  it("rejects old Cloudinary account doig3gwek", () => {
    const report = createValidCanonicalMockReport({
      targetCloudName: "doig3gwek",
    });
    expect(() =>
      reconcileUploadReport(report, { targetCloudName: "doig3gwek" })
    ).toThrowError(/Cannot seed from old Cloudinary account/);
  });

  it("rejects report with duplicate public ID", () => {
    const report = createValidCanonicalMockReport();
    // Duplicate first asset over the second asset
    report.assets[1] = {
      ...report.assets[1],
      targetPublicId: report.assets[0].targetPublicId,
    };
    expect(() => reconcileUploadReport(report)).toThrowError(
      /Duplicate public ID found/
    );
  });

  it("rejects report with missing public ID (30 assets)", () => {
    const report = createValidCanonicalMockReport();
    report.assets = report.assets.slice(0, 30);
    expect(() => reconcileUploadReport(report)).toThrowError(
      /Upload report contains 30 assets; expected exactly 31/
    );
  });

  it("rejects report with extra public ID (32 assets)", () => {
    const report = createValidCanonicalMockReport();
    report.assets.push({
      ...report.assets[0],
      targetPublicId:
        "ayawarta/production/invitations/rika-fauzi/gallery/gallery-99",
    });
    expect(() => reconcileUploadReport(report)).toThrowError(
      /Upload report contains 32 assets; expected exactly 31/
    );
  });

  it("rejects report with substituted unauthorized public ID", () => {
    const report = createValidCanonicalMockReport();
    report.assets[0] = {
      ...report.assets[0],
      targetPublicId:
        "ayawarta/production/invitations/rika-fauzi/gallery/gallery-99",
    };
    expect(() => reconcileUploadReport(report)).toThrowError(
      /Unrecognized or extra public ID/
    );
  });

  it("rejects asset with failed status", () => {
    const report = createValidCanonicalMockReport();
    report.assets[0] = {
      ...report.assets[0],
      status: "failed",
      error: "Upload failed: network error",
    };
    expect(() => reconcileUploadReport(report)).toThrowError(
      /has failed status/
    );
  });

  it("rejects asset with zero bytes", () => {
    const report = createValidCanonicalMockReport();
    report.assets[0] = {
      ...report.assets[0],
      bytes: 0,
    };
    expect(() => reconcileUploadReport(report)).toThrowError(
      /non-positive byte size: 0/
    );
  });

  it("rejects image asset with missing dimensions", () => {
    const report = createValidCanonicalMockReport();
    report.assets[0] = {
      ...report.assets[0],
      width: null,
      height: null,
    };
    expect(() => reconcileUploadReport(report)).toThrowError(
      /invalid dimensions: nullxnull/
    );
  });

  it("rejects spoofed delivery URL with query params", () => {
    const report = createValidCanonicalMockReport();
    report.assets[0] = {
      ...report.assets[0],
      secureUrl:
        "https://res.cloudinary.com/uhwi7xvb/image/upload/v1/hero.jpg?token=malicious",
    };
    expect(() => reconcileUploadReport(report)).toThrowError(
      /query parameters/
    );
  });

  it("rejects delivery URL targeting wrong cloud prefix", () => {
    const report = createValidCanonicalMockReport();
    report.assets[0] = {
      ...report.assets[0],
      secureUrl:
        "https://res.cloudinary.com/doig3gwek/image/upload/v1/hero.jpg",
    };
    expect(() => reconcileUploadReport(report)).toThrowError(
      /First path segment must be target cloud name/
    );
  });

  it("rejects forged summary counters that do not match actual asset records", () => {
    const report = createValidCanonicalMockReport();
    report.summary.uploadedCount = 99; // Forged claim
    expect(() => reconcileUploadReport(report)).toThrowError(
      /Summary claims uploadedCount=99, actual asset records have 1/
    );
  });

  it("rejects mismatched category against canonical manifest", () => {
    const report = createValidCanonicalMockReport();
    report.assets[0] = {
      ...report.assets[0],
      category: "audio" as unknown as "couple", // Tampered category
    };
    expect(() => reconcileUploadReport(report)).toThrowError(
      /Category mismatch/
    );
  });
});

describe("Cloudinary Delivery URL to Canonical Public ID Binding Mutation Matrix (SEED-07)", () => {
  it("passes reconciliation cleanly on a valid canonical report with full binding validation", () => {
    const report = createValidCanonicalMockReport();
    const reconciled = reconcileUploadReport(report);
    expect(reconciled.targetCloudName).toBe("uhwi7xvb");
    expect(reconciled.assets).toHaveLength(31);
  });

  it("rejects swapped delivery URLs within the same invitation (groom URL placed on bride asset)", () => {
    const report = createValidCanonicalMockReport();
    const groomIdx = report.assets.findIndex(
      (a) => a.targetPublicId === "ayawarta/production/invitations/rika-fauzi/couple/groom"
    );
    const brideIdx = report.assets.findIndex(
      (a) => a.targetPublicId === "ayawarta/production/invitations/rika-fauzi/couple/bride"
    );
    expect(groomIdx).toBeGreaterThanOrEqual(0);
    expect(brideIdx).toBeGreaterThanOrEqual(0);

    // Swap secureUrls
    const tempUrl = report.assets[groomIdx].secureUrl;
    report.assets[groomIdx].secureUrl = report.assets[brideIdx].secureUrl;
    report.assets[brideIdx].secureUrl = tempUrl;

    expect(() => reconcileUploadReport(report)).toThrowError(
      /Invalid secureUrl binding for asset.*does not match expected public ID/
    );
  });

  it("rejects swapped delivery URLs across invitations (rika-fauzi hero URL placed on shidqi-mita hero asset)", () => {
    const report = createValidCanonicalMockReport();
    const rikaHeroIdx = report.assets.findIndex(
      (a) => a.targetPublicId === "ayawarta/production/invitations/rika-fauzi/couple/hero"
    );
    const shidqiHeroIdx = report.assets.findIndex(
      (a) => a.targetPublicId === "ayawarta/production/invitations/shidqi-mita/couple/hero"
    );
    expect(rikaHeroIdx).toBeGreaterThanOrEqual(0);
    expect(shidqiHeroIdx).toBeGreaterThanOrEqual(0);

    // Substitute rika-fauzi hero URL onto shidqi-mita hero asset
    report.assets[shidqiHeroIdx].secureUrl = report.assets[rikaHeroIdx].secureUrl;

    expect(() => reconcileUploadReport(report)).toThrowError(
      /Public ID segment mismatch at index 3: URL has 'rika-fauzi', expected 'shidqi-mita'/
    );
  });

  it("rejects delivery URL using wrong resource type (video segment for image asset)", () => {
    const report = createValidCanonicalMockReport();
    const imageAsset = report.assets.find((a) => a.resourceType === "image")!;
    imageAsset.secureUrl = imageAsset.secureUrl!.replace("/image/upload/", "/video/upload/");

    expect(() => reconcileUploadReport(report)).toThrowError(
      /Resource type in URL 'video' does not match expected 'image'/
    );
  });

  it("rejects audio asset delivery URL using wrong resource type (image segment for audio asset)", () => {
    const report = createValidCanonicalMockReport();
    const audioAsset = report.assets.find((a) => a.category === "audio")!;
    audioAsset.secureUrl = audioAsset.secureUrl!.replace("/video/upload/", "/image/upload/");

    expect(() => reconcileUploadReport(report)).toThrowError(
      /Resource type in URL 'image' does not match expected 'video'/
    );
  });

  it("rejects delivery URL with multiple version segments (upload/v123/v456/...)", () => {
    const report = createValidCanonicalMockReport();
    const asset = report.assets[0];
    asset.secureUrl = asset.secureUrl!.replace(/\/upload\/v\d+\//, "/upload/v123/v456/");

    expect(() => reconcileUploadReport(report)).toThrowError(
      /multiple version segments detected/
    );
  });

  it("rejects delivery URL with ambiguous version-like segment (upload/v123bad/...)", () => {
    const report = createValidCanonicalMockReport();
    const asset = report.assets[0];
    asset.secureUrl = asset.secureUrl!.replace(/\/upload\/v\d+\//, "/upload/v123bad/");

    expect(() => reconcileUploadReport(report)).toThrowError(
      /Ambiguous version-like segment 'v123bad'/
    );
  });

  it("rejects delivery URL with encoded dot-dot traversal (%2e%2e)", () => {
    const report = createValidCanonicalMockReport();
    const asset = report.assets[0];
    asset.secureUrl = asset.secureUrl!.replace(/\/upload\/v\d+\//, "/upload/v1/%2e%2e/");

    expect(() => reconcileUploadReport(report)).toThrowError(
      /prohibited traversal characters or encoded slashes\/dots/
    );
  });

  it("rejects delivery URL with literal dot-dot traversal (..)", () => {
    const report = createValidCanonicalMockReport();
    const asset = report.assets[0];
    asset.secureUrl = asset.secureUrl!.replace(/\/upload\/v\d+\//, "/upload/v1/../");

    expect(() => reconcileUploadReport(report)).toThrowError(
      /prohibited traversal characters or encoded slashes\/dots/
    );
  });

  it("rejects delivery URL with encoded slash (%2f)", () => {
    const report = createValidCanonicalMockReport();
    const asset = report.assets[0];
    asset.secureUrl = asset.secureUrl!.replace("/ayawarta/", "/ayawarta%2f");

    expect(() => reconcileUploadReport(report)).toThrowError(
      /prohibited traversal characters or encoded slashes\/dots/
    );
  });

  it("rejects delivery URL with encoded backslash (%5c)", () => {
    const report = createValidCanonicalMockReport();
    const asset = report.assets[0];
    asset.secureUrl = asset.secureUrl!.replace(/\/upload\/v\d+\//, "/upload/v1/%5c/");

    expect(() => reconcileUploadReport(report)).toThrowError(
      /prohibited traversal characters or encoded slashes\/dots/
    );
  });

  it("rejects delivery URL with credentials embedded in URL authority", () => {
    const report = createValidCanonicalMockReport();
    const asset = report.assets[0];
    asset.secureUrl = asset.secureUrl!.replace("https://res.cloudinary.com", "https://admin:secret@res.cloudinary.com");

    expect(() => reconcileUploadReport(report)).toThrowError(
      /URL must not contain credentials/
    );
  });

  it("rejects delivery URL with custom non-standard port", () => {
    const report = createValidCanonicalMockReport();
    const asset = report.assets[0];
    asset.secureUrl = asset.secureUrl!.replace("res.cloudinary.com", "res.cloudinary.com:8443");

    expect(() => reconcileUploadReport(report)).toThrowError(
      /custom port '8443'/
    );
  });

  it("rejects delivery URL with query parameters", () => {
    const report = createValidCanonicalMockReport();
    const asset = report.assets[0];
    asset.secureUrl = `${asset.secureUrl!}?token=secret`;

    expect(() => reconcileUploadReport(report)).toThrowError(
      /URL must not contain query parameters/
    );
  });

  it("rejects delivery URL with hash fragment", () => {
    const report = createValidCanonicalMockReport();
    const asset = report.assets[0];
    asset.secureUrl = `${asset.secureUrl!}#preview`;

    expect(() => reconcileUploadReport(report)).toThrowError(
      /URL must not contain hash fragment/
    );
  });

  it("rejects delivery URL with non-upload delivery type (e.g. fetch)", () => {
    const report = createValidCanonicalMockReport();
    const asset = report.assets[0];
    asset.secureUrl = asset.secureUrl!.replace("/upload/", "/fetch/");

    expect(() => reconcileUploadReport(report)).toThrowError(
      /Delivery type in URL must be 'upload', got 'fetch'/
    );
  });

  it("rejects delivery URL with mismatched file extension (.png on .jpg asset)", () => {
    const report = createValidCanonicalMockReport();
    const asset = report.assets[0];
    asset.format = "jpg";
    asset.secureUrl = asset.secureUrl!.replace(/\.jpg$/, ".png");

    expect(() => reconcileUploadReport(report)).toThrowError(
      /URL extension 'png' does not match expected format 'jpg'/
    );
  });
});

describe("Canonical Format Reconciliation Mutation Matrix (SEED-09)", () => {
  it("rejects report when both format and URL extension are simultaneously tampered (e.g. canonical jpg tampered to png)", () => {
    const report = createValidCanonicalMockReport();
    const asset = report.assets[0];
    // Canonical format is 'jpg'
    asset.format = "png";
    asset.secureUrl = asset.secureUrl!.replace(/\.jpg$/, ".png");

    // Both format and URL extension agree with 'png', but canonical manifest requires 'jpg'
    expect(() => reconcileUploadReport(report)).toThrowError(
      /Format mismatch for asset 'ayawarta\/production\/invitations\/rika-fauzi\/couple\/groom': report format='png', canonical format='jpg'/
    );
  });

  it("rejects report when asset format is tampered to webp while URL keeps jpg", () => {
    const report = createValidCanonicalMockReport();
    const asset = report.assets[0];
    asset.format = "webp";

    expect(() => reconcileUploadReport(report)).toThrowError(
      /Format mismatch for asset 'ayawarta\/production\/invitations\/rika-fauzi\/couple\/groom': report format='webp', canonical format='jpg'/
    );
  });

  it("accepts normalized jpeg extension when canonical format is jpg", () => {
    const report = createValidCanonicalMockReport();
    const asset = report.assets[0];
    asset.format = "jpeg";
    asset.secureUrl = asset.secureUrl!.replace(/\.jpg$/, ".jpeg");

    // Must pass cleanly because jpg and jpeg are normalized according to contract
    const result = reconcileUploadReport(report);
    expect(result.assets[0].format).toBe("jpeg");
  });
});

describe("Pre-Seed Invariant Validation (SEED-01)", () => {
  it("fails before write when required hero asset is missing from report", () => {
    const report = createValidCanonicalMockReport();
    report.assets = report.assets.filter(
      (a) =>
        a.targetPublicId !==
        "ayawarta/production/invitations/rika-fauzi/couple/hero"
    );

    expect(() => validateSeedMediaRequirements(report)).toThrowError(
      /Pre-seed validation failed: required hero asset/
    );
  });

  it("fails before write when required partner photo asset is missing from report", () => {
    const report = createValidCanonicalMockReport();
    report.assets = report.assets.filter(
      (a) =>
        a.targetPublicId !==
        "ayawarta/production/invitations/shidqi-mita/couple/groom"
    );

    expect(() => validateSeedMediaRequirements(report)).toThrowError(
      /Pre-seed validation failed: required photo asset/
    );
  });

  it("fails before write when required audio asset is missing from report", () => {
    const report = createValidCanonicalMockReport();
    report.assets = report.assets.filter(
      (a) =>
        a.targetPublicId !==
        "ayawarta/production/invitations/dudi-aini/audio/background-music"
    );

    expect(() => validateSeedMediaRequirements(report)).toThrowError(
      /Pre-seed validation failed: required audio asset/
    );
  });

  it("fails before write when a required gallery asset has resourceType AUDIO instead of IMAGE", () => {
    const report = createValidCanonicalMockReport();
    const galleryAsset = report.assets.find(
      (a) => a.category === "gallery"
    )!;
    galleryAsset.resourceType = "video"; // video in report translates to AUDIO in seed

    expect(() => validateSeedMediaRequirements(report)).toThrowError(
      /must have resourceType 'IMAGE', got 'AUDIO'/
    );
  });
});

describe("Atomic Interactive Transaction Rollback (SEED-01)", () => {
  it("executes all operations in a single interactive transaction and rolls back on failure", async () => {
    const report = createValidCanonicalMockReport();

    // Mock client tracking transaction boundary
    let transactionOpened = false;
    let transactionRolledBack = false;
    const mediaUpserts: string[] = [];

    const mockTx = {
      mediaAsset: {
        upsert: vi.fn().mockImplementation((args) => {
          mediaUpserts.push(args.where.publicId);
          return Promise.resolve({ id: `id-${args.where.publicId}`, ...args.create });
        }),
        findMany: vi.fn().mockImplementation(() =>
          Promise.resolve(
            report.assets.map((a) => ({
              id: `id-${a.targetPublicId}`,
              publicId: a.targetPublicId,
              secureUrl: a.secureUrl,
            }))
          )
        ),
      },
      invitation: {
        upsert: vi.fn().mockResolvedValue({ id: "inv-1" }),
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
        transactionOpened = true;
        try {
          return await callback(mockTx);
        } catch (err) {
          transactionRolledBack = true;
          throw err;
        }
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

    // Fault injection: fail after 5 media upserts
    await expect(
      executeSeed(
        {
          report,
          bootstrapAdmin: false,
          testFaultInjection: { failAfterMediaUpsertCount: 5 },
          logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
        },
        mockDb
      )
    ).rejects.toThrowError(/Injected fault after 5 media upserts/);

    expect(transactionOpened).toBe(true);
    expect(transactionRolledBack).toBe(true);
    expect(mediaUpserts).toHaveLength(5);
  });
});

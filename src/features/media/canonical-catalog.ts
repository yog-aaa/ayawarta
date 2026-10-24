import "server-only";

import type { InvitationSlug } from "@/features/media/types";
import { validateInvitationPublicId } from "@/features/media/public-id";
import { validateCloudinaryAssetBinding } from "@/features/media/cloudinary-uploader";

export const CANONICAL_TARGET_CLOUD_NAME = "uhwi7xvb";
export const STAGE_5B_UPLOAD_REPORT_SHA256 =
  "03BE7F497480598C66FEC7BB88D8015C5071FDA2BE966ECA3AE8860EA928EAF2";

export interface CanonicalMediaAsset {
  publicId: string;
  secureUrl: string;
  folder: string;
  resourceType: "IMAGE" | "AUDIO" | "VIDEO";
  format: string;
  bytes: number;
  width: number | null;
  height: number | null;
  originalName: string;
  slug: InvitationSlug;
  category: "couple" | "gallery" | "audio";
}

/**
 * Canonical Production Media Catalog (31 physical assets).
 * Git-tracked, server-only, zero secrets, zero local paths, zero old Cloudinary URLs.
 * Sourced strictly from the accepted Stage 5B Cloudinary upload report.
 */
export const CANONICAL_PRODUCTION_MEDIA: readonly CanonicalMediaAsset[] = [
  {
    publicId: "ayawarta/production/invitations/rika-fauzi/couple/groom",
    secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1792672610/ayawarta/production/invitations/rika-fauzi/couple/groom.jpg",
    folder: "ayawarta/production/invitations/rika-fauzi/couple",
    resourceType: "IMAGE",
    format: "jpg",
    bytes: 39975,
    width: 358,
    height: 358,
    originalName: "FOTO - Fauzi.jpg",
    slug: "rika-fauzi",
    category: "couple",
  },
  {
    publicId: "ayawarta/production/invitations/rika-fauzi/couple/bride",
    secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1792672611/ayawarta/production/invitations/rika-fauzi/couple/bride.jpg",
    folder: "ayawarta/production/invitations/rika-fauzi/couple",
    resourceType: "IMAGE",
    format: "jpg",
    bytes: 52473,
    width: 420,
    height: 420,
    originalName: "FOTO - Rika Widiarti.jpg",
    slug: "rika-fauzi",
    category: "couple",
  },
  {
    publicId: "ayawarta/production/invitations/rika-fauzi/couple/hero",
    secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1792675623/ayawarta/production/invitations/rika-fauzi/couple/hero.jpg",
    folder: "ayawarta/production/invitations/rika-fauzi/couple",
    resourceType: "IMAGE",
    format: "jpg",
    bytes: 4151481,
    width: 3877,
    height: 5816,
    originalName: "rika-fauzi-hero.jpg",
    slug: "rika-fauzi",
    category: "couple",
  },
  {
    publicId: "ayawarta/production/invitations/rika-fauzi/gallery/gallery-01",
    secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1792673109/ayawarta/production/invitations/rika-fauzi/gallery/gallery-01.jpg",
    folder: "ayawarta/production/invitations/rika-fauzi/gallery",
    resourceType: "IMAGE",
    format: "jpg",
    bytes: 77204,
    width: 694,
    height: 1040,
    originalName: "IMG-20250802-WA0006.jpg",
    slug: "rika-fauzi",
    category: "gallery",
  },
  {
    publicId: "ayawarta/production/invitations/rika-fauzi/gallery/gallery-02",
    secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1792673110/ayawarta/production/invitations/rika-fauzi/gallery/gallery-02.jpg",
    folder: "ayawarta/production/invitations/rika-fauzi/gallery",
    resourceType: "IMAGE",
    format: "jpg",
    bytes: 85523,
    width: 694,
    height: 1040,
    originalName: "IMG-20250802-WA0005.jpg",
    slug: "rika-fauzi",
    category: "gallery",
  },
  {
    publicId: "ayawarta/production/invitations/rika-fauzi/gallery/gallery-03",
    secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1792673110/ayawarta/production/invitations/rika-fauzi/gallery/gallery-03.jpg",
    folder: "ayawarta/production/invitations/rika-fauzi/gallery",
    resourceType: "IMAGE",
    format: "jpg",
    bytes: 76500,
    width: 694,
    height: 1040,
    originalName: "IMG-20250802-WA0007.jpg",
    slug: "rika-fauzi",
    category: "gallery",
  },
  {
    publicId: "ayawarta/production/invitations/rika-fauzi/gallery/gallery-04",
    secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1792673111/ayawarta/production/invitations/rika-fauzi/gallery/gallery-04.jpg",
    folder: "ayawarta/production/invitations/rika-fauzi/gallery",
    resourceType: "IMAGE",
    format: "jpg",
    bytes: 66015,
    width: 694,
    height: 1040,
    originalName: "IMG-20250802-WA0008.jpg",
    slug: "rika-fauzi",
    category: "gallery",
  },
  {
    publicId: "ayawarta/production/invitations/rika-fauzi/gallery/gallery-05",
    secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1792673112/ayawarta/production/invitations/rika-fauzi/gallery/gallery-05.jpg",
    folder: "ayawarta/production/invitations/rika-fauzi/gallery",
    resourceType: "IMAGE",
    format: "jpg",
    bytes: 84204,
    width: 694,
    height: 1040,
    originalName: "IMG-20250802-WA0009.jpg",
    slug: "rika-fauzi",
    category: "gallery",
  },
  {
    publicId: "ayawarta/production/invitations/rika-fauzi/audio/background-music",
    secureUrl: "https://res.cloudinary.com/uhwi7xvb/video/upload/v1792673129/ayawarta/production/invitations/rika-fauzi/audio/background-music.mp3",
    folder: "ayawarta/production/invitations/rika-fauzi/audio",
    resourceType: "AUDIO",
    format: "mp3",
    bytes: 7369389,
    width: null,
    height: null,
    originalName: "rika-fauzi.mp3",
    slug: "rika-fauzi",
    category: "audio",
  },
  {
    publicId: "ayawarta/production/invitations/shidqi-mita/couple/groom",
    secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1792673131/ayawarta/production/invitations/shidqi-mita/couple/groom.jpg",
    folder: "ayawarta/production/invitations/shidqi-mita/couple",
    resourceType: "IMAGE",
    format: "jpg",
    bytes: 1147728,
    width: 3105,
    height: 3105,
    originalName: "PWD_Shidqi_im7frp.jpg",
    slug: "shidqi-mita",
    category: "couple",
  },
  {
    publicId: "ayawarta/production/invitations/shidqi-mita/couple/bride",
    secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1792673132/ayawarta/production/invitations/shidqi-mita/couple/bride.jpg",
    folder: "ayawarta/production/invitations/shidqi-mita/couple",
    resourceType: "IMAGE",
    format: "jpg",
    bytes: 521743,
    width: 2138,
    height: 2138,
    originalName: "PWD_Mita_xeonoq.jpg",
    slug: "shidqi-mita",
    category: "couple",
  },
  {
    publicId: "ayawarta/production/invitations/shidqi-mita/couple/hero",
    secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1792673132/ayawarta/production/invitations/shidqi-mita/couple/hero.jpg",
    folder: "ayawarta/production/invitations/shidqi-mita/couple",
    resourceType: "IMAGE",
    format: "jpg",
    bytes: 872913,
    width: 2226,
    height: 2226,
    originalName: "couple_mnq0zf.jpg",
    slug: "shidqi-mita",
    category: "couple",
  },
  {
    publicId: "ayawarta/production/invitations/shidqi-mita/gallery/gallery-01",
    secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1792673133/ayawarta/production/invitations/shidqi-mita/gallery/gallery-01.jpg",
    folder: "ayawarta/production/invitations/shidqi-mita/gallery",
    resourceType: "IMAGE",
    format: "jpg",
    bytes: 2629512,
    width: 5795,
    height: 3863,
    originalName: "PWD_Mita_Shidqi-11_-_Shidqi_Nurpermadi_m4edz9.jpg",
    slug: "shidqi-mita",
    category: "gallery",
  },
  {
    publicId: "ayawarta/production/invitations/shidqi-mita/gallery/gallery-02",
    secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1792673134/ayawarta/production/invitations/shidqi-mita/gallery/gallery-02.jpg",
    folder: "ayawarta/production/invitations/shidqi-mita/gallery",
    resourceType: "IMAGE",
    format: "jpg",
    bytes: 2108116,
    width: 4000,
    height: 6000,
    originalName: "PWD_Mita_Shidqi-15_-_Shidqi_Nurpermadi_yslkig.jpg",
    slug: "shidqi-mita",
    category: "gallery",
  },
  {
    publicId: "ayawarta/production/invitations/shidqi-mita/gallery/gallery-03",
    secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1792673135/ayawarta/production/invitations/shidqi-mita/gallery/gallery-03.jpg",
    folder: "ayawarta/production/invitations/shidqi-mita/gallery",
    resourceType: "IMAGE",
    format: "jpg",
    bytes: 2258210,
    width: 4000,
    height: 6000,
    originalName: "PWD_Mita_Shidqi-6_-_Shidqi_Nurpermadi_hfa8yt.jpg",
    slug: "shidqi-mita",
    category: "gallery",
  },
  {
    publicId: "ayawarta/production/invitations/shidqi-mita/gallery/gallery-04",
    secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1792673136/ayawarta/production/invitations/shidqi-mita/gallery/gallery-04.jpg",
    folder: "ayawarta/production/invitations/shidqi-mita/gallery",
    resourceType: "IMAGE",
    format: "jpg",
    bytes: 2513175,
    width: 4000,
    height: 6000,
    originalName: "PWD_Mita_Shidqi-26_-_Shidqi_Nurpermadi_txf0mo.jpg",
    slug: "shidqi-mita",
    category: "gallery",
  },
  {
    publicId: "ayawarta/production/invitations/shidqi-mita/gallery/gallery-05",
    secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1792673137/ayawarta/production/invitations/shidqi-mita/gallery/gallery-05.jpg",
    folder: "ayawarta/production/invitations/shidqi-mita/gallery",
    resourceType: "IMAGE",
    format: "jpg",
    bytes: 2697506,
    width: 4000,
    height: 6000,
    originalName: "PWD_Mita_Shidqi-19_-_Shidqi_Nurpermadi_cxl1ba.jpg",
    slug: "shidqi-mita",
    category: "gallery",
  },
  {
    publicId: "ayawarta/production/invitations/shidqi-mita/gallery/gallery-06",
    secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1792673138/ayawarta/production/invitations/shidqi-mita/gallery/gallery-06.jpg",
    folder: "ayawarta/production/invitations/shidqi-mita/gallery",
    resourceType: "IMAGE",
    format: "jpg",
    bytes: 2601862,
    width: 4000,
    height: 6000,
    originalName: "PWD_Mita_Shidqi-5_-_Shidqi_Nurpermadi_znxxvw.jpg",
    slug: "shidqi-mita",
    category: "gallery",
  },
  {
    publicId: "ayawarta/production/invitations/shidqi-mita/audio/background-music",
    secureUrl: "https://res.cloudinary.com/uhwi7xvb/video/upload/v1792673145/ayawarta/production/invitations/shidqi-mita/audio/background-music.mp3",
    folder: "ayawarta/production/invitations/shidqi-mita/audio",
    resourceType: "AUDIO",
    format: "mp3",
    bytes: 2263386,
    width: null,
    height: null,
    originalName: "shidqi-mita.mp3",
    slug: "shidqi-mita",
    category: "audio",
  },
  {
    publicId: "ayawarta/production/invitations/dudi-aini/couple/groom",
    secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1792673146/ayawarta/production/invitations/dudi-aini/couple/groom.jpg",
    folder: "ayawarta/production/invitations/dudi-aini/couple",
    resourceType: "IMAGE",
    format: "jpg",
    bytes: 61278,
    width: 602,
    height: 602,
    originalName: "dudi_aiwaeh.jpg",
    slug: "dudi-aini",
    category: "couple",
  },
  {
    publicId: "ayawarta/production/invitations/dudi-aini/couple/bride",
    secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1792673147/ayawarta/production/invitations/dudi-aini/couple/bride.jpg",
    folder: "ayawarta/production/invitations/dudi-aini/couple",
    resourceType: "IMAGE",
    format: "jpg",
    bytes: 70176,
    width: 602,
    height: 602,
    originalName: "aini_ru5pui.jpg",
    slug: "dudi-aini",
    category: "couple",
  },
  {
    publicId: "ayawarta/production/invitations/dudi-aini/couple/hero",
    secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1792673148/ayawarta/production/invitations/dudi-aini/couple/hero.jpg",
    folder: "ayawarta/production/invitations/dudi-aini/couple",
    resourceType: "IMAGE",
    format: "jpg",
    bytes: 175469,
    width: 1280,
    height: 738,
    originalName: "hero_byywfn.jpg",
    slug: "dudi-aini",
    category: "couple",
  },
  {
    publicId: "ayawarta/production/invitations/dudi-aini/gallery/gallery-01",
    secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1792673149/ayawarta/production/invitations/dudi-aini/gallery/gallery-01.jpg",
    folder: "ayawarta/production/invitations/dudi-aini/gallery",
    resourceType: "IMAGE",
    format: "jpg",
    bytes: 100969,
    width: 1280,
    height: 853,
    originalName: "heroImage_blhgl5.jpg",
    slug: "dudi-aini",
    category: "gallery",
  },
  {
    publicId: "ayawarta/production/invitations/dudi-aini/gallery/gallery-02",
    secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1792673150/ayawarta/production/invitations/dudi-aini/gallery/gallery-02.jpg",
    folder: "ayawarta/production/invitations/dudi-aini/gallery",
    resourceType: "IMAGE",
    format: "jpg",
    bytes: 112653,
    width: 1280,
    height: 853,
    originalName: "2_ladbgf.jpg",
    slug: "dudi-aini",
    category: "gallery",
  },
  {
    publicId: "ayawarta/production/invitations/dudi-aini/gallery/gallery-03",
    secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1792673151/ayawarta/production/invitations/dudi-aini/gallery/gallery-03.jpg",
    folder: "ayawarta/production/invitations/dudi-aini/gallery",
    resourceType: "IMAGE",
    format: "jpg",
    bytes: 164663,
    width: 1280,
    height: 642,
    originalName: "foto_4_w4msfb.jpg",
    slug: "dudi-aini",
    category: "gallery",
  },
  {
    publicId: "ayawarta/production/invitations/dudi-aini/audio/background-music",
    secureUrl: "https://res.cloudinary.com/uhwi7xvb/video/upload/v1792673152/ayawarta/production/invitations/dudi-aini/audio/background-music.mp3",
    folder: "ayawarta/production/invitations/dudi-aini/audio",
    resourceType: "AUDIO",
    format: "mp3",
    bytes: 888923,
    width: null,
    height: null,
    originalName: "lagu_ruirls.mp3",
    slug: "dudi-aini",
    category: "audio",
  },
  {
    publicId: "ayawarta/production/invitations/default-preview/couple/groom",
    secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1792673152/ayawarta/production/invitations/default-preview/couple/groom.jpg",
    folder: "ayawarta/production/invitations/default-preview/couple",
    resourceType: "IMAGE",
    format: "jpg",
    bytes: 14694,
    width: 474,
    height: 336,
    originalName: "groom.jpg",
    slug: "default-preview",
    category: "couple",
  },
  {
    publicId: "ayawarta/production/invitations/default-preview/couple/bride",
    secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1792673153/ayawarta/production/invitations/default-preview/couple/bride.jpg",
    folder: "ayawarta/production/invitations/default-preview/couple",
    resourceType: "IMAGE",
    format: "jpg",
    bytes: 6496,
    width: 284,
    height: 177,
    originalName: "bride.jpg",
    slug: "default-preview",
    category: "couple",
  },
  {
    publicId: "ayawarta/production/invitations/default-preview/couple/hero",
    secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1792673154/ayawarta/production/invitations/default-preview/couple/hero.png",
    folder: "ayawarta/production/invitations/default-preview/couple",
    resourceType: "IMAGE",
    format: "png",
    bytes: 91606,
    width: 512,
    height: 512,
    originalName: "hero.png",
    slug: "default-preview",
    category: "couple",
  },
  {
    publicId: "ayawarta/production/invitations/default-preview/gallery/gallery-01",
    secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1792673155/ayawarta/production/invitations/default-preview/gallery/gallery-01.jpg",
    folder: "ayawarta/production/invitations/default-preview/gallery",
    resourceType: "IMAGE",
    format: "jpg",
    bytes: 205219,
    width: 1024,
    height: 1024,
    originalName: "photo-sample.jpg",
    slug: "default-preview",
    category: "gallery",
  },
  {
    publicId: "ayawarta/production/invitations/default-preview/audio/background-music",
    secureUrl: "https://res.cloudinary.com/uhwi7xvb/video/upload/v1792673161/ayawarta/production/invitations/default-preview/audio/background-music.mp3",
    folder: "ayawarta/production/invitations/default-preview/audio",
    resourceType: "AUDIO",
    format: "mp3",
    bytes: 2263386,
    width: null,
    height: null,
    originalName: "default-preview.mp3",
    slug: "default-preview",
    category: "audio",
  },
] as const;

export class CanonicalCatalogValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CanonicalCatalogValidationError";
  }
}

/**
 * Validates the canonical media catalog fail-closed against all invariants.
 */
export function validateCanonicalMediaCatalog(
  assets: readonly CanonicalMediaAsset[] = CANONICAL_PRODUCTION_MEDIA
): void {
  if (assets.length !== 31) {
    throw new CanonicalCatalogValidationError(
      `Canonical catalog must contain exactly 31 assets, got ${assets.length}.`
    );
  }

  const seenPublicIds = new Set<string>();

  for (const asset of assets) {
    if (!asset.publicId || typeof asset.publicId !== "string") {
      throw new CanonicalCatalogValidationError("Asset missing publicId.");
    }
    if (seenPublicIds.has(asset.publicId)) {
      throw new CanonicalCatalogValidationError(
        `Duplicate publicId in canonical catalog: "${asset.publicId}".`
      );
    }
    seenPublicIds.add(asset.publicId);

    // Public ID structure, slug, and category validation
    const pidVal = validateInvitationPublicId(asset.publicId);
    if (!pidVal.valid) {
      throw new CanonicalCatalogValidationError(
        `Asset "${asset.publicId}" has invalid publicId: ${pidVal.reason}`
      );
    }
    if (pidVal.parsed.slug !== asset.slug) {
      throw new CanonicalCatalogValidationError(
        `Asset "${asset.publicId}" slug mismatch: publicId says '${pidVal.parsed.slug}', asset says '${asset.slug}'.`
      );
    }
    if (pidVal.parsed.category !== asset.category) {
      throw new CanonicalCatalogValidationError(
        `Asset "${asset.publicId}" category mismatch: publicId says '${pidVal.parsed.category}', asset says '${asset.category}'.`
      );
    }

    // Folder and path binding
    const expectedFolder = `ayawarta/production/invitations/${asset.slug}/${asset.category}`;
    if (asset.folder !== expectedFolder) {
      throw new CanonicalCatalogValidationError(
        `Asset "${asset.publicId}" folder mismatch: expected '${expectedFolder}', got '${asset.folder}'.`
      );
    }
    if (!asset.publicId.startsWith(`${expectedFolder}/`)) {
      throw new CanonicalCatalogValidationError(
        `Asset "${asset.publicId}" does not reside inside folder '${expectedFolder}'.`
      );
    }

    // Category <-> ResourceType binding
    if (asset.category === "gallery" || asset.category === "couple") {
      if (asset.resourceType !== "IMAGE") {
        throw new CanonicalCatalogValidationError(
          `Asset "${asset.publicId}" with category '${asset.category}' must have resourceType 'IMAGE', got '${asset.resourceType}'.`
        );
      }
    } else if (asset.category === "audio") {
      if (asset.resourceType !== "AUDIO") {
        throw new CanonicalCatalogValidationError(
          `Asset "${asset.publicId}" with category 'audio' must have resourceType 'AUDIO', got '${asset.resourceType}'.`
        );
      }
    }

    // ResourceType <-> Format binding
    if (asset.resourceType === "AUDIO") {
      if (asset.format !== "mp3") {
        throw new CanonicalCatalogValidationError(
          `Audio asset "${asset.publicId}" must have format 'mp3', got '${asset.format}'.`
        );
      }
    } else if (asset.resourceType === "IMAGE") {
      const allowedImageFormats = ["jpg", "jpeg", "png", "webp"];
      if (!allowedImageFormats.includes(asset.format)) {
        throw new CanonicalCatalogValidationError(
          `Image asset "${asset.publicId}" must have valid image format, got '${asset.format}'.`
        );
      }
    }

    if (!asset.secureUrl || !asset.secureUrl.startsWith(`https://res.cloudinary.com/${CANONICAL_TARGET_CLOUD_NAME}/`)) {
      throw new CanonicalCatalogValidationError(
        `Asset "${asset.publicId}" has invalid secureUrl: must be HTTPS on target cloud "${CANONICAL_TARGET_CLOUD_NAME}".`
      );
    }

    const bindingRes = validateCloudinaryAssetBinding({
      secureUrl: asset.secureUrl,
      expectedCloudName: CANONICAL_TARGET_CLOUD_NAME,
      expectedResourceType: asset.resourceType === "AUDIO" ? "video" : "image",
      expectedPublicId: asset.publicId,
      expectedFormat: asset.format,
    });
    if (!bindingRes.valid) {
      throw new CanonicalCatalogValidationError(
        `Asset "${asset.publicId}" delivery URL binding invalid: ${bindingRes.reason}`
      );
    }

    if (!asset.format || typeof asset.format !== "string" || asset.format.trim() === "") {
      throw new CanonicalCatalogValidationError(
        `Asset "${asset.publicId}" has missing or empty format.`
      );
    }

    if (typeof asset.bytes !== "number" || !Number.isFinite(asset.bytes) || asset.bytes <= 0) {
      throw new CanonicalCatalogValidationError(
        `Asset "${asset.publicId}" has invalid bytes: ${asset.bytes}.`
      );
    }

    if (!asset.originalName || asset.originalName.includes("/") || asset.originalName.includes("\\")) {
      throw new CanonicalCatalogValidationError(
        `Asset "${asset.publicId}" originalName must be a simple file basename without path separators: "${asset.originalName}".`
      );
    }

    if (asset.resourceType === "IMAGE") {
      if (typeof asset.width !== "number" || asset.width <= 0 || typeof asset.height !== "number" || asset.height <= 0) {
        throw new CanonicalCatalogValidationError(
          `Image asset "${asset.publicId}" has invalid dimensions: ${asset.width}x${asset.height}.`
        );
      }
    } else if (asset.resourceType === "AUDIO") {
      if (asset.width !== null || asset.height !== null) {
        throw new CanonicalCatalogValidationError(
          `Audio asset "${asset.publicId}" must have null width and height, got ${asset.width}x${asset.height}.`
        );
      }
    }
  }

  for (const slug of ["rika-fauzi", "shidqi-mita", "dudi-aini", "default-preview"]) {
    const hasHero = assets.some(
      (a) => a.slug === slug && a.category === "couple" && a.publicId.endsWith("/hero")
    );
    if (!hasHero) {
      throw new CanonicalCatalogValidationError(
        `Missing required hero asset for slug '${slug}'.`
      );
    }

    const hasAudio = assets.some(
      (a) => a.slug === slug && a.category === "audio" && a.publicId.endsWith("/audio/background-music")
    );
    if (!hasAudio) {
      throw new CanonicalCatalogValidationError(
        `Missing required audio asset for slug '${slug}'.`
      );
    }
  }
}

/**
 * Returns a Map of publicId to CanonicalMediaAsset.
 */
export function getCanonicalMediaAssetMap(
  assets: readonly CanonicalMediaAsset[] = CANONICAL_PRODUCTION_MEDIA
): Map<string, CanonicalMediaAsset> {
  const map = new Map<string, CanonicalMediaAsset>();
  for (const asset of assets) {
    map.set(asset.publicId, asset);
  }
  return map;
}

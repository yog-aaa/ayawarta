import type {
  CoupleRole,
  InvitationSlug,
  MediaCategory,
} from "./types";

export const APPROVED_INVITATION_SLUGS: readonly InvitationSlug[] = [
  "rika-fauzi",
  "shidqi-mita",
  "dudi-aini",
  "default-preview",
] as const;

export const APPROVED_CATEGORIES: readonly MediaCategory[] = [
  "couple",
  "gallery",
  "audio",
  "video",
] as const;

export const APPROVED_COUPLE_ROLES: readonly CoupleRole[] = [
  "groom",
  "bride",
  "hero",
] as const;

export const PUBLIC_ID_ROOT = "ayawarta/production/invitations";

export function isApprovedSlug(slug: string): slug is InvitationSlug {
  return APPROVED_INVITATION_SLUGS.includes(slug as InvitationSlug);
}

export function isApprovedCategory(category: string): category is MediaCategory {
  return APPROVED_CATEGORIES.includes(category as MediaCategory);
}

export function isApprovedCoupleRole(role: string): role is CoupleRole {
  return APPROVED_COUPLE_ROLES.includes(role as CoupleRole);
}

/**
 * Builds the deterministic target public ID for a couple role.
 */
export function buildCouplePublicId(
  slug: InvitationSlug,
  role: CoupleRole
): string {
  if (!isApprovedSlug(slug)) {
    throw new Error(`Invalid invitation slug: ${slug}`);
  }
  if (!isApprovedCoupleRole(role)) {
    throw new Error(`Invalid couple role: ${role}`);
  }
  return `${PUBLIC_ID_ROOT}/${slug}/couple/${role}`;
}

/**
 * Builds the deterministic target public ID for a gallery position (1-indexed).
 */
export function buildGalleryPublicId(
  slug: InvitationSlug,
  position: number
): string {
  if (!isApprovedSlug(slug)) {
    throw new Error(`Invalid invitation slug: ${slug}`);
  }
  if (!Number.isInteger(position) || position < 1 || position > 99) {
    throw new Error(
      `Gallery position must be an integer between 1 and 99, got: ${position}`
    );
  }
  const padded = String(position).padStart(2, "0");
  return `${PUBLIC_ID_ROOT}/${slug}/gallery/gallery-${padded}`;
}

/**
 * Builds the deterministic target public ID for an audio item.
 */
export function buildAudioPublicId(
  slug: InvitationSlug,
  item = "background-music"
): string {
  if (!isApprovedSlug(slug)) {
    throw new Error(`Invalid invitation slug: ${slug}`);
  }
  if (!/^[a-z0-9-]+$/.test(item)) {
    throw new Error(`Invalid audio item name: ${item}`);
  }
  return `${PUBLIC_ID_ROOT}/${slug}/audio/${item}`;
}

export interface ParsedPublicId {
  slug: InvitationSlug;
  category: MediaCategory;
  item: string;
  fullId: string;
}

export type PublicIdValidationResult =
  | { valid: true; parsed: ParsedPublicId }
  | { valid: false; reason: string };

/**
 * Validates a target public ID against strict AyaWarta naming conventions.
 */
export function validateInvitationPublicId(
  publicId: string
): PublicIdValidationResult {
  if (typeof publicId !== "string" || publicId.length === 0) {
    return { valid: false, reason: "Public ID must be a non-empty string" };
  }

  // Reject whitespace
  if (publicId !== publicId.trim()) {
    return {
      valid: false,
      reason: "Public ID contains leading or trailing whitespace",
    };
  }

  // Reject query string or URL fragment
  if (publicId.includes("?") || publicId.includes("#")) {
    return {
      valid: false,
      reason: "Public ID cannot contain query parameters or fragments",
    };
  }

  // Reject backslashes
  if (publicId.includes("\\")) {
    return { valid: false, reason: "Public ID cannot contain backslashes" };
  }

  // Reject path traversal
  if (publicId.includes("..")) {
    return {
      valid: false,
      reason: "Public ID cannot contain path traversal (..)",
    };
  }

  // Reject leading or trailing slashes
  if (publicId.startsWith("/")) {
    return {
      valid: false,
      reason: "Public ID cannot start with a leading slash",
    };
  }
  if (publicId.endsWith("/")) {
    return {
      valid: false,
      reason: "Public ID cannot end with a trailing slash",
    };
  }

  // Reject consecutive slashes or empty segments
  if (publicId.includes("//")) {
    return {
      valid: false,
      reason: "Public ID cannot contain empty segments or consecutive slashes",
    };
  }

  // Check prefix
  if (!publicId.startsWith(`${PUBLIC_ID_ROOT}/`)) {
    return {
      valid: false,
      reason: `Public ID must start with '${PUBLIC_ID_ROOT}/'`,
    };
  }

  const segments = publicId.split("/");
  // Expected: ["ayawarta", "production", "invitations", slug, category, item] -> exactly 6 segments
  if (segments.length !== 6) {
    return {
      valid: false,
      reason: `Public ID must have exactly 6 segments, got ${segments.length}: ${publicId}`,
    };
  }

  const [, , , slug, category, item] = segments;

  if (!isApprovedSlug(slug)) {
    return {
      valid: false,
      reason: `Slug '${slug}' is not an approved invitation slug`,
    };
  }

  if (!isApprovedCategory(category)) {
    return {
      valid: false,
      reason: `Category '${category}' is not an approved media category`,
    };
  }

  // Validate item per category
  if (category === "couple") {
    if (!isApprovedCoupleRole(item)) {
      return {
        valid: false,
        reason: `Couple item '${item}' must be one of: ${APPROVED_COUPLE_ROLES.join(", ")}`,
      };
    }
  } else if (category === "gallery") {
    const galleryMatch = /^gallery-(\d{2})$/.exec(item);
    if (!galleryMatch) {
      return {
        valid: false,
        reason: `Gallery item '${item}' must match pattern 'gallery-NN' (e.g. gallery-01)`,
      };
    }
    const num = parseInt(galleryMatch[1], 10);
    if (num < 1) {
      return {
        valid: false,
        reason: `Gallery item position must be >= 1, got: ${num}`,
      };
    }
  } else if (category === "audio" || category === "video") {
    if (!/^[a-z0-9-]+$/.test(item)) {
      return {
        valid: false,
        reason: `${category} item '${item}' must be a lowercase kebab-case identifier`,
      };
    }
  }

  return {
    valid: true,
    parsed: {
      slug,
      category,
      item,
      fullId: publicId,
    },
  };
}

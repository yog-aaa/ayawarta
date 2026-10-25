import "server-only";

/**
 * Expected database row counts after running the canonical seed for AyaWarta.
 * Pure constant module with zero environment side effects or external imports.
 */
export const EXPECTED_SEED_COUNTS = {
  user: 1,
  mediaAsset: 31,
  invitation: 4,
  invitationSections: 4,
  partner: 8,
  event: 6,
  galleryItem: 21,
  loveStory: 6,
  giftAccount: 5,
} as const;

export const EXPECTED_COUNTS = EXPECTED_SEED_COUNTS;

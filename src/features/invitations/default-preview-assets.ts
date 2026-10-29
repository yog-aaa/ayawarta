import type { InvitationData } from "./types";

const sampleRoot = "/images/themes/classic-rose/sample";

/** Replace only the public demo artwork; persisted invitation media stays untouched. */
export function withDefaultPreviewAssets(
  slug: string,
  data: InvitationData
): InvitationData {
  if (slug !== "default-preview") return data;

  return {
    ...data,
    couple: {
      ...data.couple,
      heroImage: `${sampleRoot}/couple.webp`,
      groom: { ...data.couple.groom, photo: `${sampleRoot}/groom.webp` },
      bride: { ...data.couple.bride, photo: `${sampleRoot}/bride.webp` },
    },
    ...(data.gallery
      ? {
          gallery: {
            ...data.gallery,
            videoUrl: "",
            images: [
              `${sampleRoot}/couple.webp`,
              `${sampleRoot}/walking.webp`,
              `${sampleRoot}/details.webp`,
            ],
          },
        }
      : {}),
  };
}

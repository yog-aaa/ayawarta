import type { InvitationData } from "./types";
import classicRoseMedia from "@/config/classic-rose-cloudinary.json";

const sample = classicRoseMedia.sample;

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
      heroImage: sample.couple,
      groom: { ...data.couple.groom, photo: sample.groom },
      bride: { ...data.couple.bride, photo: sample.bride },
    },
    ...(data.gallery
      ? {
          gallery: {
            ...data.gallery,
            videoUrl: "",
            images: [
              sample.couple,
              sample.walking,
              sample.details,
            ],
          },
        }
      : {}),
  };
}

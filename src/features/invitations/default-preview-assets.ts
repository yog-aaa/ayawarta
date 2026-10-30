import type { InvitationData } from "./types";
import classicRoseMedia from "@/config/classic-rose-cloudinary.json";

const sample = classicRoseMedia.sample;

/** Replace only the public demo artwork; persisted invitation media stays untouched. */
export function withDefaultPreviewAssets(
  slug: string,
  data: InvitationData
): InvitationData {
  if (slug !== "default-preview") return data;

  const items = [
    { url: sample.couple, altText: "Contoh potret pasangan", caption: "" },
    { url: sample.walking, altText: "Contoh foto pasangan berjalan", caption: "" },
    { url: sample.details, altText: "Contoh detail pernikahan", caption: "" },
  ];

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
            items,
            images: items.map((item) => item.url),
          },
        }
      : {}),
  };
}

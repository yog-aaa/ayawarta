import type { Invitation } from "./types";

/** Illustrative content for the private Siger preview route. Never use as a slug fallback. */
export const sigerPrianganSample = {
  kind: "illustrative-preview" as const,
  guestInteractions: "read-only" as const,
  mediaStatus: "awaiting-approved-artwork" as const,
  invitation: {
    meta: { theme: "siger-priangan", variant: "ivory" },
    data: {
      sections: { couple: true, events: true, gallery: false, loveStory: true, gifts: false, wishes: true },
      couple: {
        groom: {
          name: "Damar",
          parents: "",
          instagram: "",
          photo: "",
        },
        bride: {
          name: "Raras",
          parents: "",
          instagram: "",
          photo: "",
        },
        heroImage: "",
      },
      weddingDate: new Date("2027-06-12T02:00:00.000Z"),
      greeting: "Selamat datang dalam cerita kami.",
      prayer: "",
      events: [
        {
          name: "Upacara Pernikahan",
          date: "Sabtu, 12 Juni 2027",
          time: "09.00 WIB",
          location: "Tempat acara contoh",
          address: "Alamat contoh, Jawa Barat",
          mapLink: "",
        },
      ],
      loveStory: [{ title: "Cerita kami", content: "Teks contoh untuk memperlihatkan tata letak undangan." }],
    },
  },
} satisfies {
  kind: "illustrative-preview";
  guestInteractions: "read-only";
  mediaStatus: "awaiting-approved-artwork";
  invitation: Invitation;
};

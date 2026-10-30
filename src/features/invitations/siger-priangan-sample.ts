import type { Invitation } from "./types";

/** Illustrative content for the public Siger sample route. Never use as a slug fallback. */
export const sigerPrianganSample = {
  kind: "illustrative-preview" as const,
  guestInteractions: "read-only" as const,
  mediaStatus: "awaiting-approved-artwork" as const,
  invitation: {
    meta: { theme: "siger-priangan", variant: "ivory" },
    data: {
      sections: { couple: true, events: true, gallery: true, loveStory: true, gifts: true, wishes: true },
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
      gallery: {
        videoUrl: "",
        images: [],
        items: [
          { url: "", altText: "Tempat foto pasangan contoh pertama", caption: "Ruang untuk kenangan pasangan" },
          { url: "", altText: "Tempat foto pasangan contoh kedua", caption: "" },
          { url: "", altText: "Tempat foto pasangan contoh ketiga", caption: "" },
        ],
      },
      gifts: [{ platform: "Rekening contoh", accountHolder: "Nama pasangan", accountNumber: "Nomor rekening contoh", logo: "" }],
    },
  },
} satisfies {
  kind: "illustrative-preview";
  guestInteractions: "read-only";
  mediaStatus: "awaiting-approved-artwork";
  invitation: Invitation;
};

import type { Invitation } from "./types";

/** Illustrative content for the public Siger sample route. Never use as a slug fallback. */
export const sigerPrianganSample = {
  kind: "illustrative-preview" as const,
  guestInteractions: "read-only" as const,
  mediaStatus: "illustrative-generated" as const,
  invitation: {
    meta: { theme: "siger-priangan", variant: "ivory" },
    data: {
      sections: { couple: true, events: true, gallery: true, loveStory: true, gifts: true, wishes: true },
      couple: {
        groom: {
          name: "Damar",
          parents: "",
          instagram: "",
          photo: "/themes/siger-priangan/sample/groom-portrait.webp",
        },
        bride: {
          name: "Raras",
          parents: "",
          instagram: "",
          photo: "/themes/siger-priangan/sample/bride-portrait.webp",
        },
        heroImage: "/themes/siger-priangan/sample/couple-portrait.webp",
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
          { url: "/themes/siger-priangan/sample/forest-walk.webp", altText: "Ilustrasi pasangan fiktif berjalan bersama di hutan pinus", caption: "Langkah yang kami pilih bersama" },
          { url: "/themes/siger-priangan/sample/hands-detail.webp", altText: "Ilustrasi detail tangan pasangan fiktif yang saling menggenggam", caption: "Dekat, dalam setiap langkah" },
          { url: "/themes/siger-priangan/sample/couple-portrait.webp", altText: "Ilustrasi potret pasangan fiktif di hutan pinus", caption: "Sebuah cerita untuk dikenang" },
        ],
      },
      gifts: [{ platform: "Rekening contoh", accountHolder: "Nama pasangan", accountNumber: "Nomor rekening contoh", logo: "" }],
    },
  },
} satisfies {
  kind: "illustrative-preview";
  guestInteractions: "read-only";
  mediaStatus: "illustrative-generated";
  invitation: Invitation;
};

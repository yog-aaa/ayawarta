import "server-only";

import path from "node:path";
import type {
  ClassicRoseVariant,
  InvitationSectionsConfig,
  InvitationTheme,
} from "./types";
import type { InvitationSlug } from "@/features/media/types";
import type { UploadAssetRecord } from "@/features/media/schema";

export type SeedPartner = {
  role: "GROOM" | "BRIDE";
  name: string;
  parents: string;
  instagram: string | null;
  photoTargetPublicId: string;
};

export type SeedEvent = {
  name: string;
  displayDate: string;
  displayTime: string;
  location: string;
  address: string;
  mapUrl: string;
};

export type SeedGalleryItem = {
  assetTargetPublicId: string;
  altText: string;
};

export type SeedLoveStory = {
  title: string;
  content: string;
};

export type SeedGiftAccount = {
  platform: string;
  accountHolder: string;
  accountNumber: string;
  logoPath: string;
};

export type SeedInvitationDefinition = {
  slug: InvitationSlug;
  theme: InvitationTheme;
  variant: ClassicRoseVariant;
  weddingDate: Date;
  heroTargetPublicId: string;
  musicTargetPublicId: string | null;
  galleryVideoUrl: string | null;
  sections: InvitationSectionsConfig;
  partners: [SeedPartner, SeedPartner];
  events: SeedEvent[];
  galleryItems: SeedGalleryItem[];
  loveStories: SeedLoveStory[];
  giftAccounts: SeedGiftAccount[];
};

export type MediaAssetUpsertInput = {
  publicId: string;
  secureUrl: string;
  folder: string;
  resourceType: "IMAGE" | "VIDEO" | "AUDIO";
  format: string | null;
  bytes: number;
  width: number | null;
  height: number | null;
  originalName: string | null;
};

/**
 * Maps a verified upload asset record into the database MediaAsset schema format.
 * Strictly requires valid positive bytes, format, secureUrl, and dimensions for images.
 * Fails closed without defaulting missing metadata to 0 or null (SEED-03).
 */
export function mapUploadAssetToMediaAssetInput(
  asset: UploadAssetRecord
): MediaAssetUpsertInput {
  if (!asset.secureUrl || typeof asset.secureUrl !== "string") {
    throw new Error(
      `Cannot map asset '${asset.targetPublicId}' to MediaAsset: secureUrl is missing or invalid.`
    );
  }

  if (
    typeof asset.bytes !== "number" ||
    !Number.isFinite(asset.bytes) ||
    asset.bytes <= 0
  ) {
    throw new Error(
      `Cannot map asset '${asset.targetPublicId}' to MediaAsset: bytes must be a positive integer, got ${asset.bytes}.`
    );
  }

  if (!asset.format || typeof asset.format !== "string" || asset.format.trim() === "") {
    throw new Error(
      `Cannot map asset '${asset.targetPublicId}' to MediaAsset: format is missing or empty.`
    );
  }

  const folder = path.posix.dirname(asset.targetPublicId);
  const originalName = path.basename(asset.sourceLocation);

  const resourceType =
    asset.category === "audio"
      ? "AUDIO"
      : asset.category === "video"
        ? "VIDEO"
        : "IMAGE";

  if (resourceType === "IMAGE") {
    if (
      typeof asset.width !== "number" ||
      asset.width <= 0 ||
      typeof asset.height !== "number" ||
      asset.height <= 0
    ) {
      throw new Error(
        `Cannot map image asset '${asset.targetPublicId}' to MediaAsset: invalid dimensions (${asset.width}x${asset.height}).`
      );
    }
  }

  return {
    publicId: asset.targetPublicId,
    secureUrl: asset.secureUrl,
    folder,
    resourceType,
    format: asset.format,
    bytes: asset.bytes,
    width: asset.width ?? null,
    height: asset.height ?? null,
    originalName,
  };
}

/**
 * Exact, typed seed definitions for the 4 production invitations.
 * Preserves original customer content, date strings, addresses, stories, and account numbers.
 * Normalizes empty gallery video strings to null; default-preview preserves its YouTube embed URL.
 */
export const SEED_INVITATIONS: readonly SeedInvitationDefinition[] = [
  // 1. Rika - Fauzi
  {
    slug: "rika-fauzi",
    theme: "classic-rose",
    variant: "black",
    weddingDate: new Date("2025-09-07T08:00:00+07:00"),
    heroTargetPublicId:
      "ayawarta/production/invitations/rika-fauzi/couple/hero",
    musicTargetPublicId:
      "ayawarta/production/invitations/rika-fauzi/audio/background-music",
    galleryVideoUrl: null,
    sections: {
      couple: true,
      events: true,
      gallery: true,
      loveStory: true,
      gifts: true,
      wishes: true,
    },
    partners: [
      {
        role: "GROOM",
        name: "Moch Fauzi Febriana",
        parents:
          "Putra Pertama dari Bapak Ade Sudiana & Ibu Yani Andriani",
        instagram: "mochfaauzi",
        photoTargetPublicId:
          "ayawarta/production/invitations/rika-fauzi/couple/groom",
      },
      {
        role: "BRIDE",
        name: "Rika Widiarti",
        parents: "Putri Ketiga dari Bapak Timan & Ibu Nawangsih",
        instagram: "rikawidiartii",
        photoTargetPublicId:
          "ayawarta/production/invitations/rika-fauzi/couple/bride",
      },
    ],
    events: [
      {
        name: "Akad Nikah",
        displayDate: "3 September 2025",
        displayTime: "08:00 WIB - Selesai",
        location: "Kantor Urusan Agama (KUA) Kecamatan Garut Kota",
        address:
          "Jl. Bratayuda No.78, Kota Kulon, Kec. Garut Kota, Kabupaten Garut, Jawa Barat 44112",
        mapUrl: "https://maps.app.goo.gl/YYUHWnh5TbEWMvJ16",
      },
      {
        name: "Resepsi",
        displayDate: "7 September 2025",
        displayTime: "08:00 WIB - Selesai",
        location: "Kediaman Mempelai Wanita",
        address:
          "Kp Galumpit, RT 01 RW 24, Kel. Kota Kulon, Kabupaten Garut",
        mapUrl: "https://maps.app.goo.gl/aCbnqFP7h4BzSAYM6",
      },
    ],
    galleryItems: [
      {
        assetTargetPublicId:
          "ayawarta/production/invitations/rika-fauzi/gallery/gallery-01",
        altText:
          "Foto Galeri 1: Momen Bahagia Moch Fauzi Febriana dan Rika Widiarti",
      },
      {
        assetTargetPublicId:
          "ayawarta/production/invitations/rika-fauzi/gallery/gallery-02",
        altText:
          "Foto Galeri 2: Momen Bahagia Moch Fauzi Febriana dan Rika Widiarti",
      },
      {
        assetTargetPublicId:
          "ayawarta/production/invitations/rika-fauzi/gallery/gallery-03",
        altText:
          "Foto Galeri 3: Momen Bahagia Moch Fauzi Febriana dan Rika Widiarti",
      },
      {
        assetTargetPublicId:
          "ayawarta/production/invitations/rika-fauzi/gallery/gallery-04",
        altText:
          "Foto Galeri 4: Momen Bahagia Moch Fauzi Febriana dan Rika Widiarti",
      },
      {
        assetTargetPublicId:
          "ayawarta/production/invitations/rika-fauzi/gallery/gallery-05",
        altText:
          "Foto Galeri 5: Momen Bahagia Moch Fauzi Febriana dan Rika Widiarti",
      },
      {
        assetTargetPublicId:
          "ayawarta/production/invitations/rika-fauzi/couple/hero",
        altText:
          "Foto Galeri 6: Momen Bahagia Moch Fauzi Febriana dan Rika Widiarti",
      },
    ],
    loveStories: [
      {
        title: "Cerita Awal Pertemuan",
        content:
          "Tidak ada yang tidak mungkin di dunia ini, bulan Februari 2019 kami saling mengenal satu sama lain melalui salah satu teman kami, hingga kami bertemu kembali setelah berkenalan 2 minggu dan memutuskan untuk menjalin hubungan sebagai pasangan.",
      },
      {
        title: "Cerita Lamaran",
        content:
          "Kehendaknya menuntun kami pada sebuah pertemuan yang tidak pernah disangka hingga akhirnya membawa kami pada sebuah ikatan suci yang di cintanya, kami melangsungkan acara lamaran pada bulan April 2024.",
      },
      {
        title: "Cerita Pernikahan",
        content:
          "Bukan karena bertemu lalu berjodoh, tapi karena berjodoh lah kami bisa bertemu,kami memutuskan untuk mengikrar janji suci pernikahan pada bulan September 2025 sebagaimana yang pernah dikatakan oleh Ali bin Abi thalib 'apa yang menjadi takdirmu akan menemukan jalannya untuk menemukanmu'.",
      },
    ],
    giftAccounts: [
      {
        platform: "Permata Bank",
        accountHolder: "Moch Fauzi Febriana",
        accountNumber: "9999947317",
        logoPath: "/images/landing/payments/Permata.png",
      },
      {
        platform: "Dana",
        accountHolder: "Rika widiarti",
        accountNumber: "083824827362",
        logoPath: "/images/landing/payments/Dana.png",
      },
    ],
  },

  // 2. Shidqi - Mita
  {
    slug: "shidqi-mita",
    theme: "classic-rose",
    variant: "black",
    weddingDate: new Date("2025-10-12T09:00:00+07:00"),
    heroTargetPublicId:
      "ayawarta/production/invitations/shidqi-mita/couple/hero",
    musicTargetPublicId:
      "ayawarta/production/invitations/shidqi-mita/audio/background-music",
    galleryVideoUrl: null,
    sections: {
      couple: true,
      events: true,
      gallery: true,
      loveStory: false,
      gifts: false,
      wishes: true,
    },
    partners: [
      {
        role: "GROOM",
        name: "Shidqi Nurpermadi",
        parents: "Putra Pertama dari Bapak Uned Junaedi & Ibu Yuyun",
        instagram: null,
        photoTargetPublicId:
          "ayawarta/production/invitations/shidqi-mita/couple/groom",
      },
      {
        role: "BRIDE",
        name: "Mita Ali Tifta",
        parents:
          "Putri Pertama dari Bapak Edih Maskun(alm) & Ibu Elis Alis Yuismi",
        instagram: null,
        photoTargetPublicId:
          "ayawarta/production/invitations/shidqi-mita/couple/bride",
      },
    ],
    events: [
      {
        name: "Akad Nikah & Resepsi",
        displayDate: "12 Oktober 2025",
        displayTime: "09:30 WIB - Selesai",
        location: "Rumah",
        address:
          "Kp.Cisaronggge RT 02/ RW 11 Desa Mekarmukti, Kec Cihampelas Kab.Bandung Barat",
        mapUrl: "https://maps.app.goo.gl/EGwptvewrEttd9R86",
      },
    ],
    galleryItems: [
      {
        assetTargetPublicId:
          "ayawarta/production/invitations/shidqi-mita/gallery/gallery-01",
        altText:
          "Foto Galeri 1: Momen Bahagia Shidqi Nurpermadi dan Mita Ali Tifta",
      },
      {
        assetTargetPublicId:
          "ayawarta/production/invitations/shidqi-mita/gallery/gallery-02",
        altText:
          "Foto Galeri 2: Momen Bahagia Shidqi Nurpermadi dan Mita Ali Tifta",
      },
      {
        assetTargetPublicId:
          "ayawarta/production/invitations/shidqi-mita/gallery/gallery-03",
        altText:
          "Foto Galeri 3: Momen Bahagia Shidqi Nurpermadi dan Mita Ali Tifta",
      },
      {
        assetTargetPublicId:
          "ayawarta/production/invitations/shidqi-mita/gallery/gallery-04",
        altText:
          "Foto Galeri 4: Momen Bahagia Shidqi Nurpermadi dan Mita Ali Tifta",
      },
      {
        assetTargetPublicId:
          "ayawarta/production/invitations/shidqi-mita/gallery/gallery-05",
        altText:
          "Foto Galeri 5: Momen Bahagia Shidqi Nurpermadi dan Mita Ali Tifta",
      },
      {
        assetTargetPublicId:
          "ayawarta/production/invitations/shidqi-mita/gallery/gallery-06",
        altText:
          "Foto Galeri 6: Momen Bahagia Shidqi Nurpermadi dan Mita Ali Tifta",
      },
    ],
    loveStories: [],
    giftAccounts: [],
  },

  // 3. Dudi - Aini
  {
    slug: "dudi-aini",
    theme: "classic-rose",
    variant: "white",
    weddingDate: new Date("2025-12-21T08:00:00+07:00"),
    heroTargetPublicId:
      "ayawarta/production/invitations/dudi-aini/couple/hero",
    musicTargetPublicId:
      "ayawarta/production/invitations/dudi-aini/audio/background-music",
    galleryVideoUrl: null,
    sections: {
      couple: true,
      events: true,
      gallery: true,
      loveStory: false,
      gifts: true,
      wishes: true,
    },
    partners: [
      {
        role: "GROOM",
        name: "Dudi",
        parents: "Putra Keenam dari Bapak Irin & Ibu Engkom",
        instagram: null,
        photoTargetPublicId:
          "ayawarta/production/invitations/dudi-aini/couple/groom",
      },
      {
        role: "BRIDE",
        name: "Aini Sri Lutami",
        parents: "Putri Pertama dari Bapak Toni & Ibu Ai Susanti",
        instagram: null,
        photoTargetPublicId:
          "ayawarta/production/invitations/dudi-aini/couple/bride",
      },
    ],
    events: [
      {
        name: "Akad Nikah & Resepsi",
        displayDate: "21 Desember 2025",
        displayTime: "08:00 WIB - Selesai",
        location: "",
        address: "Jalan Terusan Pembangunan Kp. Pataruman RT01/RW02",
        mapUrl: "https://maps.app.goo.gl/AvTiCA2WCmsiKU4A9",
      },
    ],
    galleryItems: [
      {
        assetTargetPublicId:
          "ayawarta/production/invitations/dudi-aini/gallery/gallery-01",
        altText: "Foto Galeri 1: Momen Bahagia Dudi dan Aini Sri Lutami",
      },
      {
        assetTargetPublicId:
          "ayawarta/production/invitations/dudi-aini/gallery/gallery-02",
        altText: "Foto Galeri 2: Momen Bahagia Dudi dan Aini Sri Lutami",
      },
      {
        assetTargetPublicId:
          "ayawarta/production/invitations/dudi-aini/gallery/gallery-03",
        altText: "Foto Galeri 3: Momen Bahagia Dudi dan Aini Sri Lutami",
      },
    ],
    loveStories: [],
    giftAccounts: [
      {
        platform: "Dana",
        accountHolder: "Aini Sri Lutami",
        accountNumber: "1483146063",
        logoPath: "/images/landing/payments/Dana.png",
      },
    ],
  },

  // 4. Default Preview
  {
    slug: "default-preview",
    theme: "classic-rose",
    variant: "red",
    weddingDate: new Date("2025-10-28T08:00:00+07:00"),
    heroTargetPublicId:
      "ayawarta/production/invitations/default-preview/couple/hero",
    musicTargetPublicId:
      "ayawarta/production/invitations/default-preview/audio/background-music",
    galleryVideoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    sections: {
      couple: true,
      events: true,
      gallery: true,
      loveStory: true,
      gifts: true,
      wishes: true,
    },
    partners: [
      {
        role: "GROOM",
        name: "Bima Mahendra",
        parents: "Putra Pertama dari Pasangan Ayah Bima & Ibu Bima",
        instagram: "satriabaja_hitam",
        photoTargetPublicId:
          "ayawarta/production/invitations/default-preview/couple/groom",
      },
      {
        role: "BRIDE",
        name: "Anisa Putri",
        parents: "Putri Pertama dari Pasangan Ayah Anisa & Ibu Anisa",
        instagram: "cewenyabimaowo",
        photoTargetPublicId:
          "ayawarta/production/invitations/default-preview/couple/bride",
      },
    ],
    events: [
      {
        name: "Akad Nikah",
        displayDate: "28 Agustus 2030",
        displayTime: "08:00 WIB - selesai",
        location: "Graha Intan Balarea",
        address:
          "Jl. Patriot No.12-14, Sukagalih, Kec. Tarogong Kidul, Kabupaten Garut, Jawa Barat 44151",
        mapUrl: "https://maps.app.goo.gl/rCpzs7gD7iHPNQU59",
      },
      {
        name: "Resepsi",
        displayDate: "31 Agustus 2031",
        displayTime: "10:00 WIB - selesai",
        location: "Graha Intan Balarea",
        address:
          "Jl. Patriot No.12-14, Sukagalih, Kec. Tarogong Kidul, Kabupaten Garut, Jawa Barat 44151",
        mapUrl: "https://maps.app.goo.gl/rCpzs7gD7iHPNQU59",
      },
    ],
    galleryItems: [
      {
        assetTargetPublicId:
          "ayawarta/production/invitations/default-preview/gallery/gallery-01",
        altText: "Foto Galeri 1: Contoh Foto Undangan Pernikahan",
      },
      {
        assetTargetPublicId:
          "ayawarta/production/invitations/default-preview/gallery/gallery-01",
        altText: "Foto Galeri 2: Contoh Foto Undangan Pernikahan",
      },
      {
        assetTargetPublicId:
          "ayawarta/production/invitations/default-preview/gallery/gallery-01",
        altText: "Foto Galeri 3: Contoh Foto Undangan Pernikahan",
      },
      {
        assetTargetPublicId:
          "ayawarta/production/invitations/default-preview/gallery/gallery-01",
        altText: "Foto Galeri 4: Contoh Foto Undangan Pernikahan",
      },
      {
        assetTargetPublicId:
          "ayawarta/production/invitations/default-preview/gallery/gallery-01",
        altText: "Foto Galeri 5: Contoh Foto Undangan Pernikahan",
      },
      {
        assetTargetPublicId:
          "ayawarta/production/invitations/default-preview/gallery/gallery-01",
        altText: "Foto Galeri 6: Contoh Foto Undangan Pernikahan",
      },
    ],
    loveStories: [
      {
        title: "Awal",
        content:
          "Kisah kami berawal dari ketidaksengajaan di sebuah kedai kopi senja. Obrolan ringan tentang buku dan musik ternyata membuka pintu ke sebuah cerita yang tak pernah kami duga.",
      },
      {
        title: "Lamaran",
        content:
          "Di bawah langit berbintang, di tempat yang sama di mana kami pertama kali berbagi tawa, sebuah pertanyaan sederhana diucapkan dengan hati berdebar. Jawaban 'iya' yang terucap menjadi janji awal.",
      },
      {
        title: "Menikah",
        content:
          "Kini, kami berdiri di ambang babak baru. Dengan restu dan doa, kami siap mengikat janji suci, melanjutkan perjalanan ini sebagai sepasang kekasih sejati.",
      },
    ],
    giftAccounts: [
      {
        platform: "BCA",
        accountHolder: "Bima Mahendra",
        accountNumber: "1234567890",
        logoPath: "/images/landing/payments/BCA.png",
      },
      {
        platform: "Dana",
        accountHolder: "Anisa Putri",
        accountNumber: "081234567890",
        logoPath: "/images/landing/payments/Dana.png",
      },
    ],
  },
];

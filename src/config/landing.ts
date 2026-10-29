export interface NavLink {
  name: string;
  href: string;
  id: string;
}

export const NAV_LINKS: readonly NavLink[] = [
  { name: "Home", href: "#home", id: "home" },
  { name: "Fitur", href: "#fitur", id: "fitur" },
  { name: "Harga", href: "#harga", id: "harga" },
  { name: "Tema", href: "#tema", id: "tema" },
  { name: "Testimoni", href: "#testimoni", id: "testimoni" },
  { name: "Tentang Kami", href: "#tentang", id: "tentang" },
] as const;

const BRAND_NAME = "AyaWarta";

export interface HeroConfig {
  brandName: string;
  headlineLead: string;
  headlineEmphasis: string;
  headlineStory: string;
  description: string;
  primaryCtaText: string;
  secondaryCtaText: string;
  sliderImages: readonly string[];
}

export const HERO_CONFIG: HeroConfig = {
  brandName: BRAND_NAME,
  headlineLead: "Undangan digital,",
  headlineEmphasis: "semudah",
  headlineStory: "bercerita.",
  description:
    "Bagikan kabar bahagia mu melalui undangan digital yang didesain untuk menyentuh hati dan memukau setiap tamu.",
  primaryCtaText: "Selengkapnya",
  secondaryCtaText: "Hubungi Kami",
  sliderImages: [
    "/images/slider/slide 1.jpg",
    "/images/slider/slide 2.jpg",
    "/images/slider/slide 3.jpg",
  ],
};

export type FeatureIconName =
  | "clock"
  | "gift"
  | "users"
  | "message"
  | "calendar"
  | "map-pin";

export interface FeatureItem {
  iconName: FeatureIconName;
  title: string;
  description: string;
}

export const FEATURES_DATA: readonly FeatureItem[] = [
  {
    iconName: "clock",
    title: "Hitung mundur waktu",
    description: "Tampilkan waktu hitung mundur agar acaramu semakin ditunggu-tunggu.",
  },
  {
    iconName: "gift",
    title: "Kirim kado",
    description: "Tamu bisa mengirimkan hadiah digital dengan mudah.",
  },
  {
    iconName: "users",
    title: "Unlimited tamu",
    description: "Undang semua orang penting tanpa pusing mikirin batasan jumlah tamu.",
  },
  {
    iconName: "message",
    title: "Ucapan Digital",
    description: "Abadikan setiap doa dan ucapan dari tamu pada buku tamu online.",
  },
  {
    iconName: "calendar",
    title: "Rangkaian Acara",
    description: "Pastikan semua tamu hadir di momen yang tepat.",
  },
  {
    iconName: "map-pin",
    title: "Peta Lokasi",
    description: "Bantu tamu menemukan lokasi acaramu tanpa takut nyasar.",
  },
] as const;

export const FEATURE_ASSETS = {
  phoneFeature: "/images/landing/feature-phone.png",
  bgBlueFeature: "/images/landing/bg-blue-features.png",
} as const;

export interface PricingPlan {
  name: string;
  price: string;
  period: string;
  features: readonly string[];
  buttonText: string;
  isPopular: boolean;
}

export const PRICING_PLANS: readonly PricingPlan[] = [
  {
    name: "Basic",
    price: "0",
    period: "/Gratis Seminggu",
    features: [
      "5 Pilihan Template Dasar",
      "Detail Acara & Peta Lokasi",
      "Tanpa Foto",
      "Terdapat Watermark/Branding Kami",
    ],
    buttonText: "Coba",
    isPopular: false,
  },
  {
    name: "Standar",
    price: "39",
    period: ".999 /Bulan",
    features: [
      "20+ Pilihan Template Premium",
      "Semua fitur di paket Basic",
      "Buku Tamu & Ucapan Digital",
      "Fitur Kirim Kado Digital",
      "Galeri Foto & Video (max. 10 Foto)",
      "Tanpa Watermark/Branding",
    ],
    buttonText: "Pesan Sekarang",
    isPopular: true,
  },
  {
    name: "Premium",
    price: "79",
    period: ".999 /Bulan",
    features: [
      "Semua Tema Eksklusif",
      "Semua fitur di paket Standard",
      "Fitur Siaran Langsung (Live)",
      "Kustomisasi Musik Latar",
      "Pena Kisah Ajaib (Love Story) AI",
    ],
    buttonText: "Pesan Sekarang",
    isPopular: false,
  },
] as const;

export interface PaymentMethod {
  name: string;
  path: string;
}

export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  { name: "QRIS", path: "/images/landing/payments/QRIS.png" },
  { name: "Mastercard", path: "/images/landing/payments/Mastercard.png" },
  { name: "VISA", path: "/images/landing/payments/Visa.png" },
  { name: "BCA", path: "/images/landing/payments/BCA.png" },
  { name: "BNI", path: "/images/landing/payments/BNI.png" },
  { name: "BRI", path: "/images/landing/payments/BRI.png" },
  { name: "Mandiri", path: "/images/landing/payments/Mandiri.png" },
  { name: "OVO", path: "/images/landing/payments/Ovo.png" },
  { name: "Dana", path: "/images/landing/payments/Dana.png" },
  { name: "ShopeePay", path: "/images/landing/payments/ShopeePay.png" },
  { name: "GoPay", path: "/images/landing/payments/Gopay.png" },
] as const;

export const THEME_CATEGORIES = [
  "Semua",
  "Pernikahan",
  "Ulang Tahun",
  "Wisuda",
  "Khitanan",
  "Aqiqah",
  "Halal Bihalal",
  "Tahlilan",
] as const;

export type ThemeCategory = (typeof THEME_CATEGORIES)[number];

export interface ThemeItem {
  id: number;
  imageSrc: string;
  title: string;
  code: string;
  category: ThemeCategory;
}

export const DUMMY_THEMES: readonly ThemeItem[] = Array.from(
  { length: 50 },
  (_, index) => {
    const category = THEME_CATEGORIES[(index % 7) + 1];
    return {
      id: index + 1,
      imageSrc: `/images/landing/dummy/themes/contoh tema ${(index % 8) + 1}.jpeg`,
      title: `${category} - #${index + 1}`,
      code: `${123456 + index}`,
      category,
    };
  }
);

export interface TestimonialItem {
  name: string;
  category: string;
  rating: number;
  text: string;
  imageSrc: string;
}

export const TESTIMONIALS_DATA: readonly TestimonialItem[] = [
  {
    name: "Joel & Ellie",
    category: "Pernikahan",
    rating: 5,
    text: "Jujur, urusan undangan ini hampir bikin kami berantem, haha. Stres banget bolak-balik percetakan. Pas nemu platform ini, wah... rasanya kayak nemu harta karun. Gak ada lagi drama revisi. Paling seneng pas liat ucapan dari teman-teman di buku tamu digitalnya, jadi bisa dibaca-baca ulang sambil senyum-senyum sendiri. Sumpah, worth it banget.",
    imageSrc: "/images/landing/dummy/testimony/contoh testimoni 1.jpeg",
  },
  {
    name: "Hendra",
    category: "Khitanan",
    rating: 5,
    text: "Saya bukan orang yang ngerti-ngerti banget teknologi, tapi buat acara syukuran khitanan anak, saya mau yang praktis. Ternyata pakai ini gampang banget. Tinggal klik-klik, isi info, sebar link ke grup keluarga, selesai. Gak ada lagi pertanyaan 'Acaranya di mana?' atau 'Jam berapa?' berulang-ulang di WhatsApp. Bikin kepala adem.",
    imageSrc: "/images/landing/dummy/testimony/contoh testimoni 2.jpeg",
  },
  {
    name: "Citra",
    category: "Wisuda",
    rating: 4,
    text: "Mau wisuda, pengen undang temen-temen tapi budget pas-pasan, hehe. Iseng nyoba yang paket standar di sini, kaget banget! Desainnya kekinian, gak kelihatan murahan sama sekali. Temen-temenku pada muji undangannya, dikira aku jago desain. Padahal tinggal chat miminya sama isi formulir doang.",
    imageSrc: "/images/landing/dummy/testimony/contoh testimoni 3.jpeg",
  },
] as const;

export interface SocialLink {
  name: string;
  icon: string;
  href: string;
}

export const SOCIAL_LINKS: readonly SocialLink[] = [
  { name: "Instagram", icon: "/images/landing/icons/instagram.svg", href: "https://instagram.com" },
  { name: "Facebook", icon: "/images/landing/icons/facebook.svg", href: "https://facebook.com" },
  { name: "TikTok", icon: "/images/landing/icons/tiktok.svg", href: "https://tiktok.com" },
  { name: "Email", icon: "/images/landing/icons/mail.svg", href: "mailto:ayawarta123@gmail.com" },
] as const;

export const FOOTER_CONFIG = {
  brandName: BRAND_NAME,
  tagline: "Undangan Digital, Semudah Bercerita",
  aboutHeading: "Tentang Kami",
  aboutParagraphs: [
    "Setiap perayaan, entah itu penyatuan dua hati, sebuah pencapaian baru, atau syukuran sederhana, adalah sebuah babak baru yang penuh makna. Kami di Ayawarta terinspirasi oleh keindahan momen-momen ini.",
    "Kami bertanya pada diri kami sendiri: bagaimana jika sebuah kabar bahagia dapat dibagikan dengan cara yang sama indahnya seperti perasaan yang menyertainya? Bagaimana jika teknologi bisa membantu kita untuk tidak hanya memberi informasi, tetapi juga berbagi cerita.",
  ],
  contact: {
    address:
      "Jl. Mayor Syamsu No.1, Jayaraga, Kec. Tarogong Kidul, Kabupaten Garut, Jawa Barat, INDONESIA 44151",
    phone: "+62 812 3456 7890",
    email: "ayawarta123@gmail.com",
  },
} as const;

import type {
  Invitation,
  InvitationData,
  InvitationMeta,
} from "@/features/invitations/types";
import { invitationData as defaultInvitationData } from "@/lib/dummy-data/wedding/dummy-wedding";

export type { Invitation, InvitationData, InvitationMeta };

const sampleInvitations: Record<string, Invitation> = {
    "rika-fauzi": {
        meta: {
            theme: 'classic-rose',
            variant: 'black',
        },
        data: {
            sections: {
                couple: true,
                events: true,
                gallery: true,
                loveStory: true,
                gifts: true,
                wishes: true,
            },
            couple: {
                groom: {
                    name: "Moch Fauzi Febriana",
                    parents: "Putra Pertama dari Bapak Ade Sudiana & Ibu Yani Andriani",
                    instagram: "mochfaauzi",
                    photo: "/images/SAMPLE/FOTO - Fauzi.jpg",
                },
                bride: {
                    name: "Rika Widiarti",
                    parents: "Putri Ketiga dari Bapak Timan & Ibu Nawangsih",
                    instagram: "rikawidiartii",
                    photo: "/images/SAMPLE/FOTO - Rika Widiarti.jpg",
                },
                heroImage: "/images/SAMPLE/FOTO - Couple.jpg",
            },
            weddingDate: new Date("2025-09-07T08:00:00"),
            events: [
                {
                    name: "Akad Nikah",
                    date: "3 September 2025",
                    time: "08:00 WIB - Selesai",
                    location: "Kantor Urusan Agama (KUA) Kecamatan Garut Kota",
                    address: "Jl. Bratayuda No.78, Kota Kulon, Kec. Garut Kota, Kabupaten Garut, Jawa Barat 44112",
                    mapLink: "https://maps.app.goo.gl/YYUHWnh5TbEWMvJ16",
                },
                {
                    name: "Resepsi",
                    date: "7 September 2025",
                    time: "08:00 WIB - Selesai",
                    location: "Kediaman Mempelai Wanita",
                    address: "Kp Galumpit, RT 01 RW 24, Kel. Kota Kulon, Kabupaten Garut",
                    mapLink: "https://maps.app.goo.gl/aCbnqFP7h4BzSAYM6",
                },
            ],
            gallery: {
                videoUrl: "",
                images: [
                    "/images/SAMPLE/IMG-20250802-WA0006.jpg",
                    "/images/SAMPLE/IMG-20250802-WA0005.jpg",
                    "/images/SAMPLE/IMG-20250802-WA0007.jpg",
                    "/images/SAMPLE/IMG-20250802-WA0008.jpg",
                    "/images/SAMPLE/IMG-20250802-WA0009.jpg",
                    "/images/SAMPLE/FOTO - Couple.jpg",
                ],
            },
            loveStory: [
                {
                    title: "Cerita Awal Pertemuan",
                    content: "Tidak ada yang tidak mungkin di dunia ini, bulan Februari 2019 kami saling mengenal satu sama lain melalui salah satu teman kami, hingga kami bertemu kembali setelah berkenalan 2 minggu dan memutuskan untuk menjalin hubungan sebagai pasangan.",
                },
                {
                    title: "Cerita Lamaran",
                    content: "Kehendaknya menuntun kami pada sebuah pertemuan yang tidak pernah disangka hingga akhirnya membawa kami pada sebuah ikatan suci yang di cintanya, kami melangsungkan acara lamaran pada bulan April 2024.",
                },
                {
                    title: "Cerita Pernikahan",
                    content: "Bukan karena bertemu lalu berjodoh, tapi karena berjodoh lah kami bisa bertemu,kami memutuskan untuk mengikrar janji suci pernikahan pada bulan September 2025 sebagaimana yang pernah dikatakan oleh Ali bin Abi thalib 'apa yang menjadi takdirmu akan menemukan jalannya untuk menemukanmu'.",
                },
            ],
            musicUrl: "https://youtu.be/GAf2DQPYvGE?si=JemtvfvApS7Dmt_t",
            gifts: [
                {
                    platform: "Permata Bank",
                    accountHolder: "Moch Fauzi Febriana",
                    accountNumber: "9999947317",
                    logo: "/images/landing/payments/Permata.png",
                },
                {
                    platform: "Dana",
                    accountHolder: "Rika widiarti",
                    accountNumber: "083824827362",
                    logo: "/images/landing/payments/Dana.png",
                },
            ],
        },
    },
    "shidqi-mita": {
        meta: {
            theme: 'classic-rose',
            variant: 'black',
        },
        data: {
            sections: {
                couple: true,
                events: true,
                gallery: true,
                loveStory: false,
                gifts: false,
                wishes: true,
            },
            couple: {
                groom: {
                    name: "Shidqi Nurpermadi",
                    parents: "Putra Pertama dari Bapak Uned Junaedi & Ibu Yuyun",
                    instagram: "",
                    photo: "https://res.cloudinary.com/doig3gwek/image/upload/v1758636624/PWD_Shidqi_im7frp.jpg",
                },
                bride: {
                    name: "Mita Ali Tifta",
                    parents: "Putri Pertama dari Bapak Edih Maskun(alm) & Ibu Elis Alis Yuismi",
                    instagram: "",
                    photo: "https://res.cloudinary.com/doig3gwek/image/upload/v1758636621/PWD_Mita_xeonoq.jpg",
                },
                heroImage: "https://res.cloudinary.com/doig3gwek/image/upload/v1758683815/couple_mnq0zf.jpg",
            },
            weddingDate: new Date("2025-10-12T09:00:00"),
            events: [
                {
                    name: "Akad Nikah & Resepsi",
                    date: "12 Oktober 2025",
                    time: "09:30 WIB - Selesai",
                    location: "Rumah",
                    address: "Kp.Cisaronggge RT 02/ RW 11 Desa Mekarmukti, Kec Cihampelas Kab.Bandung Barat",
                    mapLink: "https://maps.app.goo.gl/EGwptvewrEttd9R86",
                },
            ],
            gallery: {
                videoUrl: "",
                images: [
                    "https://res.cloudinary.com/doig3gwek/image/upload/v1758633550/PWD_Mita_Shidqi-11_-_Shidqi_Nurpermadi_m4edz9.jpg",
                    "https://res.cloudinary.com/doig3gwek/image/upload/v1758633577/PWD_Mita_Shidqi-15_-_Shidqi_Nurpermadi_yslkig.jpg",
                    "https://res.cloudinary.com/doig3gwek/image/upload/v1758633550/PWD_Mita_Shidqi-6_-_Shidqi_Nurpermadi_hfa8yt.jpg",
                    "https://res.cloudinary.com/doig3gwek/image/upload/v1758633592/PWD_Mita_Shidqi-26_-_Shidqi_Nurpermadi_txf0mo.jpg",
                    "https://res.cloudinary.com/doig3gwek/image/upload/v1758633588/PWD_Mita_Shidqi-19_-_Shidqi_Nurpermadi_cxl1ba.jpg",
                    "https://res.cloudinary.com/doig3gwek/image/upload/v1758633549/PWD_Mita_Shidqi-5_-_Shidqi_Nurpermadi_znxxvw.jpg",
                ],
            },
            musicUrl: "https://youtu.be/JHyhUWcFhWY?si=Qpr144vcUe_Kmopc",
        },
    },
    "dudi-aini": {
        meta: {
            theme: 'classic-rose',
            variant: 'white',
        },
        data: {
            sections: {
                couple: true,
                events: true,
                gallery: true,
                loveStory: false,
                gifts: true,
                wishes: true,
            },
            couple: {
                groom: {
                    name: "Dudi",
                    parents: "Putra Keenam dari Bapak Irin & Ibu Engkom",
                    instagram: "",
                    photo: "https://res.cloudinary.com/doig3gwek/image/upload/v1763485132/dudi_aiwaeh.jpg",
                },
                bride: {
                    name: "Aini Sri Lutami",
                    parents: "Putri Pertama dari Bapak Toni & Ibu Ai Susanti",
                    instagram: "",
                    photo: "https://res.cloudinary.com/doig3gwek/image/upload/v1763485132/aini_ru5pui.jpg",
                },
                heroImage: "https://res.cloudinary.com/doig3gwek/image/upload/v1765164240/hero_byywfn.jpg",
            },
            weddingDate: new Date("2025-12-21T08:00:00"),
            events: [
                {
                    name: "Akad Nikah & Resepsi",
                    date: "21 Desember 2025",
                    time: "08:00 WIB - Selesai",
                    location: "",
                    address: "Jalan Terusan Pembangunan Kp. Pataruman RT01/RW02",
                    mapLink: "https://maps.app.goo.gl/AvTiCA2WCmsiKU4A9",
                },
            ],
            gifts: [
                {
                    platform: "Dana",
                    accountHolder: "Aini Sri Lutami",
                    accountNumber: "1483146063",
                    logo: "/images/landing/payments/Dana.png",
                },
            ],
            gallery: {
                videoUrl: "",
                images: [
                    "https://res.cloudinary.com/doig3gwek/image/upload/v1763484805/heroImage_blhgl5.jpg",
                    "https://res.cloudinary.com/doig3gwek/image/upload/v1763484805/2_ladbgf.jpg",
                    "https://res.cloudinary.com/doig3gwek/image/upload/v1764585361/foto_4_w4msfb.jpg",
                ],
            },
            musicUrl: "https://res.cloudinary.com/doig3gwek/video/upload/v1764532212/lagu_ruirls.mp3",
        },
    },
};

export function getInvitationBySlug(slug: string): Invitation | null {
  return sampleInvitations[slug] ?? null;
}

export function getDefaultInvitation(): Invitation {
  return {
    meta: {
      theme: "classic-rose",
      variant: "red",
    },
    data: defaultInvitationData,
  };
}

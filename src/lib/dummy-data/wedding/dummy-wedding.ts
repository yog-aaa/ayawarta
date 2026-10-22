// src/lib/dummy-data/wedding/dummy-wedding.ts

import type { InvitationData } from "@/features/invitations/types";

// Data dummy terpusat untuk undangan. Nantinya, ini bisa diganti
// dengan data yang diambil dari database atau API.
export const invitationData = {
    couple: {
        groom: {
            name: "Bima Mahendra",
            parents: "Putra Pertama dari Pasangan Ayah Bima & Ibu Bima",
            instagram: "satriabaja_hitam",
            photo: "/images/dummy-couples/groom.jpg",
        },
        bride: {
            name: "Anisa Putri",
            parents: "Putri Pertama dari Pasangan Ayah Anisa & Ibu Anisa",
            instagram: "cewenyabimaowo",
            photo: "/images/dummy-couples/bride.jpg",
        },
        heroImage: "/images/dummy-couples/hero.png",
    },
    weddingDate: new Date("2025-10-28T08:00:00"),
    events: [
        {
            name: "Akad Nikah",
            date: "28 Agustus 2030",
            time: "08:00 WIB - selesai",
            location: "Graha Intan Balarea",
            address:
                "Jl. Patriot No.12-14, Sukagalih, Kec. Tarogong Kidul, Kabupaten Garut, Jawa Barat 44151",
            mapLink: "https://maps.app.goo.gl/rCpzs7gD7iHPNQU59",
        },
        {
            name: "Resepsi",
            date: "31 Agustus 2031",
            time: "10:00 WIB - selesai",
            location: "Graha Intan Balarea",
            address:
                "Jl. Patriot No.12-14, Sukagalih, Kec. Tarogong Kidul, Kabupaten Garut, Jawa Barat 44151",
            mapLink: "https://maps.app.goo.gl/rCpzs7gD7iHPNQU59",
        },
    ],
    gallery: {
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        images: [
            "/images/dummy-couples/photo-sample.jpg",
            "/images/dummy-couples/photo-sample.jpg",
            "/images/dummy-couples/photo-sample.jpg",
            "/images/dummy-couples/photo-sample.jpg",
            "/images/dummy-couples/photo-sample.jpg",
            "/images/dummy-couples/photo-sample.jpg",
        ],
    },
    loveStory: [
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
    musicUrl: "https://youtu.be/qf1W5iIRTe8?si=NJPJTeV7afylQeLQ",
    gifts: [
        {
            platform: "BCA",
            accountHolder: "Bima Mahendra",
            accountNumber: "1234567890",
            logo: "/images/landing/payments/BCA.png"
        },
        {
            platform: "Dana",
            accountHolder: "Anisa Putri",
            accountNumber: "081234567890",
            logo: "/images/landing/payments/Dana.png"
        }
    ],
    // --- TAMBAHAN BARU ---
    // Konfigurasi untuk menampilkan/menyembunyikan section
    sections: {
        couple: true,
        events: true,
        gallery: true,
        loveStory: true,
        gifts: true,
        wishes: true,
    }
} satisfies InvitationData;

// Re-export explicit domain type
export type { InvitationData };

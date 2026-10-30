import type { InvitationDetailPayload } from "@/features/invitations/query";

const date = new Date("2026-10-30T00:00:00.000Z");

function media(id: string, resourceType: "IMAGE" | "AUDIO" = "IMAGE") {
  return {
    id,
    publicId: `ayawarta/production/invitations/sample/${id}`,
    secureUrl: `https://res.cloudinary.com/sample/image/upload/v1/${id}.jpg`,
    folder: "ayawarta/production/invitations/sample",
    resourceType,
    format: resourceType === "AUDIO" ? "mp3" : "jpg",
    bytes: 1000,
    width: resourceType === "AUDIO" ? null : 600,
    height: resourceType === "AUDIO" ? null : 600,
    originalName: `${id}.jpg`,
    createdAt: date,
    updatedAt: date,
  };
}

export function publishedFixture(): InvitationDetailPayload {
  return {
    id: "inv-1",
    slug: "sample",
    theme: "classic-rose",
    variant: "red",
    weddingDate: new Date("2026-11-20T08:00:00.000Z"),
    heroAssetId: "hero",
    galleryVideoUrl: null,
    greeting: null,
    prayer: null,
    publishedVersion: 1,
    musicAssetId: null,
    ownerId: null,
    createdAt: date,
    updatedAt: date,
    sections: {
      id: "sections",
      invitationId: "inv-1",
      couple: true,
      events: true,
      gallery: true,
      loveStory: false,
      gifts: false,
      wishes: true,
    },
    heroAsset: media("hero"),
    musicAsset: null,
    partners: [
      {
        id: "groom",
        invitationId: "inv-1",
        role: "GROOM",
        name: "Bima",
        parents: "Orang tua Bima",
        instagram: null,
        photoAssetId: "groom-photo",
        photoAsset: media("groom-photo"),
      },
      {
        id: "bride",
        invitationId: "inv-1",
        role: "BRIDE",
        name: "Anisa",
        parents: "Orang tua Anisa",
        instagram: null,
        photoAssetId: "bride-photo",
        photoAsset: media("bride-photo"),
      },
    ],
    events: [{
      id: "event-1",
      invitationId: "inv-1",
      position: 1,
      name: "Akad",
      displayDate: "20 November 2026",
      displayTime: "08.00 WIB",
      location: "Gedung",
      address: "Alamat acara",
      mapUrl: "https://maps.example.com",
    }],
    galleryItems: [{
      id: "gallery-1",
      invitationId: "inv-1",
      assetId: "gallery-photo",
      altText: "Pasangan di taman",
      caption: null,
      position: 1,
      asset: media("gallery-photo"),
    }],
    loveStories: [],
    giftAccounts: [],
  } as InvitationDetailPayload;
}

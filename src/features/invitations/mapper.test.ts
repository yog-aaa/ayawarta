import { describe, expect, it } from "vitest";
import {
  InvitationMappingError,
  mapPrismaToInvitation,
  mapPrismaToInvitationData,
} from "./mapper";
import type { InvitationDetailPayload, PublicInvitationDetailPayload } from "./query";

function createValidPayload(): InvitationDetailPayload {
  return {
    id: "inv-1",
    slug: "sample-slug",
    theme: "classic-rose",
    variant: "red",
    weddingDate: new Date("2026-11-20T08:00:00Z"),
    heroAssetId: "asset-hero",
    galleryVideoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    greeting: null,
    prayer: null,
    publishedVersion: 1,
    musicAssetId: "asset-music",
    ownerId: "user-1",
    createdAt: new Date("2026-10-01T00:00:00Z"),
    updatedAt: new Date("2026-10-01T00:00:00Z"),
    sections: {
      id: "sec-1",
      invitationId: "inv-1",
      couple: true,
      events: true,
      gallery: true,
      loveStory: true,
      gifts: true,
      wishes: true,
    },
    heroAsset: {
      id: "asset-hero",
      publicId: "ayawarta/hero",
      secureUrl: "https://res.cloudinary.com/demo/image/upload/hero.jpg",
      folder: "ayawarta",
      resourceType: "IMAGE",
      format: "jpg",
      bytes: 123456,
      width: 1200,
      height: 800,
      originalName: "hero.jpg",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    musicAsset: {
      id: "asset-music",
      publicId: "ayawarta/music",
      secureUrl: "https://res.cloudinary.com/demo/video/upload/song.mp3",
      folder: "ayawarta",
      resourceType: "AUDIO",
      format: "mp3",
      bytes: 5432100,
      width: null,
      height: null,
      originalName: "song.mp3",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    partners: [
      {
        id: "p-groom",
        invitationId: "inv-1",
        role: "GROOM",
        name: "Bima Mahendra",
        parents: "Putra Pertama dari Pasangan Ayah & Ibu",
        instagram: "bima_m",
        photoAssetId: "asset-groom",
        photoAsset: {
          id: "asset-groom",
          publicId: "ayawarta/groom",
          secureUrl: "https://res.cloudinary.com/demo/image/upload/groom.jpg",
          folder: "ayawarta",
          resourceType: "IMAGE",
          format: "jpg",
          bytes: 80000,
          width: 600,
          height: 600,
          originalName: "groom.jpg",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      {
        id: "p-bride",
        invitationId: "inv-1",
        role: "BRIDE",
        name: "Anisa Putri",
        parents: "Putri Pertama dari Pasangan Ayah & Ibu",
        instagram: "anisa_p",
        photoAssetId: "asset-bride",
        photoAsset: {
          id: "asset-bride",
          publicId: "ayawarta/bride",
          secureUrl: "https://res.cloudinary.com/demo/image/upload/bride.jpg",
          folder: "ayawarta",
          resourceType: "IMAGE",
          format: "jpg",
          bytes: 85000,
          width: 600,
          height: 600,
          originalName: "bride.jpg",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    ],
    events: [
      {
        id: "ev-1",
        invitationId: "inv-1",
        name: "Akad Nikah",
        displayDate: "20 November 2026",
        displayTime: "08:00 WIB - selesai",
        location: "Masjid Raya",
        address: "Jl. Merdeka No. 1",
        mapUrl: "https://maps.app.goo.gl/akad",
        position: 1,
      },
      {
        id: "ev-2",
        invitationId: "inv-1",
        name: "Resepsi",
        displayDate: "20 November 2026",
        displayTime: "11:00 WIB - 14:00 WIB",
        location: "Gedung Serbaguna",
        address: "Jl. Merdeka No. 2",
        mapUrl: "https://maps.app.goo.gl/resepsi",
        position: 2,
      },
    ],
    galleryItems: [
      {
        id: "gal-1",
        invitationId: "inv-1",
        assetId: "asset-gal-1",
        altText: "Foto 1",
        caption: null,
        position: 1,
        asset: {
          id: "asset-gal-1",
          publicId: "ayawarta/gal-1",
          secureUrl: "https://res.cloudinary.com/demo/image/upload/gal-1.jpg",
          folder: "ayawarta",
          resourceType: "IMAGE",
          format: "jpg",
          bytes: 100000,
          width: 800,
          height: 600,
          originalName: "gal-1.jpg",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      {
        id: "gal-2",
        invitationId: "inv-1",
        assetId: "asset-gal-2",
        altText: "Foto 2",
        caption: "Momen bersama",
        position: 2,
        asset: {
          id: "asset-gal-2",
          publicId: "ayawarta/gal-2",
          secureUrl: "https://res.cloudinary.com/demo/image/upload/gal-2.jpg",
          folder: "ayawarta",
          resourceType: "IMAGE",
          format: "jpg",
          bytes: 110000,
          width: 800,
          height: 600,
          originalName: "gal-2.jpg",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    ],
    loveStories: [
      {
        id: "story-1",
        invitationId: "inv-1",
        title: "Awal Berkenalan",
        content: "Kami bertemu di kampus...",
        position: 1,
      },
      {
        id: "story-2",
        invitationId: "inv-1",
        title: "Lamaran",
        content: "Di pantai saat sunset...",
        position: 2,
      },
    ],
    giftAccounts: [
      {
        id: "gift-1",
        invitationId: "inv-1",
        platform: "BCA",
        accountHolder: "Bima Mahendra",
        accountNumber: "0123456789",
        logoPath: "/images/landing/payments/BCA.png",
        position: 1,
      },
      {
        id: "gift-2",
        invitationId: "inv-1",
        platform: "Dana",
        accountHolder: "Anisa Putri",
        accountNumber: "081234567890",
        logoPath: "/images/landing/payments/Dana.png",
        position: 2,
      },
    ],
  };
}

describe("Invitation Mapper", () => {
  it.each(["red", "green", "blue", "orange", "black", "white"])(
    "preserves the Classic Rose %s variant",
    (variant) => {
      const payload = createValidPayload();
      payload.variant = variant;
      expect(mapPrismaToInvitation(payload).meta).toEqual({ theme: "classic-rose", variant });
    }
  );

  it("performs complete mapping for a valid payload", () => {
    const payload = createValidPayload();
    const result = mapPrismaToInvitation(payload);

    expect(result.meta).toEqual({
      theme: "classic-rose",
      variant: "red",
    });

    expect(result.data.sections).toEqual({
      couple: true,
      events: true,
      gallery: true,
      loveStory: true,
      gifts: true,
      wishes: true,
    });

    expect(result.data.couple.heroImage).toBe(
      "https://res.cloudinary.com/demo/image/upload/hero.jpg"
    );
    expect(result.data.couple.groom).toEqual({
      name: "Bima Mahendra",
      parents: "Putra Pertama dari Pasangan Ayah & Ibu",
      instagram: "bima_m",
      photo: "https://res.cloudinary.com/demo/image/upload/groom.jpg",
    });
    expect(result.data.couple.bride).toEqual({
      name: "Anisa Putri",
      parents: "Putri Pertama dari Pasangan Ayah & Ibu",
      instagram: "anisa_p",
      photo: "https://res.cloudinary.com/demo/image/upload/bride.jpg",
    });

    expect(result.data.weddingDate).toEqual(payload.weddingDate);
    expect(result.data.events).toHaveLength(2);
    expect(result.data.events[0]).toEqual({
      name: "Akad Nikah",
      date: "20 November 2026",
      time: "08:00 WIB - selesai",
      location: "Masjid Raya",
      address: "Jl. Merdeka No. 1",
      mapLink: "https://maps.app.goo.gl/akad",
    });

    expect(result.data.gallery).toEqual({
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      images: [
        "https://res.cloudinary.com/demo/image/upload/gal-1.jpg",
        "https://res.cloudinary.com/demo/image/upload/gal-2.jpg",
      ],
      items: [
        {
          url: "https://res.cloudinary.com/demo/image/upload/gal-1.jpg",
          altText: "Foto 1",
          caption: "",
        },
        {
          url: "https://res.cloudinary.com/demo/image/upload/gal-2.jpg",
          altText: "Foto 2",
          caption: "Momen bersama",
        },
      ],
    });
    expect(result.data.greeting).toBe("");
    expect(result.data.prayer).toBe("");

    expect(result.data.loveStory).toEqual([
      { title: "Awal Berkenalan", content: "Kami bertemu di kampus..." },
      { title: "Lamaran", content: "Di pantai saat sunset..." },
    ]);

    expect(result.data.gifts).toEqual([
      {
        platform: "BCA",
        accountHolder: "Bima Mahendra",
        accountNumber: "0123456789",
        logo: "/images/landing/payments/BCA.png",
      },
      {
        platform: "Dana",
        accountHolder: "Anisa Putri",
        accountNumber: "081234567890",
        logo: "/images/landing/payments/Dana.png",
      },
    ]);

    expect(result.data.musicUrl).toBe(
      "https://res.cloudinary.com/demo/video/upload/song.mp3"
    );
  });

  it("extracts data directly with mapPrismaToInvitationData helper", () => {
    const payload = createValidPayload();
    const data = mapPrismaToInvitationData(payload);
    expect(data.couple.groom.name).toBe("Bima Mahendra");
    expect(data.couple.bride.name).toBe("Anisa Putri");
  });

  it("resolves GROOM and BRIDE correctly regardless of array order", () => {
    const payload = createValidPayload();
    payload.partners.reverse();

    expect(payload.partners[0].role).toBe("BRIDE");
    expect(payload.partners[1].role).toBe("GROOM");

    const result = mapPrismaToInvitation(payload);

    expect(result.data.couple.groom.name).toBe("Bima Mahendra");
    expect(result.data.couple.bride.name).toBe("Anisa Putri");
  });

  it("preserves ordering for all ordered relations even if array is unsorted", () => {
    const payload = createValidPayload();
    payload.events.reverse();
    payload.galleryItems.reverse();
    payload.loveStories.reverse();
    payload.giftAccounts.reverse();

    const result = mapPrismaToInvitation(payload);

    expect(result.data.events[0].name).toBe("Akad Nikah");
    expect(result.data.events[1].name).toBe("Resepsi");

    expect(result.data.gallery?.images[0]).toContain("gal-1.jpg");
    expect(result.data.gallery?.images[1]).toContain("gal-2.jpg");

    expect(result.data.loveStory?.[0].title).toBe("Awal Berkenalan");
    expect(result.data.loveStory?.[1].title).toBe("Lamaran");

    expect(result.data.gifts?.[0].platform).toBe("BCA");
    expect(result.data.gifts?.[1].platform).toBe("Dana");
  });

  it("maps hero image strictly from heroAsset independent of gallery", () => {
    const payload = createValidPayload();
    payload.heroAsset.secureUrl = "https://res.cloudinary.com/demo/image/upload/unique-hero.jpg";
    payload.galleryItems[0].asset.secureUrl = "https://res.cloudinary.com/demo/image/upload/different-first-gallery.jpg";

    const result = mapPrismaToInvitation(payload);

    expect(result.data.couple.heroImage).toBe(
      "https://res.cloudinary.com/demo/image/upload/unique-hero.jpg"
    );
    expect(result.data.gallery?.images[0]).toBe(
      "https://res.cloudinary.com/demo/image/upload/different-first-gallery.jpg"
    );
  });

  it("maps gallery video URL correctly and converts null to empty string", () => {
    const payloadWithVideo = createValidPayload();
    payloadWithVideo.galleryVideoUrl = "https://www.youtube.com/watch?v=sample";
    expect(mapPrismaToInvitation(payloadWithVideo).data.gallery?.videoUrl).toBe(
      "https://www.youtube.com/watch?v=sample"
    );

    const payloadNullVideo = createValidPayload();
    payloadNullVideo.galleryVideoUrl = null;
    expect(mapPrismaToInvitation(payloadNullVideo).data.gallery?.videoUrl).toBe("");
  });

  it("maps optional greeting and prayer for Siger without a religious default", () => {
    const payload = createValidPayload();
    payload.theme = "siger-priangan";
    payload.variant = "ivory";
    payload.greeting = "Wilujeng sumping";
    payload.prayer = "Semoga hari ini berkesan.";

    const result = mapPrismaToInvitation(payload);
    expect(result.meta).toEqual({ theme: "siger-priangan", variant: "ivory" });
    expect(result.data.greeting).toBe("Wilujeng sumping");
    expect(result.data.prayer).toBe("Semoga hari ini berkesan.");
  });

  it("normalizes absent post-migration fields on the legacy public payload", () => {
    const full = createValidPayload();
    const legacy = {
      id: full.id,
      slug: full.slug,
      theme: full.theme,
      variant: full.variant,
      weddingDate: full.weddingDate,
      heroAssetId: full.heroAssetId,
      galleryVideoUrl: full.galleryVideoUrl,
      musicAssetId: full.musicAssetId,
      ownerId: full.ownerId,
      createdAt: full.createdAt,
      updatedAt: full.updatedAt,
      sections: full.sections,
      heroAsset: full.heroAsset,
      musicAsset: full.musicAsset,
      partners: full.partners,
      events: full.events,
      galleryItems: full.galleryItems.map((item) => ({
        id: item.id,
        invitationId: item.invitationId,
        assetId: item.assetId,
        altText: item.altText,
        position: item.position,
        asset: item.asset,
      })),
      loveStories: full.loveStories,
      giftAccounts: full.giftAccounts,
    } satisfies PublicInvitationDetailPayload;
    const mapped = mapPrismaToInvitation(legacy);
    expect(mapped.data.greeting).toBe("");
    expect(mapped.data.prayer).toBe("");
    expect(mapped.data.gallery?.items.every((item) => item.caption === "")).toBe(true);
    expect(mapped.data.gallery?.images).toEqual(mapped.data.gallery?.items.map((item) => item.url));
  });

  it("maps music URL when musicAsset is present and leaves undefined when absent", () => {
    const payloadWithMusic = createValidPayload();
    expect(mapPrismaToInvitation(payloadWithMusic).data.musicUrl).toBe(
      "https://res.cloudinary.com/demo/video/upload/song.mp3"
    );

    const payloadNoMusic = createValidPayload();
    payloadNoMusic.musicAssetId = null;
    payloadNoMusic.musicAsset = null;
    expect(mapPrismaToInvitation(payloadNoMusic).data.musicUrl).toBeUndefined();
  });

  it("converts nullable Instagram to empty string", () => {
    const payload = createValidPayload();
    payload.partners[0].instagram = null;
    payload.partners[1].instagram = "custom_insta";

    const result = mapPrismaToInvitation(payload);

    expect(result.data.couple.groom.instagram).toBe("");
    expect(result.data.couple.bride.instagram).toBe("custom_insta");
  });

  it("respects disabled optional sections", () => {
    const payload = createValidPayload();
    payload.sections!.gallery = false;
    payload.sections!.loveStory = false;
    payload.sections!.gifts = false;

    const result = mapPrismaToInvitation(payload);

    expect(result.data.gallery).toBeUndefined();
    expect(result.data.loveStory).toBeUndefined();
    expect(result.data.gifts).toBeUndefined();
    expect(result.data.sections.gallery).toBe(false);
    expect(result.data.sections.loveStory).toBe(false);
    expect(result.data.sections.gifts).toBe(false);
  });

  it("preserves account numbers with leading zeroes and local logo paths", () => {
    const payload = createValidPayload();
    payload.giftAccounts = [
      {
        id: "g-leading",
        invitationId: "inv-1",
        platform: "Bank Permata",
        accountHolder: "Fauzi",
        accountNumber: "00999947317",
        logoPath: "/images/landing/payments/Permata.png",
        position: 1,
      },
    ];

    const result = mapPrismaToInvitation(payload);

    expect(result.data.gifts?.[0].accountNumber).toBe("00999947317");
    expect(typeof result.data.gifts?.[0].accountNumber).toBe("string");
    expect(result.data.gifts?.[0].logo).toBe("/images/landing/payments/Permata.png");
  });

  it("fails safely when sections configuration is missing", () => {
    const payload = createValidPayload();
    (payload as unknown as { sections: null }).sections = null;

    expect(() => mapPrismaToInvitation(payload)).toThrowError(
      new InvitationMappingError("Invitation sections configuration is missing")
    );
  });

  it("fails safely when heroAsset is missing", () => {
    const payload = createValidPayload();
    (payload as unknown as { heroAsset: null }).heroAsset = null;

    expect(() => mapPrismaToInvitation(payload)).toThrowError(
      new InvitationMappingError("Hero asset is required but missing")
    );
  });

  it("fails safely when GROOM partner is missing", () => {
    const payload = createValidPayload();
    payload.partners = payload.partners.filter((p) => p.role !== "GROOM");

    expect(() => mapPrismaToInvitation(payload)).toThrowError(
      new InvitationMappingError("Groom partner is missing")
    );
  });

  it("fails safely when BRIDE partner is missing", () => {
    const payload = createValidPayload();
    payload.partners = payload.partners.filter((p) => p.role !== "BRIDE");

    expect(() => mapPrismaToInvitation(payload)).toThrowError(
      new InvitationMappingError("Bride partner is missing")
    );
  });

  it("fails safely when gallery is active but contains no images", () => {
    const payload = createValidPayload();
    payload.sections!.gallery = true;
    payload.galleryItems = [];

    expect(() => mapPrismaToInvitation(payload)).toThrowError(
      new InvitationMappingError(
        "Gallery section is active but contains no images"
      )
    );
  });

  it("fails safely on unsupported theme", () => {
    const payload = createValidPayload();
    (payload as unknown as { theme: string }).theme = "futuristic-neon";

    expect(() => mapPrismaToInvitation(payload)).toThrowError(
      /Unsupported theme: "futuristic-neon"/
    );
  });

  it("fails safely on unsupported variant", () => {
    const payload = createValidPayload();
    (payload as unknown as { variant: string }).variant = "golden-yellow";

    expect(() => mapPrismaToInvitation(payload)).toThrowError(
      /Unsupported variant: "golden-yellow"/
    );
  });

  it("rejects cross-theme variants instead of rendering a fallback", () => {
    const classic = createValidPayload();
    classic.variant = "ivory";
    expect(() => mapPrismaToInvitation(classic)).toThrow(/for theme "classic-rose"/);

    const siger = createValidPayload();
    siger.theme = "siger-priangan";
    expect(() => mapPrismaToInvitation(siger)).toThrow(/for theme "siger-priangan"/);
  });
});

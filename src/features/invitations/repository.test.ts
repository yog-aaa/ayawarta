import { describe, expect, it, vi } from "vitest";
import {
  createInvitationRepository,
  type InvitationDatabaseClient,
} from "./repository";
import { invitationDetailInclude, publicInvitationSelect, type InvitationDetailPayload } from "./query";

function createMockPayload(slug: string): InvitationDetailPayload {
  return {
    id: "inv-repo-1",
    slug,
    theme: "classic-rose",
    variant: "red",
    weddingDate: new Date("2026-12-01T08:00:00Z"),
    heroAssetId: "asset-hero",
    galleryVideoUrl: null,
    greeting: null,
    prayer: null,
    publishedVersion: 1,
    musicAssetId: null,
    ownerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    sections: {
      id: "sec-1",
      invitationId: "inv-repo-1",
      couple: true,
      events: true,
      gallery: true,
      loveStory: false,
      gifts: false,
      wishes: true,
    },
    heroAsset: {
      id: "asset-hero",
      publicId: "ayawarta/hero",
      secureUrl: "https://res.cloudinary.com/demo/image/upload/hero.jpg",
      folder: "ayawarta",
      resourceType: "IMAGE",
      format: "jpg",
      bytes: 1000,
      width: 100,
      height: 100,
      originalName: "hero.jpg",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    musicAsset: null,
    partners: [
      {
        id: "p1",
        invitationId: "inv-repo-1",
        role: "GROOM",
        name: "Groom Name",
        parents: "Parents Groom",
        instagram: null,
        photoAssetId: "asset-groom",
        photoAsset: {
          id: "asset-groom",
          publicId: "ayawarta/groom",
          secureUrl: "https://res.cloudinary.com/demo/image/upload/groom.jpg",
          folder: "ayawarta",
          resourceType: "IMAGE",
          format: "jpg",
          bytes: 1000,
          width: 100,
          height: 100,
          originalName: "groom.jpg",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      {
        id: "p2",
        invitationId: "inv-repo-1",
        role: "BRIDE",
        name: "Bride Name",
        parents: "Parents Bride",
        instagram: null,
        photoAssetId: "asset-bride",
        photoAsset: {
          id: "asset-bride",
          publicId: "ayawarta/bride",
          secureUrl: "https://res.cloudinary.com/demo/image/upload/bride.jpg",
          folder: "ayawarta",
          resourceType: "IMAGE",
          format: "jpg",
          bytes: 1000,
          width: 100,
          height: 100,
          originalName: "bride.jpg",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    ],
    events: [
      {
        id: "ev1",
        invitationId: "inv-repo-1",
        name: "Acara",
        displayDate: "1 Desember 2026",
        displayTime: "08:00 WIB",
        location: "Gedung",
        address: "Alamat",
        mapUrl: "https://maps.app.goo.gl/test",
        position: 1,
      },
    ],
    galleryItems: [
      {
        id: "gi1",
        invitationId: "inv-repo-1",
        assetId: "asset-gal",
        altText: "Foto Galeri",
        caption: null,
        position: 1,
        asset: {
          id: "asset-gal",
          publicId: "ayawarta/gal",
          secureUrl: "https://res.cloudinary.com/demo/image/upload/gal.jpg",
          folder: "ayawarta",
          resourceType: "IMAGE",
          format: "jpg",
          bytes: 1000,
          width: 100,
          height: 100,
          originalName: "gal.jpg",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    ],
    loveStories: [],
    giftAccounts: [],
  };
}

describe("Invitation Repository (Hermetic Unit Tests)", () => {
  it("performs exact-slug lookup and returns mapped invitation", async () => {
    const mockFindUnique = vi.fn().mockResolvedValue(createMockPayload("special-slug"));
    const mockDb: InvitationDatabaseClient = {
      invitation: {
        findUnique: mockFindUnique,
      },
    };

    const repository = createInvitationRepository(mockDb);
    const result = await repository.findBySlug("special-slug");

    expect(mockFindUnique).toHaveBeenCalledTimes(1);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { slug: "special-slug" },
      select: publicInvitationSelect,
    });

    expect(result).not.toBeNull();
    expect(result?.meta.theme).toBe("classic-rose");
    expect(result?.meta.variant).toBe("red");
    expect(result?.data.couple.groom.name).toBe("Groom Name");
    expect(result?.data.couple.bride.name).toBe("Bride Name");
    expect(result?.data.couple.heroImage).toBe(
      "https://res.cloudinary.com/demo/image/upload/hero.jpg"
    );
  });

  it("returns null when slug is not found in database", async () => {
    const mockFindUnique = vi.fn().mockResolvedValue(null);
    const mockDb: InvitationDatabaseClient = {
      invitation: {
        findUnique: mockFindUnique,
      },
    };

    const repository = createInvitationRepository(mockDb);
    const result = await repository.findBySlug("non-existent-slug");

    expect(mockFindUnique).toHaveBeenCalledTimes(1);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { slug: "non-existent-slug" },
      select: publicInvitationSelect,
    });
    expect(result).toBeNull();
  });

  it("never falls back to default-preview when slug is unknown", async () => {
    const mockFindUnique = vi.fn().mockResolvedValue(null);
    const mockDb: InvitationDatabaseClient = {
      invitation: {
        findUnique: mockFindUnique,
      },
    };

    const repository = createInvitationRepository(mockDb);
    const result = await repository.findBySlug("unknown-couple");

    expect(result).toBeNull();
  });

  it("returns null immediately without querying db when slug is empty or invalid", async () => {
    const mockFindUnique = vi.fn();
    const mockDb: InvitationDatabaseClient = {
      invitation: {
        findUnique: mockFindUnique,
      },
    };

    const repository = createInvitationRepository(mockDb);

    expect(await repository.findBySlug("")).toBeNull();
    expect(await repository.findBySlug(null as unknown as string)).toBeNull();
    expect(await repository.findBySlug(undefined as unknown as string)).toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("enforces approved query structure without sensitive owner fields", () => {
    expect(invitationDetailInclude.sections).toBe(true);
    expect(invitationDetailInclude.heroAsset).toBe(true);
    expect(invitationDetailInclude.musicAsset).toBe(true);
    expect(invitationDetailInclude.partners).toEqual({
      include: { photoAsset: true },
    });
    expect(invitationDetailInclude.events).toEqual({
      orderBy: { position: "asc" },
    });
    expect(invitationDetailInclude.galleryItems).toEqual({
      orderBy: { position: "asc" },
      include: { asset: true },
    });
    expect(invitationDetailInclude.loveStories).toEqual({
      orderBy: { position: "asc" },
    });
    expect(invitationDetailInclude.giftAccounts).toEqual({
      orderBy: { position: "asc" },
    });

    // Ensure owner/credentials are completely excluded
    expect("owner" in invitationDetailInclude).toBe(false);
    expect("passwordHash" in invitationDetailInclude).toBe(false);
  });

  it("selects only pre-migration scalar columns for public reads", () => {
    expect(publicInvitationSelect).not.toHaveProperty("greeting");
    expect(publicInvitationSelect).not.toHaveProperty("prayer");
    expect(publicInvitationSelect).not.toHaveProperty("publishedVersion");
    expect(publicInvitationSelect.galleryItems.select).not.toHaveProperty("caption");
    expect(publicInvitationSelect.galleryItems.select.altText).toBe(true);
    expect(publicInvitationSelect.heroAsset).toBe(true);
  });

  it("allows fetching raw unmapped payload via findPayloadBySlug", async () => {
    const rawPayload = createMockPayload("raw-slug");
    const mockFindUnique = vi.fn().mockResolvedValue(rawPayload);
    const mockDb: InvitationDatabaseClient = {
      invitation: {
        findUnique: mockFindUnique,
      },
    };

    const repository = createInvitationRepository(mockDb);
    const result = await repository.findPayloadBySlug("raw-slug");

    expect(result).toBe(rawPayload);
    expect(result?.id).toBe("inv-repo-1");
  });
});

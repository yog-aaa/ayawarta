import { describe, expect, it, vi } from "vitest";

import { listAssociatedMedia } from "./editor-media";

describe("admin media association read", () => {
  it("returns only own linked media and marks cross-invitation use", async () => {
    const findUnique = vi.fn().mockResolvedValue({
      heroAssetId: "hero-1",
      musicAssetId: null,
      partners: [{ photoAssetId: "photo-1" }],
      galleryItems: [],
    });
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "hero-1", secureUrl: "https://res.cloudinary.com/demo/image/upload/hero.jpg",
        resourceType: "IMAGE", width: 1000, height: 800, originalName: "hero.jpg", publicId: "inv/hero",
        heroInvitations: [{ id: "inv-1" }], musicInvitations: [], partners: [], galleryItems: [],
      },
      {
        id: "photo-1", secureUrl: "https://res.cloudinary.com/demo/image/upload/photo.jpg",
        resourceType: "IMAGE", width: 600, height: 600, originalName: null, publicId: "inv/photo",
        heroInvitations: [], musicInvitations: [], partners: [{ invitationId: "inv-1" }, { invitationId: "other-inv" }], galleryItems: [],
      },
      {
        id: "forged", secureUrl: "https://res.cloudinary.com/demo/image/upload/forged.jpg",
        resourceType: "IMAGE", width: 600, height: 600, originalName: null, publicId: "other/forged",
        heroInvitations: [], musicInvitations: [], partners: [{ invitationId: "other-inv" }], galleryItems: [],
      },
    ]);
    const db = { invitation: { findUnique }, mediaAsset: { findMany } } as unknown as Parameters<typeof listAssociatedMedia>[0];

    const result = await listAssociatedMedia(db, "inv-1");
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ["hero-1", "photo-1"] } }, take: 100 }));
    expect(result.map((item) => item.id)).toEqual(["hero-1", "photo-1"]);
    expect(result[0].shared).toBe(false);
    expect(result[1].shared).toBe(true);
  });

  it("returns not found without querying unrelated media", async () => {
    const findMany = vi.fn();
    const db = { invitation: { findUnique: vi.fn().mockResolvedValue(null) }, mediaAsset: { findMany } } as unknown as Parameters<typeof listAssociatedMedia>[0];
    await expect(listAssociatedMedia(db, "forged-inv")).rejects.toMatchObject({ code: "not_found" });
    expect(findMany).not.toHaveBeenCalled();
  });
});

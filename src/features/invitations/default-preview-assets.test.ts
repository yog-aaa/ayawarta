import { describe, expect, it } from "vitest";
import { withDefaultPreviewAssets } from "./default-preview-assets";
import type { InvitationData } from "./types";

const data: InvitationData = {
  sections: { couple: true, events: true, gallery: true, loveStory: false, gifts: false, wishes: false },
  couple: {
    groom: { name: "Bima", parents: "", instagram: "", photo: "https://example.com/groom.jpg" },
    bride: { name: "Anisa", parents: "", instagram: "", photo: "https://example.com/bride.jpg" },
    heroImage: "https://example.com/hero.jpg",
  },
  weddingDate: new Date("2030-08-28T00:00:00Z"),
  events: [],
  gallery: { videoUrl: "https://www.youtube.com/watch?v=example", images: ["https://example.com/old.jpg"] },
};

describe("default preview artwork", () => {
  it("uses coherent Cloudinary sample photos only for the preview slug", () => {
    const result = withDefaultPreviewAssets("default-preview", data);
    expect(result.couple.heroImage).toMatch(/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/v\d+\/ayawarta\/production\/themes\/classic-rose\/sample\/couple-[a-f0-9]{16}\.webp$/);
    expect(result.couple.groom.photo).toMatch(/\/sample\/groom-[a-f0-9]{16}\.webp$/);
    expect(result.couple.bride.photo).toMatch(/\/sample\/bride-[a-f0-9]{16}\.webp$/);
    expect(result.gallery?.images).toHaveLength(3);
    expect(result.gallery?.videoUrl).toBe("");
    expect(data.couple.heroImage).toBe("https://example.com/hero.jpg");
    expect(data.gallery?.images).toEqual(["https://example.com/old.jpg"]);
  });

  it("leaves every other invitation unchanged", () => {
    expect(withDefaultPreviewAssets("rika-fauzi", data)).toBe(data);
  });
});

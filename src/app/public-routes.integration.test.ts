import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/navigation notFound
const mockNotFound = vi.fn(() => {
  const error = new Error("NEXT_NOT_FOUND");
  (error as unknown as { digest: string }).digest = "NEXT_NOT_FOUND";
  throw error;
});

vi.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
}));

import InvitationPage from "./[slug]/page";
import InvitePage from "./[slug]/invite/page";
import ClassicRosePage from "./(templates)/wedding/classic-rose/[variant]/page";

describe("Public Route Cutover — Live Database Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Real Database Query: /[slug]", () => {
    it("renders 'rika-fauzi' with Cloudinary hero and black variant", async () => {
      const page = await InvitationPage({
        params: Promise.resolve({ slug: "rika-fauzi" }),
      });

      expect(page).toBeDefined();
      expect(page.props.invitationSlug).toBe("rika-fauzi");
      expect(page.props.themeConfig.colors.primary).toBe("#D9AD65");
      expect(page.props.data.couple.groom.name).toBe("Moch Fauzi Febriana");
      expect(page.props.data.couple.bride.name).toBe("Rika Widiarti");
      expect(page.props.data.couple.heroImage).toMatch(
        /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/.+hero\.jpg$/
      );
      expect(page.props.data.events.length).toBeGreaterThanOrEqual(1);
    });

    it("renders 'shidqi-mita' with black variant", async () => {
      const page = await InvitationPage({
        params: Promise.resolve({ slug: "shidqi-mita" }),
      });

      expect(page).toBeDefined();
      expect(page.props.invitationSlug).toBe("shidqi-mita");
      expect(page.props.themeConfig.colors.primary).toBe("#D9AD65");
      expect(page.props.data.couple.groom.name).toBe("Shidqi Nurpermadi");
      expect(page.props.data.couple.bride.name).toBe("Mita Ali Tifta");
    });

    it("renders 'dudi-aini' with white variant", async () => {
      const page = await InvitationPage({
        params: Promise.resolve({ slug: "dudi-aini" }),
      });

      expect(page).toBeDefined();
      expect(page.props.invitationSlug).toBe("dudi-aini");
      expect(page.props.themeConfig.colors.primary).toBe("#A57C4E");
      expect(page.props.data.couple.groom.name).toBe("Dudi");
      expect(page.props.data.couple.bride.name).toBe("Aini Sri Lutami");
    });

    it("renders 'default-preview' with red variant and gallery video URL", async () => {
      const page = await InvitationPage({
        params: Promise.resolve({ slug: "default-preview" }),
      });

      expect(page).toBeDefined();
      expect(page.props.invitationSlug).toBe("default-preview");
      expect(page.props.themeConfig.colors.primary).toBe("#630718");
      expect(page.props.data.couple.groom.name).toBe("Bima Mahendra");
      expect(page.props.data.couple.bride.name).toBe("Anisa Putri");
      expect(page.props.data.gallery?.videoUrl).toBe(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      );
    });

    it("calls notFound() on unknown slug 'unknown-wedding-slug-123'", async () => {
      await expect(
        InvitationPage({
          params: Promise.resolve({ slug: "unknown-wedding-slug-123" }),
        })
      ).rejects.toThrow("NEXT_NOT_FOUND");

      expect(mockNotFound).toHaveBeenCalledTimes(1);
    });
  });

  describe("Real Database Query: /[slug]/invite", () => {
    it("renders InviteClientView for 'rika-fauzi' with couple names and events", async () => {
      const page = await InvitePage({
        params: Promise.resolve({ slug: "rika-fauzi" }),
      });

      expect(page).toBeDefined();
      expect(page.props.slug).toBe("rika-fauzi");
      expect(page.props.invitationData.couple.groom.name).toBe("Moch Fauzi Febriana");
      expect(page.props.invitationData.couple.bride.name).toBe("Rika Widiarti");
      expect(page.props.invitationData.events[0].name).toBe("Akad Nikah");
    });

    it("renders InviteClientView for 'shidqi-mita'", async () => {
      const page = await InvitePage({
        params: Promise.resolve({ slug: "shidqi-mita" }),
      });

      expect(page.props.slug).toBe("shidqi-mita");
      expect(page.props.invitationData.couple.groom.name).toBe("Shidqi Nurpermadi");
      expect(page.props.invitationData.couple.bride.name).toBe("Mita Ali Tifta");
    });

    it("renders InviteClientView for 'dudi-aini'", async () => {
      const page = await InvitePage({
        params: Promise.resolve({ slug: "dudi-aini" }),
      });

      expect(page.props.slug).toBe("dudi-aini");
      expect(page.props.invitationData.couple.groom.name).toBe("Dudi");
      expect(page.props.invitationData.couple.bride.name).toBe("Aini Sri Lutami");
    });

    it("renders InviteClientView for 'default-preview'", async () => {
      const page = await InvitePage({
        params: Promise.resolve({ slug: "default-preview" }),
      });

      expect(page.props.slug).toBe("default-preview");
      expect(page.props.invitationData.couple.groom.name).toBe("Bima Mahendra");
      expect(page.props.invitationData.couple.bride.name).toBe("Anisa Putri");
    });

    it("calls notFound() for unknown slug on invite page", async () => {
      await expect(
        InvitePage({
          params: Promise.resolve({ slug: "unknown-invite-slug" }),
        })
      ).rejects.toThrow("NEXT_NOT_FOUND");

      expect(mockNotFound).toHaveBeenCalledTimes(1);
    });
  });

  describe("Real Database Query: /wedding/classic-rose/[variant]", () => {
    it("renders default-preview by default when no searchParams slug is given", async () => {
      const page = await ClassicRosePage({
        params: Promise.resolve({ variant: "green" }),
      });

      expect(page.props.invitationSlug).toBe("default-preview");
      expect(page.props.themeConfig.colors.primary).toBe("#7B9557");
      expect(page.props.data.couple.groom.name).toBe("Bima Mahendra");
    });

    it("renders explicit target slug when searchParams.slug is 'rika-fauzi'", async () => {
      const page = await ClassicRosePage({
        params: Promise.resolve({ variant: "red" }),
        searchParams: Promise.resolve({ slug: "rika-fauzi" }),
      });

      expect(page.props.invitationSlug).toBe("rika-fauzi");
      expect(page.props.data.couple.groom.name).toBe("Moch Fauzi Febriana");
    });

    it("calls notFound() for non-existent slug in searchParams", async () => {
      await expect(
        ClassicRosePage({
          params: Promise.resolve({ variant: "red" }),
          searchParams: Promise.resolve({ slug: "not-found-slug" }),
        })
      ).rejects.toThrow("NEXT_NOT_FOUND");

      expect(mockNotFound).toHaveBeenCalledTimes(1);
    });
  });
});

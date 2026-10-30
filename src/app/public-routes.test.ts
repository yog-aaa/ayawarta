import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import path from "path";

// Mock next/navigation notFound
const mockNotFound = vi.fn(() => {
  const error = new Error("NEXT_NOT_FOUND");
  (error as unknown as { digest: string }).digest = "NEXT_NOT_FOUND";
  throw error;
});

vi.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
}));

// Mock invitationRepository
vi.mock("@/features/invitations/repository", () => ({
  invitationRepository: {
    findBySlug: vi.fn(),
  },
}));

import { invitationRepository } from "@/features/invitations/repository";
import { InvitationMappingError } from "@/features/invitations/mapper";
import InvitationPage from "./[slug]/page";
import InvitePage from "./[slug]/invite/page";
import ClassicRosePage from "./(templates)/wedding/classic-rose/[variant]/page";
import type { Invitation } from "@/features/invitations/types";

const mockInvitationData: Invitation["data"] = {
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
      name: "Fauzi",
      parents: "Bapak Ahmad & Ibu Siti",
      instagram: "fauzi",
      photo: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1/ayawarta/production/invitations/rika-fauzi/groom.jpg",
    },
    bride: {
      name: "Rika",
      parents: "Bapak Budi & Ibu Ani",
      instagram: "rika",
      photo: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1/ayawarta/production/invitations/rika-fauzi/bride.jpg",
    },
    heroImage: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1/ayawarta/production/invitations/rika-fauzi/hero.jpg",
  },
  weddingDate: new Date("2026-12-25T01:00:00.000Z"),
  events: [
    {
      name: "Akad Nikah",
      date: "Jumat, 25 Desember 2026",
      time: "08:00 - 10:00 WIB",
      location: "Masjid Agung",
      address: "Jl. Merdeka No. 1",
      mapLink: "https://maps.google.com",
    },
    {
      name: "Resepsi Pernikahan",
      date: "Jumat, 25 Desember 2026",
      time: "11:00 - 14:00 WIB",
      location: "Grand Ballroom",
      address: "Jl. Merdeka No. 2",
      mapLink: "https://maps.google.com",
    },
  ],
  gallery: {
    videoUrl: "",
    images: [
      "https://res.cloudinary.com/uhwi7xvb/image/upload/v1/ayawarta/production/invitations/rika-fauzi/gallery/gallery-01.jpg",
    ],
    items: [
      {
        url: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1/ayawarta/production/invitations/rika-fauzi/gallery/gallery-01.jpg",
        altText: "Foto pasangan",
        caption: "",
      },
    ],
  },
  loveStory: [
    {
      title: "Pertemuan Pertama",
      content: "Kami bertemu di kampus.",
    },
  ],
  gifts: [
    {
      platform: "BCA",
      accountHolder: "Fauzi",
      accountNumber: "1234567890",
      logo: "/images/payment/bca.png",
    },
  ],
  musicUrl: "https://res.cloudinary.com/uhwi7xvb/video/upload/v1/ayawarta/production/invitations/rika-fauzi/music/music.mp3",
};

const createMockInvitation = (
  slug: string,
  variant: "red" | "green" | "blue" = "red"
): Invitation => ({
  meta: {
    theme: "classic-rose",
    variant,
  },
  data: {
    ...mockInvitationData,
    couple: {
      ...mockInvitationData.couple,
      heroImage: `https://res.cloudinary.com/uhwi7xvb/image/upload/v1/ayawarta/production/invitations/${slug}/hero.jpg`,
    },
  },
});

describe("Public Route Cutover — Hermetic Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("InvitationPage (/[slug]/page.tsx)", () => {
    it("renders valid invitation slug using Prisma repository data and correct theme variant", async () => {
      vi.mocked(invitationRepository.findBySlug).mockResolvedValueOnce(
        createMockInvitation("rika-fauzi", "red")
      );

      const pageElement = await InvitationPage({
        params: Promise.resolve({ slug: "rika-fauzi" }),
      });

      expect(invitationRepository.findBySlug).toHaveBeenCalledWith("rika-fauzi");
      expect(pageElement).toBeDefined();
      expect(pageElement.props.invitationSlug).toBe("rika-fauzi");
      expect(pageElement.props.themeConfig.colors.primary).toBe("#630718"); // red primary
      expect(pageElement.props.data.couple.groom.name).toBe("Fauzi");
      expect(pageElement.props.data.couple.heroImage).toContain("rika-fauzi/hero.jpg");
    });

    it("renders shidqi-mita with green variant", async () => {
      vi.mocked(invitationRepository.findBySlug).mockResolvedValueOnce(
        createMockInvitation("shidqi-mita", "green")
      );

      const pageElement = await InvitationPage({
        params: Promise.resolve({ slug: "shidqi-mita" }),
      });

      expect(invitationRepository.findBySlug).toHaveBeenCalledWith("shidqi-mita");
      expect(pageElement.props.invitationSlug).toBe("shidqi-mita");
      expect(pageElement.props.themeConfig.colors.primary).toBe("#4c6537"); // green primary
    });

    it("renders explicit default-preview record without hidden fallbacks", async () => {
      vi.mocked(invitationRepository.findBySlug).mockResolvedValueOnce(
        createMockInvitation("default-preview", "red")
      );

      const pageElement = await InvitationPage({
        params: Promise.resolve({ slug: "default-preview" }),
      });

      expect(invitationRepository.findBySlug).toHaveBeenCalledWith("default-preview");
      expect(pageElement.props.invitationSlug).toBe("default-preview");
    });

    it("calls notFound() for unknown slug and never falls back to dummy/preview data", async () => {
      vi.mocked(invitationRepository.findBySlug).mockResolvedValueOnce(null);

      await expect(
        InvitationPage({ params: Promise.resolve({ slug: "unknown-couple-2026" }) })
      ).rejects.toThrow("NEXT_NOT_FOUND");

      expect(invitationRepository.findBySlug).toHaveBeenCalledWith("unknown-couple-2026");
      expect(mockNotFound).toHaveBeenCalledTimes(1);
    });

    it("does not render a future Siger invitation as Classic Rose", async () => {
      vi.mocked(invitationRepository.findBySlug).mockResolvedValueOnce({
        ...createMockInvitation("future-siger"),
        meta: { theme: "siger-priangan", variant: "ivory" },
      });

      await expect(
        InvitationPage({ params: Promise.resolve({ slug: "future-siger" }) })
      ).rejects.toThrow("NEXT_NOT_FOUND");
    });

    it("returns 404 for an invalid stored theme pair while surfacing other failures", async () => {
      vi.mocked(invitationRepository.findBySlug).mockRejectedValueOnce(new InvitationMappingError("Invalid pair"));
      await expect(InvitationPage({ params: Promise.resolve({ slug: "invalid-pair" }) })).rejects.toThrow("NEXT_NOT_FOUND");

      vi.mocked(invitationRepository.findBySlug).mockRejectedValueOnce(new Error("Database unavailable"));
      await expect(InvitationPage({ params: Promise.resolve({ slug: "broken-db" }) })).rejects.toThrow("Database unavailable");
    });
  });

  describe("InvitePage (/[slug]/invite/page.tsx)", () => {
    it("renders InviteClientView for valid invitation via server repository boundary", async () => {
      vi.mocked(invitationRepository.findBySlug).mockResolvedValueOnce(
        createMockInvitation("rika-fauzi", "red")
      );

      const pageElement = await InvitePage({
        params: Promise.resolve({ slug: "rika-fauzi" }),
      });

      expect(invitationRepository.findBySlug).toHaveBeenCalledWith("rika-fauzi");
      expect(pageElement).toBeDefined();
      expect(pageElement.props.slug).toBe("rika-fauzi");
      expect(pageElement.props.invitationData.couple.groom.name).toBe("Fauzi");
      expect(pageElement.props.invitationData.couple.bride.name).toBe("Rika");
    });

    it("calls notFound() for unknown slug on invite page", async () => {
      vi.mocked(invitationRepository.findBySlug).mockResolvedValueOnce(null);

      await expect(
        InvitePage({ params: Promise.resolve({ slug: "ghost-wedding" }) })
      ).rejects.toThrow("NEXT_NOT_FOUND");

      expect(invitationRepository.findBySlug).toHaveBeenCalledWith("ghost-wedding");
      expect(mockNotFound).toHaveBeenCalledTimes(1);
    });
  });

  describe("ClassicRosePage (/(templates)/wedding/classic-rose/[variant]/page.tsx)", () => {
    it("renders default-preview explicitly when slug searchParam is omitted", async () => {
      vi.mocked(invitationRepository.findBySlug).mockResolvedValueOnce(
        createMockInvitation("default-preview", "green")
      );

      const pageElement = await ClassicRosePage({
        params: Promise.resolve({ variant: "green" }),
      });

      expect(invitationRepository.findBySlug).toHaveBeenCalledWith("default-preview");
      expect(pageElement.props.invitationSlug).toBe("default-preview");
      expect(pageElement.props.themeConfig.colors.primary).toBe("#4c6537");
    });

    it("renders explicit target slug when searchParams.slug is provided", async () => {
      vi.mocked(invitationRepository.findBySlug).mockResolvedValueOnce(
        createMockInvitation("dudi-aini", "blue")
      );

      const pageElement = await ClassicRosePage({
        params: Promise.resolve({ variant: "blue" }),
        searchParams: Promise.resolve({ slug: "dudi-aini" }),
      });

      expect(invitationRepository.findBySlug).toHaveBeenCalledWith("dudi-aini");
      expect(pageElement.props.invitationSlug).toBe("dudi-aini");
      expect(pageElement.props.themeConfig.colors.primary).toBe("#315b8b");
    });

    it("calls notFound() for invalid variant name", async () => {
      await expect(
        ClassicRosePage({
          params: Promise.resolve({ variant: "neon-pink" }),
        })
      ).rejects.toThrow("NEXT_NOT_FOUND");

      expect(mockNotFound).toHaveBeenCalledTimes(1);
      expect(invitationRepository.findBySlug).not.toHaveBeenCalled();
    });

    it("calls notFound() if repository returns null for searchParams slug", async () => {
      vi.mocked(invitationRepository.findBySlug).mockResolvedValueOnce(null);

      await expect(
        ClassicRosePage({
          params: Promise.resolve({ variant: "red" }),
          searchParams: Promise.resolve({ slug: "non-existent" }),
        })
      ).rejects.toThrow("NEXT_NOT_FOUND");

      expect(invitationRepository.findBySlug).toHaveBeenCalledWith("non-existent");
      expect(mockNotFound).toHaveBeenCalledTimes(1);
    });

    it("does not render a Siger slug in Classic Rose preview", async () => {
      vi.mocked(invitationRepository.findBySlug).mockResolvedValueOnce({
        ...createMockInvitation("future-siger"),
        meta: { theme: "siger-priangan", variant: "ivory" },
      });

      await expect(
        ClassicRosePage({
          params: Promise.resolve({ variant: "red" }),
          searchParams: Promise.resolve({ slug: "future-siger" }),
        })
      ).rejects.toThrow("NEXT_NOT_FOUND");
    });
  });

  describe("Client/Server Boundary Security Review", () => {
    const rootDir = process.cwd();
    const useClientDirective = '"use ' + 'client";';
    const useClientPattern = new RegExp('["\']use ' + 'client["\']');

    it("ensures InviteClientView has 'use client' and does not import server modules or secrets", () => {
      const inviteClientFilePath = path.join(
        rootDir,
        "src/app/[slug]/invite/components/InviteClientView.tsx"
      );
      const content = fs.readFileSync(inviteClientFilePath, "utf8");

      expect(content.startsWith(useClientDirective)).toBe(true);
      expect(content).not.toContain('from "@/lib/server/db"');
      expect(content).not.toContain('from "@prisma/client"');
      expect(content).not.toContain("server-only");
      expect(content).not.toContain("bcryptjs");
      expect(content).not.toContain(["CLOUDINARY", "_API_KEY"].join(""));
      expect(content).not.toContain(["CLOUDINARY", "_API_SECRET"].join(""));
      expect(content).not.toContain(["DATA", "BASE_URL"].join(""));
      expect(content).not.toContain(["AUTH", "_SECRET"].join(""));
    });

    it("ensures [slug]/page.tsx is a Server Component (no 'use client')", () => {
      const pagePath = path.join(rootDir, "src/app/[slug]/page.tsx");
      const content = fs.readFileSync(pagePath, "utf8");

      expect(useClientPattern.test(content)).toBe(false);
    });

    it("ensures [slug]/invite/page.tsx is a Server Component (no 'use client')", () => {
      const pagePath = path.join(rootDir, "src/app/[slug]/invite/page.tsx");
      const content = fs.readFileSync(pagePath, "utf8");

      expect(useClientPattern.test(content)).toBe(false);
    });

    it("ensures (templates)/wedding/classic-rose/[variant]/page.tsx is a Server Component (no 'use client')", () => {
      const pagePath = path.join(
        rootDir,
        "src/app/(templates)/wedding/classic-rose/[variant]/page.tsx"
      );
      const content = fs.readFileSync(pagePath, "utf8");

      expect(useClientPattern.test(content)).toBe(false);
    });
  });
});

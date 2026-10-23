import { describe, expect, it, vi } from "vitest";
import { verifySeed } from "./verify-seed";
import { DatabaseTargetError } from "@/features/invitations/db-guard";
import type { PrismaClient } from "@/generated/prisma/client";
import type { InvitationRepository } from "@/features/invitations/repository";

describe("Verify Seed Module Boundary & Target Guard (SEED-05)", () => {
  it("rejects non-local Aiven/remote database URL and never calls Prisma import factory", async () => {
    const remoteUrl =
      "postgresql://avnadmin:secret123@pg-ayawarta-prod.aivencloud.com:5432/ayawarta";
    const loadPrismaClient = vi.fn();
    const loadRepository = vi.fn();

    await expect(
      verifySeed({
        databaseUrl: remoteUrl,
        loadPrismaClient,
        loadRepository,
      })
    ).rejects.toThrowError(DatabaseTargetError);

    expect(loadPrismaClient).not.toHaveBeenCalled();
    expect(loadRepository).not.toHaveBeenCalled();
  });

  it("rejects non-local AWS/Neon host and never calls Prisma import factory", async () => {
    const remoteUrl =
      "postgresql://user:pass@ep-cool-fog.us-east-2.aws.neon.tech:5432/ayawarta";
    const loadPrismaClient = vi.fn();
    const loadRepository = vi.fn();

    await expect(
      verifySeed({
        databaseUrl: remoteUrl,
        loadPrismaClient,
        loadRepository,
      })
    ).rejects.toThrowError(DatabaseTargetError);

    expect(loadPrismaClient).not.toHaveBeenCalled();
    expect(loadRepository).not.toHaveBeenCalled();
  });

  it("rejects invalid port (5433) and never calls Prisma import factory", async () => {
    const wrongPortUrl = "postgresql://user:pass@localhost:5433/ayawarta";
    const loadPrismaClient = vi.fn();
    const loadRepository = vi.fn();

    await expect(
      verifySeed({
        databaseUrl: wrongPortUrl,
        loadPrismaClient,
        loadRepository,
      })
    ).rejects.toThrowError(DatabaseTargetError);

    expect(loadPrismaClient).not.toHaveBeenCalled();
    expect(loadRepository).not.toHaveBeenCalled();
  });

  it("rejects wrong database name and never calls Prisma import factory", async () => {
    const wrongDbUrl = "postgresql://user:pass@localhost:5432/ayawarta_production";
    const loadPrismaClient = vi.fn();
    const loadRepository = vi.fn();

    await expect(
      verifySeed({
        databaseUrl: wrongDbUrl,
        loadPrismaClient,
        loadRepository,
      })
    ).rejects.toThrowError(DatabaseTargetError);

    expect(loadPrismaClient).not.toHaveBeenCalled();
    expect(loadRepository).not.toHaveBeenCalled();
  });

  it("rejects malformed database URL string and never calls Prisma import factory", async () => {
    const malformedUrl = "not-a-valid-database-url";
    const loadPrismaClient = vi.fn();
    const loadRepository = vi.fn();

    await expect(
      verifySeed({
        databaseUrl: malformedUrl,
        loadPrismaClient,
        loadRepository,
      })
    ).rejects.toThrowError(DatabaseTargetError);

    expect(loadPrismaClient).not.toHaveBeenCalled();
    expect(loadRepository).not.toHaveBeenCalled();
  });

  it("ensures $disconnect() is called on successful verification run", async () => {
    const localUrl = "postgresql://postgres:root@localhost:5432/ayawarta";
    const mockDisconnect = vi.fn().mockResolvedValue(undefined);

    const mockPrisma = {
      $disconnect: mockDisconnect,
      user: { count: vi.fn().mockResolvedValue(1) },
      mediaAsset: { count: vi.fn().mockResolvedValue(31) },
      invitation: {
        count: vi.fn().mockResolvedValue(4),
        findMany: vi.fn().mockResolvedValue([
          { slug: "rika-fauzi", heroAsset: { id: "h1" }, musicAsset: { id: "m1" }, galleryVideoUrl: null },
          { slug: "shidqi-mita", heroAsset: { id: "h2" }, musicAsset: { id: "m2" }, galleryVideoUrl: null },
          { slug: "dudi-aini", heroAsset: { id: "h3" }, musicAsset: { id: "m3" }, galleryVideoUrl: null },
          { slug: "default-preview", heroAsset: { id: "h4" }, musicAsset: { id: "m4" }, galleryVideoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
        ]),
      },
      invitationSections: { count: vi.fn().mockResolvedValue(4) },
      partner: { count: vi.fn().mockResolvedValue(8) },
      event: { count: vi.fn().mockResolvedValue(6) },
      galleryItem: { count: vi.fn().mockResolvedValue(21) },
      loveStory: { count: vi.fn().mockResolvedValue(6) },
      giftAccount: { count: vi.fn().mockResolvedValue(5) },
    };

    const mockRepository = {
      findBySlug: vi.fn().mockImplementation((slug: string) => {
        if (slug === "non-existent-slug-xyz") return Promise.resolve(null);
        return Promise.resolve({
          data: {
            couple: {
              heroImage: `https://res.cloudinary.com/uhwi7xvb/image/upload/v1/ayawarta/production/invitations/${slug}/couple/hero.jpg`,
              groom: { photo: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1/groom.jpg" },
              bride: { photo: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1/bride.jpg" },
            },
            gallery: {
              videoUrl: slug === "default-preview" ? "https://www.youtube.com/watch?v=dQw4w9WgXcQ" : "",
              images: slug === "dudi-aini" ? [1, 2, 3] : [1, 2, 3, 4, 5, 6],
            },
            musicUrl: `https://res.cloudinary.com/uhwi7xvb/video/upload/v1/ayawarta/production/invitations/${slug}/audio/background-music.mp3`,
            events: slug === "rika-fauzi" || slug === "default-preview" ? [1, 2] : [1],
            loveStory: slug === "rika-fauzi" || slug === "default-preview" ? [1, 2, 3] : undefined,
            gifts: slug === "rika-fauzi" || slug === "default-preview" ? [1, 2] : slug === "dudi-aini" ? [1] : undefined,
          },
        });
      }),
    };

    const loadPrismaClient = vi
      .fn()
      .mockResolvedValue({ prisma: mockPrisma as unknown as PrismaClient });
    const loadRepository = vi
      .fn()
      .mockResolvedValue({
        invitationRepository: mockRepository as unknown as InvitationRepository,
      });

    await verifySeed({
      databaseUrl: localUrl,
      loadPrismaClient,
      loadRepository,
    });

    expect(loadPrismaClient).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it("ensures $disconnect() is called even when verification fails", async () => {
    const localUrl = "postgresql://postgres:root@localhost:5432/ayawarta";
    const mockDisconnect = vi.fn().mockResolvedValue(undefined);

    const mockPrisma = {
      $disconnect: mockDisconnect,
      user: { count: vi.fn().mockRejectedValue(new Error("Database count failed")) },
    };

    const loadPrismaClient = vi
      .fn()
      .mockResolvedValue({ prisma: mockPrisma as unknown as PrismaClient });
    const loadRepository = vi
      .fn()
      .mockResolvedValue({
        invitationRepository: {} as unknown as InvitationRepository,
      });

    await expect(
      verifySeed({
        databaseUrl: localUrl,
        loadPrismaClient,
        loadRepository,
      })
    ).rejects.toThrowError("Database count failed");

    expect(loadPrismaClient).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });
});

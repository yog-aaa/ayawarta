import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getServerEnv } from "@/lib/server/env";

describe("Database live integration and connection contract", () => {
  // Use an isolated PrismaClient instance for integration tests
  // so disconnect will not disrupt any cached global singleton.
  const env = getServerEnv();
  const adapter = new PrismaPg(env.DATABASE_URL);
  const client = new PrismaClient({ adapter });

  afterAll(async () => {
    await client.$disconnect();
  });

  it("provides all 9 model delegates on PrismaClient", () => {
    expect(client.user).toBeDefined();
    expect(typeof client.user.findMany).toBe("function");
    expect(client.mediaAsset).toBeDefined();
    expect(typeof client.mediaAsset.findMany).toBe("function");
    expect(client.invitation).toBeDefined();
    expect(typeof client.invitation.findMany).toBe("function");
    expect(client.invitationSections).toBeDefined();
    expect(typeof client.invitationSections.findMany).toBe("function");
    expect(client.partner).toBeDefined();
    expect(typeof client.partner.findMany).toBe("function");
    expect(client.event).toBeDefined();
    expect(typeof client.event.findMany).toBe("function");
    expect(client.galleryItem).toBeDefined();
    expect(typeof client.galleryItem.findMany).toBe("function");
    expect(client.loveStory).toBeDefined();
    expect(typeof client.loveStory.findMany).toBe("function");
    expect(client.giftAccount).toBeDefined();
    expect(typeof client.giftAccount.findMany).toBe("function");
  });

  it("successfully connects and executes a read-only query on PostgreSQL", async () => {
    const result = await client.$queryRaw<[{ result: number }]>`SELECT 1 as result`;
    expect(result).toBeDefined();
    expect(result.length).toBe(1);
    expect(Number(result[0].result)).toBe(1);
  });

  it("verifies Invitation model supports heroAsset and musicAsset relations via read-only query", async () => {
    const invitations = await client.invitation.findMany({
      take: 1,
      include: {
        heroAsset: true,
        musicAsset: true,
      },
    });
    expect(Array.isArray(invitations)).toBe(true);
  });

  it("verifies Invitation model supports galleryVideoUrl field via read-only select query", async () => {
    const invitations = await client.invitation.findMany({
      take: 1,
      select: {
        id: true,
        slug: true,
        galleryVideoUrl: true,
      },
    });
    expect(Array.isArray(invitations)).toBe(true);
  });

  it("successfully queries all 9 application tables returning non-negative counts", async () => {
    const [
      users,
      media,
      invitations,
      sections,
      partners,
      events,
      gallery,
      stories,
      gifts,
    ] = await Promise.all([
      client.user.count(),
      client.mediaAsset.count(),
      client.invitation.count(),
      client.invitationSections.count(),
      client.partner.count(),
      client.event.count(),
      client.galleryItem.count(),
      client.loveStory.count(),
      client.giftAccount.count(),
    ]);

    expect(users).toBeGreaterThanOrEqual(0);
    expect(media).toBeGreaterThanOrEqual(0);
    expect(invitations).toBeGreaterThanOrEqual(0);
    expect(sections).toBeGreaterThanOrEqual(0);
    expect(partners).toBeGreaterThanOrEqual(0);
    expect(events).toBeGreaterThanOrEqual(0);
    expect(gallery).toBeGreaterThanOrEqual(0);
    expect(stories).toBeGreaterThanOrEqual(0);
    expect(gifts).toBeGreaterThanOrEqual(0);
  });
});

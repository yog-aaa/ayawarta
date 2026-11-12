import type { Prisma } from "@/generated/prisma/client";

export const invitationDetailInclude = {
  sections: true,
  heroAsset: true,
  musicAsset: true,
  partners: {
    include: {
      photoAsset: true,
    },
  },
  events: {
    orderBy: {
      position: "asc",
    },
  },
  galleryItems: {
    orderBy: {
      position: "asc",
    },
    include: {
      asset: true,
    },
  },
  loveStories: {
    orderBy: {
      position: "asc",
    },
  },
  giftAccounts: {
    orderBy: {
      position: "asc",
    },
  },
} as const satisfies Prisma.InvitationInclude;

export type InvitationDetailPayload = Prisma.InvitationGetPayload<{
  include: typeof invitationDetailInclude;
}>;

/**
 * Classic Rose public reads retain the legacy column selection to preserve its
 * established data contract. Prisma `include` selects all scalar columns.
 * Siger rows are reread with invitationDetailInclude after the theme
 * discriminator so greeting, prayer, and gallery captions are available.
 */
export const publicInvitationSelect = {
  id: true,
  slug: true,
  theme: true,
  variant: true,
  weddingDate: true,
  heroAssetId: true,
  galleryVideoUrl: true,
  musicAssetId: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  sections: true,
  heroAsset: true,
  musicAsset: true,
  partners: { include: { photoAsset: true } },
  events: { orderBy: { position: "asc" } },
  galleryItems: {
    orderBy: { position: "asc" },
    select: {
      id: true,
      invitationId: true,
      assetId: true,
      altText: true,
      position: true,
      asset: true,
    },
  },
  loveStories: { orderBy: { position: "asc" } },
  giftAccounts: { orderBy: { position: "asc" } },
} as const satisfies Prisma.InvitationSelect;

export type PublicInvitationDetailPayload = Prisma.InvitationGetPayload<{
  select: typeof publicInvitationSelect;
}>;

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
 * Public reads use only columns present before the admin/Siger migration. The
 * operator's local app currently targets an unmigrated Neon database; Prisma
 * `include` would otherwise select newly generated scalar columns eagerly.
 * Switch to the full include only in the reviewed T3/production activation.
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

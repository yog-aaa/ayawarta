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

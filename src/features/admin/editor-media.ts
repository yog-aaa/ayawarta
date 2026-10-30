import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { requireAdminSession } from "@/features/auth/service";
import { DraftPersistenceError } from "./draft-repository";

const mediaSelect = {
  id: true,
  secureUrl: true,
  resourceType: true,
  width: true,
  height: true,
  originalName: true,
  publicId: true,
  heroInvitations: { select: { id: true } },
  musicInvitations: { select: { id: true } },
  partners: { select: { invitationId: true } },
  galleryItems: { select: { invitationId: true } },
} as const satisfies Prisma.MediaAssetSelect;

export interface AssociatedMedia {
  id: string;
  url: string;
  resourceType: "IMAGE" | "VIDEO" | "AUDIO";
  width: number | null;
  height: number | null;
  label: string;
  shared: boolean;
  deliverable: boolean;
}

/** Pure scoped query for isolated tests and authenticated server callers. */
export async function listAssociatedMedia(
  db: Pick<PrismaClient, "invitation" | "mediaAsset">,
  invitationId: string
): Promise<AssociatedMedia[]> {
  const invitation = await db.invitation.findUnique({
    where: { id: invitationId },
    select: {
      heroAssetId: true,
      musicAssetId: true,
      partners: { select: { photoAssetId: true } },
      galleryItems: { select: { assetId: true } },
    },
  });
  if (!invitation) throw new DraftPersistenceError("not_found", "Invitation not found");
  const ids = new Set([
    invitation.heroAssetId,
    ...(invitation.musicAssetId ? [invitation.musicAssetId] : []),
    ...invitation.partners.map((partner) => partner.photoAssetId),
    ...invitation.galleryItems.map((item) => item.assetId),
  ]);
  if (ids.size > 100) throw new Error("Too many media associations for editor read");
  const rows = await db.mediaAsset.findMany({
    where: { id: { in: [...ids] } },
    select: mediaSelect,
    take: 100,
    orderBy: { publicId: "asc" },
  });
  return rows.filter((row) => ids.has(row.id)).map((row) => {
    const otherInvitationIds = [
      ...row.heroInvitations.map((item) => item.id),
      ...row.musicInvitations.map((item) => item.id),
      ...row.partners.map((item) => item.invitationId),
      ...row.galleryItems.map((item) => item.invitationId),
    ];
    return {
      id: row.id,
      url: row.secureUrl,
      resourceType: row.resourceType,
      width: row.width,
      height: row.height,
      label: row.originalName || row.publicId.split("/").at(-1) || "Media undangan",
      shared: otherInvitationIds.some((id) => id !== invitationId),
      deliverable: row.secureUrl.startsWith("https://res.cloudinary.com/"),
    };
  });
}

/** Page-facing media read; always rechecks the live administrator record. */
export async function loadAssociatedMedia(invitationId: string): Promise<AssociatedMedia[]> {
  await requireAdminSession();
  const { prisma } = await import("@/lib/server/db");
  return listAssociatedMedia(prisma, invitationId);
}

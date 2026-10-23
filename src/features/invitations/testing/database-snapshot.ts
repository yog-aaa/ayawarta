import "server-only";

import crypto from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";

export interface DatabaseSnapshot {
  user: Array<{
    id: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    failedLoginCount: number;
    lockedUntil: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  mediaAsset: Array<{
    id: string;
    publicId: string;
    secureUrl: string;
    folder: string;
    resourceType: string;
    format: string | null;
    bytes: number;
    width: number | null;
    height: number | null;
    originalName: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  invitation: Array<{
    id: string;
    slug: string;
    theme: string;
    variant: string;
    weddingDate: string;
    heroAssetId: string;
    galleryVideoUrl: string | null;
    musicAssetId: string | null;
    ownerId: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  invitationSections: Array<{
    id: string;
    invitationId: string;
    couple: boolean;
    events: boolean;
    gallery: boolean;
    loveStory: boolean;
    gifts: boolean;
    wishes: boolean;
  }>;
  partner: Array<{
    id: string;
    invitationId: string;
    role: string;
    name: string;
    parents: string;
    instagram: string | null;
    photoAssetId: string;
  }>;
  event: Array<{
    id: string;
    invitationId: string;
    name: string;
    displayDate: string;
    displayTime: string;
    location: string;
    address: string;
    mapUrl: string;
    position: number;
  }>;
  galleryItem: Array<{
    id: string;
    invitationId: string;
    assetId: string;
    altText: string;
    position: number;
  }>;
  loveStory: Array<{
    id: string;
    invitationId: string;
    title: string;
    content: string;
    position: number;
  }>;
  giftAccount: Array<{
    id: string;
    invitationId: string;
    platform: string;
    accountHolder: string;
    accountNumber: string;
    logoPath: string;
    position: number;
  }>;
}

/**
 * Captures a deterministic, credential-free content snapshot across all 9 database tables (SEED-06).
 * Sorted strictly by primary/unique/composite keys so results are byte-for-byte and structurally reproducible.
 * Omits sensitive credential hashes (such as passwordHash) while preserving all primary keys, foreign keys,
 * values, and updated/created timestamps.
 */
export async function captureDatabaseSnapshot(
  prisma: PrismaClient
): Promise<DatabaseSnapshot> {
  const users = await prisma.user.findMany({
    orderBy: { email: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      failedLoginCount: true,
      lockedUntil: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const mediaAssets = await prisma.mediaAsset.findMany({
    orderBy: { publicId: "asc" },
  });

  const invitations = await prisma.invitation.findMany({
    orderBy: { slug: "asc" },
  });

  const invitationSections = await prisma.invitationSections.findMany({
    orderBy: { invitationId: "asc" },
  });

  const partners = await prisma.partner.findMany({
    orderBy: [{ invitationId: "asc" }, { role: "asc" }],
  });

  const events = await prisma.event.findMany({
    orderBy: [{ invitationId: "asc" }, { position: "asc" }],
  });

  const galleryItems = await prisma.galleryItem.findMany({
    orderBy: [{ invitationId: "asc" }, { position: "asc" }],
  });

  const loveStories = await prisma.loveStory.findMany({
    orderBy: [{ invitationId: "asc" }, { position: "asc" }],
  });

  const giftAccounts = await prisma.giftAccount.findMany({
    orderBy: [{ invitationId: "asc" }, { position: "asc" }],
  });

  return {
    user: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      isActive: u.isActive,
      failedLoginCount: u.failedLoginCount,
      lockedUntil: u.lockedUntil ? u.lockedUntil.toISOString() : null,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    })),
    mediaAsset: mediaAssets.map((m) => ({
      id: m.id,
      publicId: m.publicId,
      secureUrl: m.secureUrl,
      folder: m.folder,
      resourceType: m.resourceType,
      format: m.format,
      bytes: m.bytes,
      width: m.width,
      height: m.height,
      originalName: m.originalName,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    })),
    invitation: invitations.map((i) => ({
      id: i.id,
      slug: i.slug,
      theme: i.theme,
      variant: i.variant,
      weddingDate: i.weddingDate.toISOString(),
      heroAssetId: i.heroAssetId,
      galleryVideoUrl: i.galleryVideoUrl,
      musicAssetId: i.musicAssetId,
      ownerId: i.ownerId,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    })),
    invitationSections: invitationSections.map((s) => ({
      id: s.id,
      invitationId: s.invitationId,
      couple: s.couple,
      events: s.events,
      gallery: s.gallery,
      loveStory: s.loveStory,
      gifts: s.gifts,
      wishes: s.wishes,
    })),
    partner: partners.map((p) => ({
      id: p.id,
      invitationId: p.invitationId,
      role: p.role,
      name: p.name,
      parents: p.parents,
      instagram: p.instagram,
      photoAssetId: p.photoAssetId,
    })),
    event: events.map((e) => ({
      id: e.id,
      invitationId: e.invitationId,
      name: e.name,
      displayDate: e.displayDate,
      displayTime: e.displayTime,
      location: e.location,
      address: e.address,
      mapUrl: e.mapUrl,
      position: e.position,
    })),
    galleryItem: galleryItems.map((g) => ({
      id: g.id,
      invitationId: g.invitationId,
      assetId: g.assetId,
      altText: g.altText,
      position: g.position,
    })),
    loveStory: loveStories.map((l) => ({
      id: l.id,
      invitationId: l.invitationId,
      title: l.title,
      content: l.content,
      position: l.position,
    })),
    giftAccount: giftAccounts.map((ga) => ({
      id: ga.id,
      invitationId: ga.invitationId,
      platform: ga.platform,
      accountHolder: ga.accountHolder,
      accountNumber: ga.accountNumber,
      logoPath: ga.logoPath,
      position: ga.position,
    })),
  };
}

/**
 * Recursively sorts all object keys to produce a deterministic, canonical representation.
 * Leaves arrays in their given element order and preserves primitives/nulls.
 */
export function canonicalizeJson(val: unknown): unknown {
  if (val === null || typeof val !== "object") {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(canonicalizeJson);
  }
  const record = val as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const canonicalObj: Record<string, unknown> = {};
  for (const k of keys) {
    canonicalObj[k] = canonicalizeJson(record[k]);
  }
  return canonicalObj;
}

/**
 * Computes deterministic SHA-256 hex digest of a database snapshot (SEED-06, SEED-08).
 * Recursively canonicalizes all nested properties and rows without dropping any nested keys.
 */
export function computeSnapshotDigest(snapshot: DatabaseSnapshot): string {
  const canonical = canonicalizeJson(snapshot);
  const jsonStr = JSON.stringify(canonical);
  return crypto.createHash("sha256").update(jsonStr).digest("hex");
}

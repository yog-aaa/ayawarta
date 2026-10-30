import { createHash } from "node:crypto";
import { z } from "zod";
import type { InvitationDetailPayload } from "@/features/invitations/query";

export const PUBLICATION_SNAPSHOT_SCHEMA_VERSION = 1 as const;

type MediaRecord = NonNullable<InvitationDetailPayload["heroAsset"]>;

export type PublicationSnapshotV1 = {
  schemaVersion: 1;
  invitation: {
    id: string;
    slug: string;
    theme: string;
    variant: string;
    weddingDate: string;
    heroAssetId: string;
    galleryVideoUrl: string | null;
    musicAssetId: string | null;
    ownerId: string | null;
    greeting: string | null;
    prayer: string | null;
    publishedVersion: number;
    createdAt: string;
    updatedAt: string;
  };
  sections: {
    id: string;
    couple: boolean;
    events: boolean;
    gallery: boolean;
    loveStory: boolean;
    gifts: boolean;
    wishes: boolean;
  };
  partners: Array<{
    id: string;
    role: "GROOM" | "BRIDE";
    name: string;
    parents: string;
    instagram: string | null;
    photoAssetId: string;
  }>;
  events: Array<{
    id: string;
    position: number;
    name: string;
    displayDate: string;
    displayTime: string;
    location: string;
    address: string;
    mapUrl: string;
  }>;
  galleryItems: Array<{
    id: string;
    position: number;
    assetId: string;
    altText: string;
    caption: string | null;
  }>;
  loveStories: Array<{ id: string; position: number; title: string; content: string }>;
  giftAccounts: Array<{
    id: string;
    position: number;
    platform: string;
    accountHolder: string;
    accountNumber: string;
    logoPath: string;
  }>;
  media: Array<{
    id: string;
    publicId: string;
    secureUrl: string;
    folder: string;
    resourceType: "IMAGE" | "VIDEO" | "AUDIO";
    format: string | null;
    bytes: number;
    width: number | null;
    height: number | null;
    originalName: string | null;
  }>;
};

export class PublicationSnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicationSnapshotError";
  }
}

const orderedPosition = z.number().int().positive();
const snapshotSchema = z.strictObject({
  schemaVersion: z.literal(1),
  invitation: z.strictObject({
    id: z.string().min(1),
    slug: z.string().min(1),
    theme: z.string().min(1),
    variant: z.string().min(1),
    weddingDate: z.iso.datetime(),
    heroAssetId: z.string().min(1),
    galleryVideoUrl: z.string().nullable(),
    musicAssetId: z.string().nullable(),
    ownerId: z.string().nullable(),
    greeting: z.string().nullable(),
    prayer: z.string().nullable(),
    publishedVersion: z.number().int().positive(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
  sections: z.strictObject({
    id: z.string().min(1),
    couple: z.boolean(),
    events: z.boolean(),
    gallery: z.boolean(),
    loveStory: z.boolean(),
    gifts: z.boolean(),
    wishes: z.boolean(),
  }),
  partners: z.array(z.strictObject({
    id: z.string().min(1),
    role: z.enum(["GROOM", "BRIDE"]),
    name: z.string(),
    parents: z.string(),
    instagram: z.string().nullable(),
    photoAssetId: z.string().min(1),
  })).length(2),
  events: z.array(z.strictObject({
    id: z.string().min(1),
    position: orderedPosition,
    name: z.string(),
    displayDate: z.string(),
    displayTime: z.string(),
    location: z.string(),
    address: z.string(),
    mapUrl: z.string(),
  })),
  galleryItems: z.array(z.strictObject({
    id: z.string().min(1),
    position: orderedPosition,
    assetId: z.string().min(1),
    altText: z.string(),
    caption: z.string().nullable(),
  })),
  loveStories: z.array(z.strictObject({
    id: z.string().min(1),
    position: orderedPosition,
    title: z.string(),
    content: z.string(),
  })),
  giftAccounts: z.array(z.strictObject({
    id: z.string().min(1),
    position: orderedPosition,
    platform: z.string(),
    accountHolder: z.string(),
    accountNumber: z.string(),
    logoPath: z.string(),
  })),
  media: z.array(z.strictObject({
    id: z.string().min(1),
    publicId: z.string().min(1),
    secureUrl: z.string().min(1),
    folder: z.string(),
    resourceType: z.enum(["IMAGE", "VIDEO", "AUDIO"]),
    format: z.string().nullable(),
    bytes: z.number().int().positive(),
    width: z.number().int().nullable(),
    height: z.number().int().nullable(),
    originalName: z.string().nullable(),
  })),
});

function ordered<T extends { position: number }>(items: readonly T[], label: string): T[] {
  const sorted = [...items].sort((a, b) => a.position - b.position);
  if (sorted.some((item, index) => item.position !== index + 1)) {
    throw new PublicationSnapshotError(`${label} positions must be contiguous and 1-based`);
  }
  return sorted;
}

function mediaView(asset: MediaRecord) {
  if (!asset.id || !asset.publicId || !asset.secureUrl || asset.bytes <= 0) {
    throw new PublicationSnapshotError("Published media reference is incomplete");
  }
  return {
    id: asset.id,
    publicId: asset.publicId,
    secureUrl: asset.secureUrl,
    folder: asset.folder,
    resourceType: asset.resourceType,
    format: asset.format,
    bytes: asset.bytes,
    width: asset.width,
    height: asset.height,
    originalName: asset.originalName,
  };
}

/** Captures every published content field, ordered child, and pinned media identity. */
export function buildPublicationSnapshot(payload: InvitationDetailPayload): PublicationSnapshotV1 {
  if (!payload.sections || !payload.heroAsset) {
    throw new PublicationSnapshotError("Published invitation is missing sections or hero media");
  }
  if (!Number.isSafeInteger(payload.publishedVersion) || payload.publishedVersion < 1) {
    throw new PublicationSnapshotError("Published version is invalid");
  }
  const groom = payload.partners.find((partner) => partner.role === "GROOM");
  const bride = payload.partners.find((partner) => partner.role === "BRIDE");
  if (!groom?.photoAsset || !bride?.photoAsset || payload.partners.length !== 2) {
    throw new PublicationSnapshotError("Published invitation must have two photographed partners");
  }
  const media = new Map<string, ReturnType<typeof mediaView>>();
  const addMedia = (asset: MediaRecord) => media.set(asset.id, mediaView(asset));
  addMedia(payload.heroAsset);
  if (payload.musicAsset) addMedia(payload.musicAsset);
  for (const partner of payload.partners) addMedia(partner.photoAsset);
  for (const item of payload.galleryItems) {
    if (!item.asset) throw new PublicationSnapshotError("Published gallery item has no media");
    addMedia(item.asset);
  }

  return {
    schemaVersion: PUBLICATION_SNAPSHOT_SCHEMA_VERSION,
    invitation: {
      id: payload.id,
      slug: payload.slug,
      theme: payload.theme,
      variant: payload.variant,
      weddingDate: payload.weddingDate.toISOString(),
      heroAssetId: payload.heroAssetId,
      galleryVideoUrl: payload.galleryVideoUrl,
      musicAssetId: payload.musicAssetId,
      ownerId: payload.ownerId,
      greeting: payload.greeting,
      prayer: payload.prayer,
      publishedVersion: payload.publishedVersion,
      createdAt: payload.createdAt.toISOString(),
      updatedAt: payload.updatedAt.toISOString(),
    },
    sections: {
      id: payload.sections.id,
      couple: payload.sections.couple,
      events: payload.sections.events,
      gallery: payload.sections.gallery,
      loveStory: payload.sections.loveStory,
      gifts: payload.sections.gifts,
      wishes: payload.sections.wishes,
    },
    partners: [groom, bride].map((partner) => ({
      id: partner.id,
      role: partner.role,
      name: partner.name,
      parents: partner.parents,
      instagram: partner.instagram,
      photoAssetId: partner.photoAssetId,
    })),
    events: ordered(payload.events, "Event").map((event) => ({
      id: event.id,
      position: event.position,
      name: event.name,
      displayDate: event.displayDate,
      displayTime: event.displayTime,
      location: event.location,
      address: event.address,
      mapUrl: event.mapUrl,
    })),
    galleryItems: ordered(payload.galleryItems, "Gallery").map((item) => ({
      id: item.id,
      position: item.position,
      assetId: item.assetId,
      altText: item.altText,
      caption: item.caption,
    })),
    loveStories: ordered(payload.loveStories, "Story").map((story) => ({
      id: story.id,
      position: story.position,
      title: story.title,
      content: story.content,
    })),
    giftAccounts: ordered(payload.giftAccounts, "Gift").map((gift) => ({
      id: gift.id,
      position: gift.position,
      platform: gift.platform,
      accountHolder: gift.accountHolder,
      accountNumber: gift.accountNumber,
      logoPath: gift.logoPath,
    })),
    media: [...media.values()].sort((a, b) => a.id.localeCompare(b.id)),
  };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonicalize(item)])
    );
  }
  return value;
}

export function digestPublicationSnapshot(snapshot: PublicationSnapshotV1): string {
  return createHash("sha256").update(JSON.stringify(canonicalize(snapshot))).digest("hex");
}

export function publicationMediaIds(snapshot: PublicationSnapshotV1): string[] {
  const referenced = new Set([
    snapshot.invitation.heroAssetId,
    ...(snapshot.invitation.musicAssetId ? [snapshot.invitation.musicAssetId] : []),
    ...snapshot.partners.map((partner) => partner.photoAssetId),
    ...snapshot.galleryItems.map((item) => item.assetId),
  ]);
  const mediaIds = new Set(snapshot.media.map((asset) => asset.id));
  if (referenced.size !== mediaIds.size || [...referenced].some((id) => !mediaIds.has(id))) {
    throw new PublicationSnapshotError("Snapshot media references do not match pinned media");
  }
  return [...referenced].sort();
}

export function verifyPublicationSnapshot(
  snapshot: unknown,
  contentDigest: string,
  expectedInvitationId?: string,
  expectedVersion?: number
): snapshot is PublicationSnapshotV1 {
  const parsed = snapshotSchema.safeParse(snapshot);
  if (!parsed.success) return false;
  const candidate = parsed.data;
  if (expectedInvitationId && candidate.invitation.id !== expectedInvitationId) return false;
  if (expectedVersion && candidate.invitation.publishedVersion !== expectedVersion) return false;
  if (new Set(candidate.partners.map((partner) => partner.role)).size !== 2) return false;
  if ([candidate.events, candidate.galleryItems, candidate.loveStories, candidate.giftAccounts]
    .some((items) => items.some((item, index) => item.position !== index + 1))) return false;
  if (new Set(candidate.media.map((asset) => asset.id)).size !== candidate.media.length) return false;
  try {
    publicationMediaIds(candidate);
    return digestPublicationSnapshot(candidate) === contentDigest;
  } catch {
    return false;
  }
}

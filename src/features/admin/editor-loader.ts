import "server-only";

import type { InvitationData, InvitationMeta } from "@/features/invitations/types";
import { DraftPersistenceError } from "./draft-repository";
import { loadAssociatedMedia } from "./editor-media";
import { validateDraftForPreview, type DraftFieldErrors, type DraftPayloadV1 } from "./draft-schema";
import { getAdminDraft, type AdminDraftDto, type AdminDraftResult } from "./draft-service";
import { isA5Enabled } from "./a5-feature";
import { createDraftMediaRepository, verifyDraftMediaReceipt } from "./draft-media-repository";

export interface AdminMediaChoice {
  id: string;
  url: string;
  resourceType: "IMAGE" | "VIDEO" | "AUDIO";
  width: number | null;
  height: number | null;
  label: string;
  selectable: boolean;
}

export interface AdminEditorData {
  draft: AdminDraftDto;
  mediaChoices: AdminMediaChoice[];
  mediaUploadEnabled: boolean;
  pendingMedia: Array<{ provisionId: string; slot: string; idempotencyKey: string; createdAt: string }>;
}

export type AdminDraftPreview =
  | {
      kind: "ready";
      draftId: string;
      slug: string;
      meta: InvitationMeta;
      data: InvitationData;
      guestInteractions: "read-only";
      missingMediaFields: string[];
    }
  | {
      kind: "incomplete";
      draftId: string;
      slug: string;
      payload: DraftPayloadV1;
      fieldErrors: DraftFieldErrors;
    };

function readFailure(error: unknown): AdminDraftResult<never> {
  if (error instanceof DraftPersistenceError && error.code === "not_found") {
    return { ok: false, code: "not_found", message: "Undangan tidak ditemukan." };
  }
  return { ok: false, code: "dependency_failure", message: "Data editor belum dapat dimuat. Coba lagi." };
}

async function scopedMediaChoices(invitationId: string | null): Promise<AdminMediaChoice[]> {
  if (!invitationId) return [];
  const rows = await loadAssociatedMedia(invitationId);
  return rows.filter((row) => row.deliverable)
    .map((row) => ({
      id: row.id,
      url: row.url,
      resourceType: row.resourceType,
      width: row.width,
      height: row.height,
      label: row.label,
      selectable: !row.shared,
    }));
}

/** Private server read. getAdminDraft revalidates the current administrator before any data query. */
export async function loadAdminEditor(draftId: string): Promise<AdminDraftResult<AdminEditorData>> {
  const loaded = await getAdminDraft(draftId);
  if (!loaded.ok) return loaded;
  try {
    const a5Enabled = isA5Enabled();
    const mediaUploadEnabled = !loaded.data.invitationId && a5Enabled;
    const mediaChoices = await scopedMediaChoices(loaded.data.invitationId);
    let pendingMedia: AdminEditorData["pendingMedia"] = [];
    if (mediaUploadEnabled) {
      const repo = createDraftMediaRepository();
      const [verified, pending] = await Promise.all([
        repo.listVerifiedForDraft(loaded.data.id),
        repo.listPendingForDraft(loaded.data.id),
      ]);
      for (const row of verified) {
        if (!verifyDraftMediaReceipt(row, "uhwi7xvb") || !row.mediaAsset) throw new Error("Invalid draft media receipt");
        if (mediaChoices.some((choice) => choice.id === row.mediaAsset!.id)) continue;
        mediaChoices.push({
          id: row.mediaAsset.id, url: row.mediaAsset.secureUrl, resourceType: "IMAGE",
          width: row.width, height: row.height,
          label: `${row.slot === "cover" ? "Foto sampul" : row.slot === "groom" ? "Foto mempelai pria" :
            row.slot === "bride" ? "Foto mempelai wanita" : "Foto galeri"} · ${row.id.slice(0, 8)}`,
          selectable: true,
        });
      }
      pendingMedia = pending.map((row) => ({
        provisionId: row.id, slot: row.slot === "cover" ? "hero" : row.slot,
        idempotencyKey: row.idempotencyKey, createdAt: row.createdAt.toISOString(),
      }));
    }
    return { ok: true, data: { draft: loaded.data, mediaChoices, mediaUploadEnabled, pendingMedia } };
  } catch (error) {
    return readFailure(error);
  }
}

function requiredMediaUrl(id: string | null, media: ReadonlyMap<string, AdminMediaChoice>): string {
  return id ? media.get(id)?.url ?? "" : "";
}

/** Converts validated saved content to the exact invitation domain without a public-slug lookup. */
export function mapDraftToInvitationData(payload: DraftPayloadV1, mediaChoices: AdminMediaChoice[]): InvitationData {
  const media = new Map(mediaChoices.map((choice) => [choice.id, choice]));
  const galleryItems = payload.galleryItems.map((item) => ({
    url: requiredMediaUrl(item.assetId, media),
    altText: item.altText,
    caption: item.caption,
  }));
  return {
    sections: payload.sections,
    couple: {
      groom: {
        name: payload.partners.groom.name,
        parents: payload.partners.groom.parents,
        instagram: payload.partners.groom.instagram,
        photo: requiredMediaUrl(payload.partners.groom.photoAssetId, media),
      },
      bride: {
        name: payload.partners.bride.name,
        parents: payload.partners.bride.parents,
        instagram: payload.partners.bride.instagram,
        photo: requiredMediaUrl(payload.partners.bride.photoAssetId, media),
      },
      heroImage: requiredMediaUrl(payload.heroAssetId, media),
    },
    weddingDate: new Date(payload.weddingDate ?? 0),
    greeting: payload.greeting,
    prayer: payload.prayer,
    events: payload.events.map((event) => ({
      name: event.name,
      date: event.displayDate,
      time: event.displayTime,
      location: event.location,
      address: event.address,
      mapLink: event.mapUrl,
    })),
    ...(payload.sections.gallery ? {
      gallery: {
        videoUrl: payload.galleryVideoUrl,
        items: galleryItems,
        images: galleryItems.map((item) => item.url),
      },
    } : {}),
    ...(payload.sections.loveStory ? {
      loveStory: payload.loveStories.map((story) => ({ title: story.title, content: story.content })),
    } : {}),
    ...(payload.sections.gifts ? {
      gifts: payload.giftAccounts.map((gift) => ({
        platform: gift.platform,
        accountHolder: gift.accountHolder,
        accountNumber: gift.accountNumber,
        logo: gift.logoPath,
      })),
    } : {}),
    ...(payload.musicAssetId ? { musicUrl: requiredMediaUrl(payload.musicAssetId, media) } : {}),
  };
}

/** Preview of the saved draft only. The caller must render with guest interactions disabled. */
export async function loadAdminPreview(draftId: string): Promise<AdminDraftResult<AdminDraftPreview>> {
  const loaded = await loadAdminEditor(draftId);
  if (!loaded.ok) return loaded;
  const { draft, mediaChoices } = loaded.data;
  const allowedMediaAssetIds = new Set(mediaChoices.map((choice) => choice.id));
  const validated = validateDraftForPreview(draft.payload, {
    existingPublishedSlug: draft.invitationId ? draft.proposedSlug : undefined,
    allowedMediaAssetIds,
  });
  if (!validated.ok) return { ok: true, data: {
    kind: "incomplete",
    draftId,
    slug: draft.proposedSlug,
    payload: draft.payload,
    fieldErrors: validated.fieldErrors,
  } };
  if (!validated.payload.meta || !validated.payload.weddingDate) {
    return { ok: false, code: "dependency_failure", message: "Pratinjau draf belum dapat dimuat." };
  }
  return { ok: true, data: {
    kind: "ready",
    draftId,
    slug: draft.proposedSlug,
    meta: validated.payload.meta,
    data: mapDraftToInvitationData(validated.payload, mediaChoices),
    guestInteractions: "read-only",
    missingMediaFields: validated.missingMediaFields,
  } };
}

import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { requireAdminSession } from "@/features/auth/service";
import { parseInvitationMeta } from "@/features/invitations/mapper";
import type { InvitationDetailPayload } from "@/features/invitations/query";
import { loadAssociatedMedia } from "./editor-media";
import { isA5Enabled } from "./a5-feature";
import { createDraftMediaRepository, verifyDraftMediaReceipt } from "./draft-media-repository";
import {
  createDraftRepository,
  DraftPersistenceError,
} from "./draft-repository";
import {
  parseDraftForSave,
  validateDraftForPublish,
  type DraftFieldErrors,
  type DraftPayloadV1,
} from "./draft-schema";

export type AdminDraftErrorCode =
  | "validation"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "dependency_failure"
  | "unexpected";

export type AdminDraftResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      code: AdminDraftErrorCode;
      message: string;
      fieldErrors?: DraftFieldErrors;
      /** Publication committed, but a post-commit route check did not complete. */
      committedUnverified?: true;
      /** Safe reservation ID for an upload that may need recovery. */
      recoveryId?: string;
    };

export interface AdminDraftDto {
  id: string;
  invitationId: string | null;
  proposedSlug: string;
  payload: DraftPayloadV1;
  draftVersion: number;
  basePublishedVersion: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPublicationSummary {
  id: string;
  invitationId: string;
  version: number;
  source: "BASELINE" | "PUBLISH";
  createdAt: string;
  changeSummary: string | null;
}

type DraftRow = {
  id: string;
  invitationId: string | null;
  proposedSlug: string;
  payload: unknown;
  draftVersion: number;
  basePublishedVersion: number | null;
  createdAt: Date;
  updatedAt: Date;
};

function failure(code: AdminDraftErrorCode, message: string, fieldErrors?: DraftFieldErrors): AdminDraftResult<never> {
  return { ok: false, code, message, ...(fieldErrors ? { fieldErrors } : {}) };
}

function mapFailure(error: unknown): AdminDraftResult<never> {
  if (error instanceof DraftPersistenceError) {
    if (error.code === "not_found") return failure("not_found", "Draf tidak ditemukan.");
    if (error.code === "conflict") return failure("conflict", "Draf berubah. Muat ulang sebelum menyimpan kembali.");
    if (error.code === "baseline_required") return failure("dependency_failure", "Riwayat awal undangan belum siap. Penyuntingan ditunda.");
    return failure("conflict", "Keadaan undangan berubah. Muat ulang halaman ini.");
  }
  if (error instanceof Error && error.message === "Unauthorized") {
    return failure("unauthorized", "Silakan masuk sebagai administrator.");
  }
  if (error instanceof Error && error.message === "Forbidden") {
    return failure("forbidden", "Akses administrator tidak tersedia.");
  }
  if (typeof error === "object" && error !== null && "code" in error &&
      typeof error.code === "string" && ["P1001", "P1002", "P1017", "P2021", "P2022"].includes(error.code)) {
    return failure("dependency_failure", "Penyimpanan draf belum tersedia. Coba lagi setelah panel draf diaktifkan.");
  }
  return failure("unexpected", "Permintaan tidak dapat diproses. Coba lagi.");
}

function toDto(row: DraftRow): AdminDraftDto | null {
  const parsed = parseDraftForSave(row.payload);
  if (!parsed.ok) return null;
  return {
    id: row.id,
    invitationId: row.invitationId,
    proposedSlug: row.proposedSlug,
    payload: parsed.payload,
    draftVersion: row.draftVersion,
    basePublishedVersion: row.basePublishedVersion,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Rehydrates stable editor row keys from the persisted aggregate. */
export function draftFromPublished(row: InvitationDetailPayload): DraftPayloadV1 {
  const groom = row.partners.find((partner) => partner.role === "GROOM");
  const bride = row.partners.find((partner) => partner.role === "BRIDE");
  if (!row.sections || !groom || !bride) throw new Error("Published invitation is incomplete");
  return {
    schemaVersion: 1,
    slug: row.slug,
    meta: parseInvitationMeta(row.theme, row.variant),
    weddingDate: row.weddingDate.toISOString(),
    sections: {
      couple: row.sections.couple,
      events: row.sections.events,
      gallery: row.sections.gallery,
      loveStory: row.sections.loveStory,
      gifts: row.sections.gifts,
      wishes: row.sections.wishes,
    },
    greeting: row.greeting ?? "",
    prayer: row.prayer ?? "",
    heroAssetId: row.heroAssetId,
    musicAssetId: row.musicAssetId,
    galleryVideoUrl: row.galleryVideoUrl ?? "",
    partners: {
      groom: { name: groom.name, parents: groom.parents, instagram: groom.instagram ?? "", photoAssetId: groom.photoAssetId },
      bride: { name: bride.name, parents: bride.parents, instagram: bride.instagram ?? "", photoAssetId: bride.photoAssetId },
    },
    events: [...row.events].sort((a, b) => a.position - b.position).map((event) => ({
      key: event.id,
      name: event.name,
      displayDate: event.displayDate,
      displayTime: event.displayTime,
      location: event.location,
      address: event.address,
      mapUrl: event.mapUrl,
    })),
    galleryItems: [...row.galleryItems].sort((a, b) => a.position - b.position).map((item) => ({
      key: item.id,
      assetId: item.assetId,
      altText: item.altText,
      caption: item.caption ?? "",
    })),
    loveStories: [...row.loveStories].sort((a, b) => a.position - b.position).map((story) => ({
      key: story.id,
      title: story.title,
      content: story.content,
    })),
    giftAccounts: [...row.giftAccounts].sort((a, b) => a.position - b.position).map((gift) => ({
      key: gift.id,
      platform: gift.platform,
      accountHolder: gift.accountHolder,
      accountNumber: gift.accountNumber,
      logoPath: gift.logoPath,
    })),
  };
}

function referencedMedia(payload: DraftPayloadV1): Array<{ field: string; id: string; expected: "IMAGE" | "AUDIO" }> {
  const values: Array<{ field: string; id: string; expected: "IMAGE" | "AUDIO" }> = [];
  const add = (field: string, id: string | null, expected: "IMAGE" | "AUDIO") => {
    if (id) values.push({ field, id, expected });
  };
  add("heroAssetId", payload.heroAssetId, "IMAGE");
  add("musicAssetId", payload.musicAssetId, "AUDIO");
  add("partners.groom.photoAssetId", payload.partners.groom.photoAssetId, "IMAGE");
  add("partners.bride.photoAssetId", payload.partners.bride.photoAssetId, "IMAGE");
  payload.galleryItems.forEach((item, index) => add(`galleryItems.${index}.assetId`, item.assetId, "IMAGE"));
  return values;
}

function preservesPublishedSlot(
  field: string,
  id: string,
  payload: DraftPayloadV1,
  live: InvitationDetailPayload | null
): boolean {
  if (!live) return false;
  if (field === "heroAssetId") return live.heroAssetId === id;
  if (field === "musicAssetId") return live.musicAssetId === id;
  if (field === "partners.groom.photoAssetId") {
    return live.partners.find((partner) => partner.role === "GROOM")?.photoAssetId === id;
  }
  if (field === "partners.bride.photoAssetId") {
    return live.partners.find((partner) => partner.role === "BRIDE")?.photoAssetId === id;
  }
  const galleryIndex = /^galleryItems\.(\d+)\.assetId$/.exec(field);
  if (galleryIndex) {
    const item = payload.galleryItems[Number(galleryIndex[1])];
    return Boolean(item && live.galleryItems.some((published) => published.id === item.key && published.assetId === id));
  }
  return false;
}

async function validateMediaScope(
  payload: DraftPayloadV1,
  invitationId: string | null,
  draftId: string | null,
  repo: ReturnType<typeof createDraftRepository>
): Promise<AdminDraftResult<never> | null> {
  const refs = referencedMedia(payload);
  if (refs.length === 0) return null;
  const media = invitationId ? await loadAssociatedMedia(invitationId) : [];
  if (!invitationId && draftId && isA5Enabled()) {
    const verified = await createDraftMediaRepository().listVerifiedForDraft(draftId);
    for (const row of verified) {
      if (!verifyDraftMediaReceipt(row, "uhwi7xvb") || !row.mediaAsset) continue;
      if (media.some((item) => item.id === row.mediaAsset!.id)) continue;
      media.push({
        id: row.mediaAsset.id, url: row.mediaAsset.secureUrl, resourceType: "IMAGE",
        width: row.width, height: row.height, label: row.mediaAsset.originalName || "Foto undangan",
        shared: false, deliverable: true,
      });
    }
  }
  const byId = new Map(media.map((item) => [item.id, item]));
  const live = invitationId && media.some((item) => item.shared)
    ? await repo.findPublishedById(invitationId)
    : null;
  const errors: DraftFieldErrors = {};
  for (const { field, id, expected } of refs) {
    const item = byId.get(id);
    if (!item || !item.deliverable) {
      errors[field] = ["Media tidak tersedia untuk undangan ini."];
    } else if (item.resourceType !== expected) {
      errors[field] = ["Jenis media tidak sesuai dengan kolom ini."];
    } else if (item.shared && !preservesPublishedSlot(field, id, payload, live)) {
      errors[field] = ["Media yang juga dipakai undangan lain tidak dapat dipilih untuk kolom baru."];
    }
  }
  return Object.keys(errors).length ? failure("validation", "Periksa pilihan media.", errors) : null;
}

function jsonPayload(payload: DraftPayloadV1): Prisma.InputJsonValue {
  return payload as unknown as Prisma.InputJsonValue;
}

/** Creates a private draft; no published Invitation row or media reference is written. */
export async function createAdminNewDraft(input: unknown): Promise<AdminDraftResult<AdminDraftDto>> {
  try {
    const admin = await requireAdminSession();
    const parsed = parseDraftForSave(input);
    if (!parsed.ok) return failure("validation", "Periksa isi draf.", parsed.fieldErrors);
    const repo = createDraftRepository();
    const mediaError = await validateMediaScope(parsed.payload, null, null, repo);
    if (mediaError) return mediaError;
    const row = await repo.createNewDraft({
      proposedSlug: parsed.payload.slug,
      payload: jsonPayload(parsed.payload),
      actorId: admin.id,
    });
    const dto = toDto(row);
    return dto ? { ok: true, data: dto } : failure("unexpected", "Draf tersimpan tetapi tidak dapat dibaca.");
  } catch (error) {
    return mapFailure(error);
  }
}

/** Existing published invitations require a verified baseline snapshot before draft creation. */
export async function createAdminDraftForPublished(input: {
  invitationId: string;
  expectedPublishedVersion?: number;
}): Promise<AdminDraftResult<AdminDraftDto>> {
  try {
    const admin = await requireAdminSession();
    const repo = createDraftRepository();
    const live = await repo.findPublishedById(input.invitationId);
    if (!live) return failure("not_found", "Undangan tidak ditemukan.");
    if (input.expectedPublishedVersion !== undefined && input.expectedPublishedVersion !== live.publishedVersion) {
      return failure("conflict", "Undangan berubah. Muat ulang sebelum membuat draf.");
    }
    const parsed = parseDraftForSave(draftFromPublished(live));
    if (!parsed.ok) return failure("validation", "Periksa isi draf.", parsed.fieldErrors);
    const mediaError = await validateMediaScope(parsed.payload, input.invitationId, null, repo);
    if (mediaError) return mediaError;
    const row = await repo.createDraftForPublished({
      invitationId: input.invitationId,
      expectedPublishedVersion: live.publishedVersion,
      payload: jsonPayload(parsed.payload),
      actorId: admin.id,
    });
    const dto = toDto(row);
    return dto ? { ok: true, data: dto } : failure("unexpected", "Draf tersimpan tetapi tidak dapat dibaca.");
  } catch (error) {
    return mapFailure(error);
  }
}

export async function getAdminDraft(id: string): Promise<AdminDraftResult<AdminDraftDto>> {
  try {
    await requireAdminSession();
    const row = await createDraftRepository().findDraftById(id);
    if (!row) return failure("not_found", "Draf tidak ditemukan.");
    const dto = toDto(row);
    return dto ? { ok: true, data: dto } : failure("dependency_failure", "Draf tidak dapat dibaca.");
  } catch (error) {
    return mapFailure(error);
  }
}

export async function saveAdminDraft(input: {
  id: string;
  expectedDraftVersion: number;
  payload: unknown;
}): Promise<AdminDraftResult<AdminDraftDto>> {
  try {
    const admin = await requireAdminSession();
    const parsed = parseDraftForSave(input.payload);
    if (!parsed.ok) return failure("validation", "Periksa isi draf.", parsed.fieldErrors);
    if (!Number.isSafeInteger(input.expectedDraftVersion) || input.expectedDraftVersion < 1) {
      return failure("validation", "Versi draf tidak valid.", { expectedDraftVersion: ["Versi tidak valid."] });
    }
    const repo = createDraftRepository();
    const prior = await repo.findDraftById(input.id);
    if (!prior) return failure("not_found", "Draf tidak ditemukan.");
    const mediaError = await validateMediaScope(parsed.payload, prior.invitationId, prior.id, repo);
    if (mediaError) return mediaError;
    const row = await repo.saveDraftIfVersion({
      id: input.id,
      expectedDraftVersion: input.expectedDraftVersion,
      proposedSlug: parsed.payload.slug,
      payload: jsonPayload(parsed.payload),
      actorId: admin.id,
    });
    const dto = toDto(row);
    return dto ? { ok: true, data: dto } : failure("unexpected", "Draf tersimpan tetapi tidak dapat dibaca.");
  } catch (error) {
    return mapFailure(error);
  }
}

export async function getAdminPublications(invitationId: string): Promise<AdminDraftResult<AdminPublicationSummary[]>> {
  try {
    await requireAdminSession();
    const rows = await createDraftRepository().findPublications(invitationId);
    return { ok: true, data: rows.map((row) => ({
      id: row.id,
      invitationId: row.invitationId,
      version: row.version,
      source: row.source,
      createdAt: row.createdAt.toISOString(),
      changeSummary: row.changeSummary,
    })) };
  } catch (error) {
    return mapFailure(error);
  }
}

/** Preflight only. A4 owns the separate confirmed transaction that can publish. */
export async function checkAdminDraftPublishability(id: string): Promise<AdminDraftResult<DraftPayloadV1>> {
  try {
    await requireAdminSession();
    const repo = createDraftRepository();
    const row = await repo.findDraftById(id);
    if (!row) return failure("not_found", "Draf tidak ditemukan.");
    if (!row.invitationId) return failure("dependency_failure", "Undangan baru menunggu media sendiri sebelum dapat diterbitkan.");
    const allowedMediaAssetIds = await repo.findAllowedMediaAssetIds(row.invitationId);
    const validated = validateDraftForPublish(row.payload, {
      existingPublishedSlug: row.proposedSlug,
      allowedMediaAssetIds,
    });
    return validated.ok
      ? { ok: true, data: validated.payload }
      : failure("validation", "Periksa isi draf sebelum menerbitkan.", validated.fieldErrors);
  } catch (error) {
    return mapFailure(error);
  }
}

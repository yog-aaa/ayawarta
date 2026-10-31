"use server";

import { z } from "zod";
import { requireAdminSession } from "@/features/auth/service";

import {
  createAdminDraftForPublished,
  createAdminNewDraft,
  saveAdminDraft,
  type AdminDraftDto,
  type AdminDraftResult,
} from "@/features/admin/draft-service";
import {
  publishAdminDraft,
  reviewAdminDraft,
  type PublishInput,
  type PublishReview,
  type PublishSuccess,
} from "@/features/admin/publish-service";
import { recoverAdminDraftImage, type AdminVerifiedImage } from "@/features/admin/media-service";

const openInputSchema = z.object({
  invitationId: z.string().min(1).max(120),
  expectedPublishedVersion: z.number().int().positive().optional(),
}).strict();

const saveInputSchema = z.object({
  id: z.string().min(1).max(120),
  expectedDraftVersion: z.number().int().positive(),
  payload: z.unknown(),
}).strict();

const reviewInputSchema = z.object({ id: z.string().min(1).max(120) }).strict();

const publishInputSchema = z.object({
  id: z.string().min(1).max(120),
  expectedDraftVersion: z.number().int().positive(),
  expectedPublishedVersion: z.number().int().positive().nullable(),
  confirmationSlug: z.string().min(1).max(80),
}).strict();

const recoverMediaInputSchema = z.object({
  draftId: z.string().min(1).max(120),
  provisionId: z.uuid(),
  expectedDraftVersion: z.number().int().positive(),
}).strict();

async function authorizeAction(): Promise<AdminDraftResult<never> | null> {
  try {
    await requireAdminSession();
    return null;
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return { ok: false, code: "unauthorized", message: "Silakan masuk sebagai administrator." };
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return { ok: false, code: "forbidden", message: "Akses administrator tidak tersedia." };
    }
    return { ok: false, code: "dependency_failure", message: "Autentikasi belum dapat diperiksa. Coba lagi." };
  }
}

export async function createInvitationDraftAction(payload: unknown): Promise<AdminDraftResult<AdminDraftDto>> {
  return createAdminNewDraft(payload);
}

export async function openPublishedInvitationDraftAction(input: unknown): Promise<AdminDraftResult<AdminDraftDto>> {
  const authError = await authorizeAction();
  if (authError) return authError;
  const parsed = openInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "validation", message: "Undangan yang dipilih tidak valid.", fieldErrors: { invitationId: ["Pilih undangan yang valid."] } };
  }
  return createAdminDraftForPublished(parsed.data);
}

export async function saveInvitationDraftAction(input: unknown): Promise<AdminDraftResult<AdminDraftDto>> {
  const authError = await authorizeAction();
  if (authError) return authError;
  const parsed = saveInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "validation", message: "Data penyimpanan tidak valid.", fieldErrors: { form: ["Periksa draf dan coba lagi."] } };
  }
  return saveAdminDraft(parsed.data);
}

export async function reviewInvitationDraftAction(input: unknown): Promise<AdminDraftResult<PublishReview>> {
  const authError = await authorizeAction();
  if (authError) return authError;
  const parsed = reviewInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "validation", message: "Draf yang dipilih tidak valid.", fieldErrors: { id: ["Pilih draf yang valid."] } };
  return reviewAdminDraft(parsed.data.id);
}

export async function publishInvitationDraftAction(input: unknown): Promise<AdminDraftResult<PublishSuccess>> {
  const authError = await authorizeAction();
  if (authError) return authError;
  const parsed = publishInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "validation", message: "Konfirmasi penerbitan tidak valid.", fieldErrors: { form: ["Periksa versi dan slug konfirmasi."] } };
  return publishAdminDraft(parsed.data as PublishInput);
}

export async function recoverDraftMediaAction(input: unknown): Promise<AdminDraftResult<AdminVerifiedImage>> {
  const authError = await authorizeAction();
  if (authError) return authError;
  const parsed = recoverMediaInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "validation", message: "Permintaan pemulihan tidak valid.", fieldErrors: { form: ["Periksa draf dan unggahan."] } };
  return recoverAdminDraftImage(parsed.data);
}

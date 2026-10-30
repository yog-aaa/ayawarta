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

const openInputSchema = z.object({
  invitationId: z.string().min(1).max(120),
  expectedPublishedVersion: z.number().int().positive().optional(),
}).strict();

const saveInputSchema = z.object({
  id: z.string().min(1).max(120),
  expectedDraftVersion: z.number().int().positive(),
  payload: z.unknown(),
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

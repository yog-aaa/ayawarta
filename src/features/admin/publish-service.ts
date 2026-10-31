import "server-only";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/features/auth/service";
import { invitationRepository } from "@/features/invitations/repository";
import type { AdminDraftResult } from "./draft-service";
import { createPublishRepository, PublishError } from "./publish-repository";
import { A5UnavailableError, requireA5Enabled } from "./a5-feature";
import { preflightNewDraftMedia } from "./media-service";

export interface PublishReview {
  draftId: string;
  invitationId: string | null;
  slug: string;
  draftVersion: number;
  publishedVersion: number | null;
  changeSummary: string;
  publicPath: string;
}

export interface PublishSuccess {
  slug: string;
  version: number;
  publicPath: string;
}

export interface PublishInput {
  id: string;
  expectedDraftVersion: number;
  expectedPublishedVersion: number | null;
  confirmationSlug: string;
}

function failure(error: unknown): AdminDraftResult<never> {
  if (error instanceof A5UnavailableError) return { ok: false, code: "dependency_failure", message: error.message };
  if (error instanceof PublishError) return {
    ok: false, code: error.code, message: error.message,
    ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
  };
  if (error instanceof Error && error.message === "Unauthorized") return { ok: false, code: "unauthorized", message: "Silakan masuk sebagai administrator." };
  if (error instanceof Error && error.message === "Forbidden") return { ok: false, code: "forbidden", message: "Akses administrator tidak tersedia." };
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : null;
  if (code === "P2034" || code === "P2002") return { ok: false, code: "conflict", message: "Undangan berubah saat diterbitkan. Muat ulang sebelum mencoba lagi." };
  if (typeof code === "string" && ["P1001", "P1002", "P1017", "P2021", "P2022"].includes(code)) {
    return { ok: false, code: "dependency_failure", message: "Penerbitan belum tersedia. Coba lagi setelah penyimpanan siap." };
  }
  return { ok: false, code: "unexpected", message: "Permintaan tidak dapat diproses. Coba lagi." };
}

/** Read-only review of the saved draft and verified current publication. */
export async function reviewAdminDraft(id: string): Promise<AdminDraftResult<PublishReview>> {
  try {
    await requireAdminSession();
    return { ok: true, data: await createPublishRepository().review(id) };
  } catch (error) {
    return failure(error);
  }
}

/** Publication is never inferred from save or preview; only this confirmed command writes live data. */
export async function publishAdminDraft(input: PublishInput): Promise<AdminDraftResult<PublishSuccess>> {
  let committed: PublishSuccess;
  try {
    const admin = await requireAdminSession();
    if (input.expectedPublishedVersion === null) {
      requireA5Enabled();
      const preflight = await preflightNewDraftMedia(input.id, input.expectedDraftVersion);
      if (!preflight.ok) return preflight;
    }
    committed = await createPublishRepository().publish({ ...input, actorId: admin.id });
  } catch (error) {
    return failure(error);
  }

  // A post-commit failure must not pretend the transaction rolled back.
  try {
    revalidatePath(committed.publicPath);
    revalidatePath(`${committed.publicPath}/invite`);
    revalidatePath("/admin");
    revalidatePath("/admin/invitations");
    const exact = await invitationRepository.findBySlug(committed.slug);
    if (!exact) throw new Error("Published slug cannot be read");
    return { ok: true, data: committed };
  } catch {
    return { ok: false, code: "dependency_failure", committedUnverified: true, message: "Publikasi sudah tersimpan, tetapi halaman publik belum berhasil diverifikasi. Muat ulang daftar sebelum melakukan tindakan lain." };
  }
}

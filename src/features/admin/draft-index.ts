import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { requireAdminSession } from "@/features/auth/service";
import { parseDraftForSave } from "./draft-schema";
import type { AdminDraftResult } from "./draft-service";

const PAGE_SIZE = 12;
const MAX_PAGE = 1_000;

const linkedSelect = {
  id: true,
  invitationId: true,
  draftVersion: true,
  updatedAt: true,
} as const satisfies Prisma.InvitationDraftSelect;

const newDraftSelect = {
  id: true,
  proposedSlug: true,
  payload: true,
  draftVersion: true,
  updatedAt: true,
} as const satisfies Prisma.InvitationDraftSelect;

export interface AdminDraftIndexInput {
  publishedInvitationIds: string[];
  q?: string;
  page?: number;
}

export interface AdminDraftIndexResult {
  linked: Array<{ invitationId: string; draftId: string; draftVersion: number; updatedAt: string }>;
  newDrafts: Array<{
    id: string;
    proposedSlug: string;
    coupleName: string;
    theme: string | null;
    variant: string | null;
    updatedAt: string;
    draftVersion: number;
    valid: boolean;
  }>;
  total: number;
  page: number;
  pageSize: 12;
  pageCount: number;
}

function pageNumber(value: number | undefined): number {
  return Number.isSafeInteger(value) && value && value > 0 ? Math.min(value, MAX_PAGE) : 1;
}

function draftSummary(row: Prisma.InvitationDraftGetPayload<{ select: typeof newDraftSelect }>): AdminDraftIndexResult["newDrafts"][number] {
  const parsed = parseDraftForSave(row.payload);
  if (!parsed.ok) {
    return {
      id: row.id,
      proposedSlug: row.proposedSlug,
      coupleName: "Konten draf perlu diperbaiki",
      theme: null,
      variant: null,
      updatedAt: row.updatedAt.toISOString(),
      draftVersion: row.draftVersion,
      valid: false,
    };
  }
  const { groom, bride } = parsed.payload.partners;
  return {
    id: row.id,
    proposedSlug: row.proposedSlug,
    coupleName: [groom.name.trim(), bride.name.trim()].filter(Boolean).join(" & ") || "Nama mempelai belum tersedia",
    theme: parsed.payload.meta?.theme ?? null,
    variant: parsed.payload.meta?.variant ?? null,
    updatedAt: row.updatedAt.toISOString(),
    draftVersion: row.draftVersion,
    valid: true,
  };
}

/** Read model for a bounded published page plus independently paginated new private drafts. */
export async function listAdminDraftIndex(
  db: Pick<PrismaClient, "invitationDraft">,
  input: AdminDraftIndexInput
): Promise<AdminDraftIndexResult> {
  const ids = [...new Set(input.publishedInvitationIds.filter((id) => typeof id === "string" && id.length > 0))];
  if (ids.length > PAGE_SIZE) throw new RangeError("A draft index may inspect only one published page");
  const q = typeof input.q === "string" ? input.q.trim().slice(0, 80) : "";
  const where: Prisma.InvitationDraftWhereInput = {
    invitationId: null,
    ...(q ? {
      OR: [
        { proposedSlug: { contains: q, mode: "insensitive" } },
        { payload: { path: ["partners", "groom", "name"], string_contains: q, mode: "insensitive" } },
        { payload: { path: ["partners", "bride", "name"], string_contains: q, mode: "insensitive" } },
      ],
    } : {}),
  };

  const [total, linkedRows] = await Promise.all([
    db.invitationDraft.count({ where }),
    ids.length ? db.invitationDraft.findMany({
      where: { invitationId: { in: ids } },
      select: linkedSelect,
      take: PAGE_SIZE,
    }) : Promise.resolve([]),
  ]);
  const pageCount = Math.min(Math.ceil(total / PAGE_SIZE), MAX_PAGE);
  const page = Math.min(pageNumber(input.page), Math.max(1, pageCount));
  const rows = total ? await db.invitationDraft.findMany({
    where,
    select: newDraftSelect,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  }) : [];

  return {
    linked: linkedRows.flatMap((row) => row.invitationId ? [{
      invitationId: row.invitationId,
      draftId: row.id,
      draftVersion: row.draftVersion,
      updatedAt: row.updatedAt.toISOString(),
    }] : []),
    newDrafts: rows.map(draftSummary),
    total,
    page,
    pageSize: PAGE_SIZE,
    pageCount,
  };
}

export async function getAdminDraftIndex(input: AdminDraftIndexInput): Promise<AdminDraftResult<AdminDraftIndexResult>> {
  try {
    await requireAdminSession();
    const { prisma } = await import("@/lib/server/db");
    return { ok: true, data: await listAdminDraftIndex(prisma, input) };
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return { ok: false, code: "unauthorized", message: "Silakan masuk sebagai administrator." };
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return { ok: false, code: "forbidden", message: "Akses administrator tidak tersedia." };
    }
    if (error instanceof RangeError) {
      return { ok: false, code: "validation", message: "Halaman daftar undangan tidak valid." };
    }
    return { ok: false, code: "dependency_failure", message: "Data draf belum dapat dimuat. Coba lagi setelah panel draf diaktifkan." };
  }
}

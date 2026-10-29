import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { requireAdminSession } from "@/features/auth/service";

const PAGE_SIZE = 12;
const MAX_PAGE = 1_000;
const MAX_SEARCH_LENGTH = 80;

const invitationListSelect = {
  id: true,
  slug: true,
  theme: true,
  variant: true,
  weddingDate: true,
  updatedAt: true,
  partners: {
    select: { role: true, name: true },
  },
} as const satisfies Prisma.InvitationSelect;

type InvitationListRow = Prisma.InvitationGetPayload<{
  select: typeof invitationListSelect;
}>;

export interface AdminInvitationListDb {
  invitation: {
    count(args: { where: Prisma.InvitationWhereInput }): Promise<number>;
    findMany(args: {
      where: Prisma.InvitationWhereInput;
      select: typeof invitationListSelect;
      skip: number;
      take: number;
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }];
    }): Promise<InvitationListRow[]>;
  };
}

export interface AdminInvitationListInput {
  q?: string;
  page?: number;
}

export interface AdminInvitationSummary {
  id: string;
  slug: string;
  coupleName: string;
  theme: string;
  variant: string;
  weddingDate: string;
  updatedAt: string;
}

export interface AdminInvitationListResult {
  items: AdminInvitationSummary[];
  total: number;
  page: number;
  pageSize: 12;
  pageCount: number;
}

function normalizedPage(value: number | undefined): number {
  if (!Number.isSafeInteger(value) || !value || value < 1) return 1;
  return Math.min(value, MAX_PAGE);
}

function coupleName(partners: InvitationListRow["partners"]): string {
  const groom = partners.find((partner) => partner.role === "GROOM")?.name.trim();
  const bride = partners.find((partner) => partner.role === "BRIDE")?.name.trim();
  return [groom, bride].filter(Boolean).join(" & ") || "Nama mempelai belum tersedia";
}

/** Pure read model for isolated tests and authenticated server callers. */
export async function listAdminInvitations(
  db: AdminInvitationListDb,
  input: AdminInvitationListInput = {}
): Promise<AdminInvitationListResult> {
  const q = typeof input.q === "string" ? input.q.trim().slice(0, MAX_SEARCH_LENGTH) : "";
  const where: Prisma.InvitationWhereInput = q
    ? {
        OR: [
          { slug: { contains: q, mode: "insensitive" } },
          { partners: { some: { name: { contains: q, mode: "insensitive" } } } },
        ],
      }
    : {};

  const total = await db.invitation.count({ where });
  const pageCount = Math.min(Math.ceil(total / PAGE_SIZE), MAX_PAGE);
  const page = Math.min(normalizedPage(input.page), Math.max(1, pageCount));
  const rows = total > 0
    ? await db.invitation.findMany({
        where,
        select: invitationListSelect,
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      })
    : [];

  return {
    items: rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      coupleName: coupleName(row.partners),
      theme: row.theme,
      variant: row.variant,
      weddingDate: row.weddingDate.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
    total,
    page,
    pageSize: PAGE_SIZE,
    pageCount,
  };
}

/** Page entry point: verify the live admin record before creating a list query. */
export async function getAdminInvitationList(
  input: AdminInvitationListInput = {}
): Promise<AdminInvitationListResult> {
  await requireAdminSession();
  const { prisma } = await import("@/lib/server/db");
  return listAdminInvitations(prisma, input);
}

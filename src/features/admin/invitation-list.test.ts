import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAdminSession } from "@/features/auth/service";
import {
  getAdminInvitationList,
  listAdminInvitations,
  type AdminInvitationListDb,
} from "./invitation-list";

vi.mock("@/features/auth/service", () => ({
  requireAdminSession: vi.fn(),
}));

const row = {
  id: "inv-1",
  slug: "bima-anisa",
  theme: "classic-rose",
  variant: "black",
  weddingDate: new Date("2026-12-01T08:00:00.000Z"),
  updatedAt: new Date("2026-10-29T08:00:00.000Z"),
  partners: [
    { role: "BRIDE" as const, name: "Anisa" },
    { role: "GROOM" as const, name: "Bima" },
  ],
};

function mockDb(total: number, rows = [row]) {
  const count = vi.fn().mockResolvedValue(total);
  const findMany = vi.fn().mockResolvedValue(rows);
  return {
    db: { invitation: { count, findMany } } as AdminInvitationListDb,
    count,
    findMany,
  };
}

describe("admin invitation list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("limits a result page and returns only operational summary fields", async () => {
    const { db, findMany } = mockDb(25);
    const result = await listAdminInvitations(db, { page: 99 });

    expect(result).toEqual({
      items: [{
        id: "inv-1",
        slug: "bima-anisa",
        coupleName: "Bima & Anisa",
        theme: "classic-rose",
        variant: "black",
        weddingDate: "2026-12-01T08:00:00.000Z",
        updatedAt: "2026-10-29T08:00:00.000Z",
      }],
      total: 25,
      page: 3,
      pageSize: 12,
      pageCount: 3,
    });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 12,
      skip: 24,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    }));
    expect(findMany.mock.calls[0][0].select).toEqual({
      id: true,
      slug: true,
      theme: true,
      variant: true,
      weddingDate: true,
      updatedAt: true,
      partners: { select: { role: true, name: true } },
    });
  });

  it("searches slug and partner name without an unbounded query", async () => {
    const { db, count, findMany } = mockDb(1);
    await listAdminInvitations(db, { q: "  Anisa  ", page: 0 });

    const where = {
      OR: [
        { slug: { contains: "Anisa", mode: "insensitive" } },
        { partners: { some: { name: { contains: "Anisa", mode: "insensitive" } } } },
      ],
    };
    expect(count).toHaveBeenCalledWith({ where });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where, skip: 0, take: 12 }));
  });

  it("does not query rows for an empty result", async () => {
    const { db, findMany } = mockDb(0);
    expect(await listAdminInvitations(db, { q: "missing" })).toMatchObject({
      items: [], total: 0, page: 1, pageCount: 0,
    });
    expect(findMany).not.toHaveBeenCalled();
  });

  it("does not advertise pages beyond the reachable page limit", async () => {
    const { db, findMany } = mockDb(12_001);
    const result = await listAdminInvitations(db, { page: 20_000 });

    expect(result.total).toBe(12_001);
    expect(result.pageCount).toBe(1_000);
    expect(result.page).toBe(1_000);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 11_988,
      take: 12,
    }));
  });

  it("rejects an unauthorized page request before loading Prisma", async () => {
    vi.mocked(requireAdminSession).mockRejectedValueOnce(new Error("Unauthorized"));
    await expect(getAdminInvitationList({})).rejects.toThrow("Unauthorized");
  });
});

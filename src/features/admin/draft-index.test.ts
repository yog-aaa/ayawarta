import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAdminSession } from "@/features/auth/service";
import { getAdminDraftIndex, listAdminDraftIndex } from "./draft-index";
import { createEmptyDraftPayload } from "./draft-schema";

vi.mock("@/features/auth/service", () => ({ requireAdminSession: vi.fn() }));

function mockDb(total = 1) {
  const count = vi.fn().mockResolvedValue(total);
  const findMany = vi.fn()
    .mockResolvedValueOnce([{ id: "linked-draft", invitationId: "inv-1", draftVersion: 2, updatedAt: new Date("2026-10-30T00:00:00.000Z") }])
    .mockResolvedValueOnce([{ id: "new-draft", proposedSlug: "new-couple", payload: {
      ...createEmptyDraftPayload(), slug: "new-couple",
      partners: {
        groom: { name: "Damar", parents: "", instagram: "", photoAssetId: null },
        bride: { name: "Raras", parents: "", instagram: "", photoAssetId: null },
      },
    }, draftVersion: 1, updatedAt: new Date("2026-10-30T01:00:00.000Z") }]);
  return { db: { invitationDraft: { count, findMany } } as unknown as Parameters<typeof listAdminDraftIndex>[0], count, findMany };
}

describe("admin draft index", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns linked draft markers and a separate bounded page of new drafts", async () => {
    const { db, findMany } = mockDb();
    const result = await listAdminDraftIndex(db, { publishedInvitationIds: ["inv-1"], q: "Raras", page: 1 });
    expect(result.linked).toEqual([{ invitationId: "inv-1", draftId: "linked-draft", draftVersion: 2, updatedAt: "2026-10-30T00:00:00.000Z" }]);
    expect(result.newDrafts[0]).toMatchObject({ id: "new-draft", coupleName: "Damar & Raras", valid: true });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { invitationId: { in: ["inv-1"] } }, take: 12 }));
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 12, skip: 0 }));
    expect(findMany.mock.calls[1][0].where.OR[2].payload.path).toEqual(["partners", "bride", "name"]);
  });

  it("caps pagination and refuses an unbounded published ID list", async () => {
    const { db, findMany } = mockDb(12_001);
    const result = await listAdminDraftIndex(db, { publishedInvitationIds: ["inv-1"], page: 20_000 });
    expect(result.pageCount).toBe(1_000);
    expect(result.page).toBe(1_000);
    expect(findMany.mock.calls[1][0]).toMatchObject({ skip: 11_988, take: 12 });
    await expect(listAdminDraftIndex(db, { publishedInvitationIds: Array.from({ length: 13 }, (_, i) => `inv-${i}`) })).rejects.toThrow(RangeError);
  });

  it("checks current admin before creating a draft-index database query", async () => {
    vi.mocked(requireAdminSession).mockRejectedValueOnce(new Error("Unauthorized"));
    expect(await getAdminDraftIndex({ publishedInvitationIds: [] })).toMatchObject({ ok: false, code: "unauthorized" });
  });
});

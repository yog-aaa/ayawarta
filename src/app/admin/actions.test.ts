import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAdminSession } from "@/features/auth/service";
import { createAdminDraftForPublished, createAdminNewDraft, saveAdminDraft } from "@/features/admin/draft-service";
import { createInvitationDraftAction, openPublishedInvitationDraftAction, saveInvitationDraftAction } from "./actions";

vi.mock("@/features/auth/service", () => ({ requireAdminSession: vi.fn() }));
vi.mock("@/features/admin/draft-service", () => ({
  createAdminDraftForPublished: vi.fn(),
  createAdminNewDraft: vi.fn(),
  saveAdminDraft: vi.fn(),
}));

describe("admin draft server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminSession).mockResolvedValue({ id: "admin-1", name: "Admin", email: "admin@example.com", role: "ADMIN" });
  });

  it("routes new draft creation to the authenticated service", async () => {
    vi.mocked(createAdminNewDraft).mockResolvedValueOnce({ ok: false, code: "validation", message: "Incomplete" });
    const payload = { schemaVersion: 1 };
    expect(await createInvitationDraftAction(payload)).toMatchObject({ ok: false, code: "validation" });
    expect(createAdminNewDraft).toHaveBeenCalledWith(payload);
  });

  it("checks auth even for malformed open and save requests", async () => {
    vi.mocked(requireAdminSession).mockRejectedValueOnce(new Error("Unauthorized"));
    expect(await openPublishedInvitationDraftAction(null)).toMatchObject({ ok: false, code: "unauthorized" });
    expect(createAdminDraftForPublished).not.toHaveBeenCalled();

    expect(await saveInvitationDraftAction(null)).toMatchObject({ ok: false, code: "validation" });
    expect(requireAdminSession).toHaveBeenCalledTimes(2);
    expect(saveAdminDraft).not.toHaveBeenCalled();
  });

  it("sends validated identifiers and version to the save service", async () => {
    vi.mocked(saveAdminDraft).mockResolvedValueOnce({ ok: false, code: "conflict", message: "Changed" });
    const input = { id: "draft-1", expectedDraftVersion: 2, payload: {} };
    expect(await saveInvitationDraftAction(input)).toMatchObject({ ok: false, code: "conflict" });
    expect(saveAdminDraft).toHaveBeenCalledWith(input);
  });
});

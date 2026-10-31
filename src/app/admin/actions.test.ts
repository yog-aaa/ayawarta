import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAdminSession } from "@/features/auth/service";
import { createAdminDraftForPublished, createAdminNewDraft, saveAdminDraft } from "@/features/admin/draft-service";
import { publishAdminDraft, reviewAdminDraft } from "@/features/admin/publish-service";
import { recoverAdminDraftImage } from "@/features/admin/media-service";
import { createInvitationDraftAction, openPublishedInvitationDraftAction, publishInvitationDraftAction, recoverDraftMediaAction, reviewInvitationDraftAction, saveInvitationDraftAction } from "./actions";

vi.mock("@/features/auth/service", () => ({ requireAdminSession: vi.fn() }));
vi.mock("@/features/admin/draft-service", () => ({
  createAdminDraftForPublished: vi.fn(),
  createAdminNewDraft: vi.fn(),
  saveAdminDraft: vi.fn(),
}));
vi.mock("@/features/admin/publish-service", () => ({ publishAdminDraft: vi.fn(), reviewAdminDraft: vi.fn() }));
vi.mock("@/features/admin/media-service", () => ({ recoverAdminDraftImage: vi.fn() }));

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

  it("routes a published invitation reopen through the authorized service", async () => {
    vi.mocked(createAdminDraftForPublished).mockResolvedValueOnce({ ok: true, data: {
      id: "retained-draft", invitationId: "published-1", draftVersion: 3, basePublishedVersion: 1,
    } as never });
    expect(await openPublishedInvitationDraftAction({ invitationId: "published-1", expectedPublishedVersion: 1 }))
      .toMatchObject({ ok: true, data: { id: "retained-draft", draftVersion: 3 } });
    expect(createAdminDraftForPublished).toHaveBeenCalledWith({ invitationId: "published-1", expectedPublishedVersion: 1 });
  });

  it("sends validated identifiers and version to the save service", async () => {
    vi.mocked(saveAdminDraft).mockResolvedValueOnce({ ok: false, code: "conflict", message: "Changed" });
    const input = { id: "draft-1", expectedDraftVersion: 2, payload: {} };
    expect(await saveInvitationDraftAction(input)).toMatchObject({ ok: false, code: "conflict" });
    expect(saveAdminDraft).toHaveBeenCalledWith(input);
  });

  it("authorizes review and publish before parsing requests", async () => {
    vi.mocked(requireAdminSession).mockRejectedValueOnce(new Error("Unauthorized"));
    expect(await reviewInvitationDraftAction(null)).toMatchObject({ ok: false, code: "unauthorized" });
    expect(reviewAdminDraft).not.toHaveBeenCalled();
    expect(await publishInvitationDraftAction(null)).toMatchObject({ ok: false, code: "validation" });
    expect(publishAdminDraft).not.toHaveBeenCalled();
  });

  it("passes only validated publish confirmation to the service", async () => {
    vi.mocked(reviewAdminDraft).mockResolvedValueOnce({ ok: false, code: "conflict", message: "Changed" });
    expect(await reviewInvitationDraftAction({ id: "draft-1" })).toMatchObject({ ok: false, code: "conflict" });
    expect(reviewAdminDraft).toHaveBeenCalledWith("draft-1");
    vi.mocked(publishAdminDraft).mockResolvedValueOnce({ ok: false, code: "validation", message: "Mismatch" });
    const input = { id: "draft-1", expectedDraftVersion: 2, expectedPublishedVersion: 1, confirmationSlug: "sample" };
    expect(await publishInvitationDraftAction(input)).toMatchObject({ ok: false, code: "validation" });
    expect(publishAdminDraft).toHaveBeenCalledWith(input);
  });

  it("authorizes and validates media recovery before delegation", async () => {
    vi.mocked(requireAdminSession).mockRejectedValueOnce(new Error("Unauthorized"));
    expect(await recoverDraftMediaAction(null)).toMatchObject({ ok: false, code: "unauthorized" });
    expect(recoverAdminDraftImage).not.toHaveBeenCalled();
    const input = { draftId: "draft-1", provisionId: "11111111-1111-4111-8111-111111111111", expectedDraftVersion: 2 };
    vi.mocked(recoverAdminDraftImage).mockResolvedValueOnce({ ok: false, code: "dependency_failure", message: "Pending", recoveryId: input.provisionId });
    expect(await recoverDraftMediaAction(input)).toMatchObject({ ok: false, recoveryId: input.provisionId });
    expect(recoverAdminDraftImage).toHaveBeenCalledWith(input);
  });
});

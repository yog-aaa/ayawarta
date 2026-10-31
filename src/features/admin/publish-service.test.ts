import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAdminSession } from "@/features/auth/service";
import { invitationRepository } from "@/features/invitations/repository";
import { revalidatePath } from "next/cache";
import { createPublishRepository, PublishError } from "./publish-repository";
import { preflightNewDraftMedia } from "./media-service";
import { requireA5Enabled } from "./a5-feature";
import { publishAdminDraft, reviewAdminDraft } from "./publish-service";

vi.mock("@/features/auth/service", () => ({ requireAdminSession: vi.fn() }));
vi.mock("@/features/invitations/repository", () => ({ invitationRepository: { findBySlug: vi.fn() } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("./media-service", () => ({ preflightNewDraftMedia: vi.fn() }));
vi.mock("./a5-feature", () => ({ requireA5Enabled: vi.fn(), A5UnavailableError: class A5UnavailableError extends Error {} }));
vi.mock("./publish-repository", () => ({
  createPublishRepository: vi.fn(),
  PublishError: class PublishError extends Error {
    constructor(public readonly code: string, message: string, public readonly fieldErrors?: Record<string, string[]>) { super(message); }
  },
}));

const repo = { review: vi.fn(), publish: vi.fn() };
const input = { id: "draft-1", expectedDraftVersion: 2, expectedPublishedVersion: 1, confirmationSlug: "sample" };

describe("publish service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminSession).mockResolvedValue({ id: "admin-1", email: "admin@example.com", name: "Admin", role: "ADMIN" });
    vi.mocked(createPublishRepository).mockReturnValue(repo as unknown as ReturnType<typeof createPublishRepository>);
    repo.publish.mockResolvedValue({ slug: "sample", version: 2, publicPath: "/sample" });
    vi.mocked(invitationRepository.findBySlug).mockResolvedValue({ slug: "sample" } as never);
    vi.mocked(preflightNewDraftMedia).mockResolvedValue({ ok: true, data: null });
  });

  it("authorizes both read and mutation before opening repository", async () => {
    vi.mocked(requireAdminSession).mockRejectedValueOnce(new Error("Unauthorized"));
    expect(await reviewAdminDraft("draft-1")).toMatchObject({ ok: false, code: "unauthorized" });
    expect(createPublishRepository).not.toHaveBeenCalled();
    vi.mocked(requireAdminSession).mockRejectedValueOnce(new Error("Forbidden"));
    expect(await publishAdminDraft(input)).toMatchObject({ ok: false, code: "forbidden" });
    expect(repo.publish).not.toHaveBeenCalled();
  });

  it("returns validation details from review and never writes", async () => {
    repo.review.mockRejectedValueOnce(new PublishError("validation", "Incomplete", { heroAssetId: ["Missing"] }));
    expect(await reviewAdminDraft("draft-1")).toMatchObject({ ok: false, code: "validation", fieldErrors: { heroAssetId: ["Missing"] } });
    expect(repo.publish).not.toHaveBeenCalled();
  });

  it("revalidates exact routes only after a successful commit and lookup", async () => {
    expect(await publishAdminDraft(input)).toEqual({ ok: true, data: { slug: "sample", version: 2, publicPath: "/sample" } });
    expect(repo.publish).toHaveBeenCalledWith({ ...input, actorId: "admin-1" });
    expect(revalidatePath).toHaveBeenCalledWith("/sample");
    expect(revalidatePath).toHaveBeenCalledWith("/sample/invite");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/invitations");
  });

  it("reports a committed publication honestly when the public read fails", async () => {
    vi.mocked(invitationRepository.findBySlug).mockResolvedValueOnce(null);
    const result = await publishAdminDraft(input);
    expect(result).toMatchObject({ ok: false, code: "dependency_failure", committedUnverified: true });
    expect(result.ok ? "" : result.message).toContain("sudah tersimpan");
    expect(revalidatePath).toHaveBeenCalledWith("/sample");
    repo.review.mockResolvedValueOnce({ draftId: "draft-1", invitationId: "inv-1", slug: "sample", draftVersion: 3, publishedVersion: 2, changeSummary: "Tidak ada perubahan konten.", publicPath: "/sample" });
    expect(await reviewAdminDraft("draft-1")).toMatchObject({ ok: true, data: { draftVersion: 3, publishedVersion: 2 } });
  });

  it("does not revalidate after a transaction conflict", async () => {
    repo.publish.mockRejectedValueOnce(new PublishError("conflict", "Stale"));
    expect(await publishAdminDraft(input)).toMatchObject({ ok: false, code: "conflict" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("does not mark a pre-commit dependency failure as committed", async () => {
    repo.publish.mockRejectedValueOnce(new PublishError("dependency_failure", "Baseline unavailable"));
    expect(await publishAdminDraft(input)).toEqual({ ok: false, code: "dependency_failure", message: "Baseline unavailable" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("preflights new draft remote media before opening the first-publication transaction", async () => {
    const first = { ...input, expectedPublishedVersion: null };
    vi.mocked(preflightNewDraftMedia).mockResolvedValueOnce({ ok: false, code: "conflict", message: "Remote image missing" });
    expect(await publishAdminDraft(first)).toMatchObject({ ok: false, code: "conflict" });
    expect(repo.publish).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();

    const order: string[] = [];
    vi.mocked(preflightNewDraftMedia).mockImplementationOnce(async () => { order.push("preflight"); return { ok: true, data: null }; });
    repo.publish.mockImplementationOnce(async () => { order.push("transaction"); return { slug: "sample", version: 1, publicPath: "/sample" }; });
    expect(await publishAdminDraft(first)).toMatchObject({ ok: true, data: { version: 1 } });
    expect(requireA5Enabled).toHaveBeenCalled();
    expect(order).toEqual(["preflight", "transaction"]);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAdminSession } from "@/features/auth/service";
import { createDraftRepository, DraftPersistenceError } from "./draft-repository";
import { loadAssociatedMedia } from "./editor-media";
import { createEmptyDraftPayload } from "./draft-schema";
import {
  createAdminDraftForPublished,
  createAdminNewDraft,
  getAdminDraft,
  saveAdminDraft,
} from "./draft-service";

vi.mock("@/features/auth/service", () => ({ requireAdminSession: vi.fn() }));
vi.mock("./draft-repository", () => ({
  createDraftRepository: vi.fn(),
  DraftPersistenceError: class DraftPersistenceError extends Error {
    constructor(public readonly code: string, message: string) { super(message); }
  },
}));
vi.mock("./editor-media", () => ({ loadAssociatedMedia: vi.fn() }));

function mockRow() {
  return {
    id: "draft-1",
    invitationId: "inv-1",
    proposedSlug: "damar-raras",
    payload: { ...createEmptyDraftPayload(), slug: "damar-raras" },
    schemaVersion: 1,
    draftVersion: 1,
    basePublishedVersion: 1,
    createdById: "admin-1",
    updatedById: "admin-1",
    createdAt: new Date("2026-10-30T00:00:00.000Z"),
    updatedAt: new Date("2026-10-30T00:00:00.000Z"),
  };
}

const repo = {
  createNewDraft: vi.fn(),
  createDraftForPublished: vi.fn(),
  findPublishedById: vi.fn(),
  findDraftById: vi.fn(),
  saveDraftIfVersion: vi.fn(),
  findPublications: vi.fn(),
  findAllowedMediaAssetIds: vi.fn(),
};

describe("authenticated draft service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminSession).mockResolvedValue({ id: "admin-1", email: "admin@example.com", name: "Admin", role: "ADMIN" });
    vi.mocked(createDraftRepository).mockReturnValue(repo as unknown as ReturnType<typeof createDraftRepository>);
    repo.findDraftById.mockResolvedValue(mockRow());
    repo.saveDraftIfVersion.mockResolvedValue({ ...mockRow(), draftVersion: 2 });
    repo.createNewDraft.mockResolvedValue({ ...mockRow(), invitationId: null, proposedSlug: "", payload: createEmptyDraftPayload(), basePublishedVersion: null });
    repo.findAllowedMediaAssetIds.mockResolvedValue(new Set(["own-hero"]));
    vi.mocked(loadAssociatedMedia).mockResolvedValue([
      { id: "own-hero", url: "https://res.cloudinary.com/demo/image/upload/hero.jpg", resourceType: "IMAGE", width: 1200, height: 800, label: "Hero", shared: false, deliverable: true },
      { id: "own-groom", url: "https://res.cloudinary.com/demo/image/upload/groom.jpg", resourceType: "IMAGE", width: 600, height: 600, label: "Groom", shared: false, deliverable: true },
      { id: "own-bride", url: "https://res.cloudinary.com/demo/image/upload/bride.jpg", resourceType: "IMAGE", width: 600, height: 600, label: "Bride", shared: false, deliverable: true },
    ]);
    repo.findPublishedById.mockResolvedValue({
      id: "inv-1",
      slug: "real-couple",
      theme: "classic-rose",
      variant: "green",
      weddingDate: new Date("2027-06-12T02:00:00.000Z"),
      publishedVersion: 1,
      heroAssetId: "own-hero",
      musicAssetId: null,
      galleryVideoUrl: null,
      greeting: null,
      prayer: null,
      sections: { couple: true, events: true, gallery: false, loveStory: false, gifts: false, wishes: true },
      partners: [
        { role: "GROOM", name: "Real Groom", parents: "", instagram: null, photoAssetId: "own-groom" },
        { role: "BRIDE", name: "Real Bride", parents: "", instagram: null, photoAssetId: "own-bride" },
      ],
      events: [],
      galleryItems: [],
      loveStories: [],
      giftAccounts: [],
    });
    repo.createDraftForPublished.mockResolvedValue(mockRow());
  });

  it("authorizes a read before creating the repository", async () => {
    vi.mocked(requireAdminSession).mockRejectedValueOnce(new Error("Unauthorized"));
    const result = await getAdminDraft("draft-1");
    expect(result).toMatchObject({ ok: false, code: "unauthorized" });
    expect(createDraftRepository).not.toHaveBeenCalled();
  });

  it("authorizes a mutation before persisting any draft", async () => {
    vi.mocked(requireAdminSession).mockRejectedValueOnce(new Error("Forbidden"));
    const result = await createAdminNewDraft(createEmptyDraftPayload());
    expect(result).toMatchObject({ ok: false, code: "forbidden" });
    expect(createDraftRepository).not.toHaveBeenCalled();
    expect(repo.createNewDraft).not.toHaveBeenCalled();
  });

  it("returns only a typed draft DTO for an authorized read", async () => {
    const result = await getAdminDraft("draft-1");
    expect(result).toMatchObject({ ok: true, data: { id: "draft-1", draftVersion: 1 } });
    if (result.ok) expect(result.data.updatedAt).toBe("2026-10-30T00:00:00.000Z");
  });

  it("allows creating an incomplete new draft without writing a published invitation", async () => {
    const result = await createAdminNewDraft(createEmptyDraftPayload());
    expect(result.ok).toBe(true);
    expect(repo.createNewDraft).toHaveBeenCalledWith(expect.objectContaining({ proposedSlug: "", actorId: "admin-1" }));
  });

  it("rejects unassociated media on a new draft before persistence", async () => {
    const payload = createEmptyDraftPayload();
    payload.heroAssetId = "other-customer";
    const result = await createAdminNewDraft(payload);
    expect(result).toMatchObject({ ok: false, code: "validation" });
    expect(repo.createNewDraft).not.toHaveBeenCalled();
  });

  it("hydrates an existing draft from the published row and ignores forged caller content", async () => {
    repo.findAllowedMediaAssetIds.mockResolvedValueOnce(new Set(["own-hero", "own-groom", "own-bride"]));
    const forged = {
      invitationId: "inv-1",
      payload: { ...createEmptyDraftPayload(), slug: "forged-couple", heroAssetId: "foreign-hero" },
    } as unknown as Parameters<typeof createAdminDraftForPublished>[0];

    const result = await createAdminDraftForPublished(forged);
    expect(result.ok).toBe(true);
    expect(repo.createDraftForPublished).toHaveBeenCalledWith(expect.objectContaining({
      invitationId: "inv-1",
      expectedPublishedVersion: 1,
      payload: expect.objectContaining({
        slug: "real-couple",
        heroAssetId: "own-hero",
        partners: expect.objectContaining({ groom: expect.objectContaining({ name: "Real Groom" }) }),
      }),
    }));
  });

  it("rejects a forged media ID on save before CAS persistence", async () => {
    const payload = createEmptyDraftPayload();
    payload.slug = "damar-raras";
    payload.heroAssetId = "foreign-hero";
    const result = await saveAdminDraft({ id: "draft-1", expectedDraftVersion: 1, payload });
    expect(result).toMatchObject({ ok: false, code: "validation" });
    expect(loadAssociatedMedia).toHaveBeenCalledWith("inv-1");
    expect(repo.saveDraftIfVersion).not.toHaveBeenCalled();
  });

  it("preserves an existing shared hero but blocks selecting it for a new slot", async () => {
    vi.mocked(loadAssociatedMedia).mockResolvedValueOnce([
      { id: "own-hero", url: "https://res.cloudinary.com/demo/image/upload/hero.jpg", resourceType: "IMAGE", width: 1200, height: 800, label: "Hero", shared: true, deliverable: true },
    ]);
    const unchanged = { ...mockRow().payload, heroAssetId: "own-hero" };
    expect((await saveAdminDraft({ id: "draft-1", expectedDraftVersion: 1, payload: unchanged })).ok).toBe(true);

    vi.mocked(loadAssociatedMedia).mockResolvedValueOnce([
      { id: "own-hero", url: "https://res.cloudinary.com/demo/image/upload/hero.jpg", resourceType: "IMAGE", width: 1200, height: 800, label: "Hero", shared: true, deliverable: true },
    ]);
    const moved = { ...mockRow().payload, galleryItems: [{ key: "new-gallery-row", assetId: "own-hero", altText: "Foto", caption: "" }] };
    const result = await saveAdminDraft({ id: "draft-1", expectedDraftVersion: 1, payload: moved });
    expect(result).toMatchObject({ ok: false, code: "validation" });
    if (!result.ok) expect(result.fieldErrors?.["galleryItems.0.assetId"]).toBeDefined();
  });

  it("rejects the wrong media resource type for an image slot", async () => {
    vi.mocked(loadAssociatedMedia).mockResolvedValueOnce([
      { id: "audio-id", url: "https://res.cloudinary.com/demo/video/upload/music.mp3", resourceType: "AUDIO", width: null, height: null, label: "Music", shared: false, deliverable: true },
    ]);
    const payload = { ...mockRow().payload, heroAssetId: "audio-id" };
    const result = await saveAdminDraft({ id: "draft-1", expectedDraftVersion: 1, payload });
    expect(result).toMatchObject({ ok: false, code: "validation" });
    if (!result.ok) expect(result.fieldErrors?.heroAssetId).toBeDefined();
  });

  it("passes the expected version to the repository for an authorized save", async () => {
    const result = await saveAdminDraft({ id: "draft-1", expectedDraftVersion: 1, payload: mockRow().payload });
    expect(result).toMatchObject({ ok: true, data: { draftVersion: 2 } });
    expect(repo.saveDraftIfVersion).toHaveBeenCalledWith(expect.objectContaining({ id: "draft-1", expectedDraftVersion: 1, actorId: "admin-1" }));
  });

  it("returns a sanitized conflict when another editor saved first", async () => {
    repo.saveDraftIfVersion.mockRejectedValueOnce(new DraftPersistenceError("conflict", "internal revision detail"));
    const result = await saveAdminDraft({ id: "draft-1", expectedDraftVersion: 1, payload: mockRow().payload });
    expect(result).toMatchObject({ ok: false, code: "conflict" });
    if (!result.ok) expect(result.message).not.toContain("internal revision detail");
  });

  it("reports an unavailable draft table without exposing database details", async () => {
    repo.createNewDraft.mockRejectedValueOnce(Object.assign(new Error("relation InvitationDraft does not exist"), { code: "P2021" }));
    const result = await createAdminNewDraft(createEmptyDraftPayload());
    expect(result).toMatchObject({ ok: false, code: "dependency_failure" });
    if (!result.ok) expect(result.message).not.toContain("InvitationDraft");
  });
});

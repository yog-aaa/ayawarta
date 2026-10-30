import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { createDraftRepository, DraftPersistenceError } from "./draft-repository";
import { buildPublicationSnapshot, digestPublicationSnapshot, publicationMediaIds } from "./publication-snapshot";
import { publishedFixture } from "./testing/published-fixture";

function fakeDatabase() {
  const live = publishedFixture();
  const snapshot = buildPublicationSnapshot(live);
  const publication = {
    id: "publication-1",
    invitationId: live.id,
    version: 1,
    source: "BASELINE" as const,
    schemaVersion: 1,
    snapshot,
    contentDigest: digestPublicationSnapshot(snapshot),
    media: publicationMediaIds(snapshot).map((mediaAssetId) => ({ mediaAssetId })),
  };
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([{ id: live.id }]),
    invitation: { findUnique: vi.fn().mockResolvedValue(live) },
    invitationPublication: {
      findUnique: vi.fn().mockResolvedValue(publication),
      create: vi.fn().mockResolvedValue(publication),
      findMany: vi.fn().mockResolvedValue([publication]),
    },
    invitationDraft: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "draft-1", invitationId: live.id, draftVersion: 1, basePublishedVersion: 1, proposedSlug: live.slug }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const db = { ...tx, $transaction: vi.fn().mockImplementation((callback) => callback(tx)) } as unknown as PrismaClient;
  return { live, snapshot, publication, tx, db, repository: createDraftRepository(db) };
}

describe("draft repository", () => {
  it("allows a partial new draft with an empty proposed slug", async () => {
    const { repository, tx } = fakeDatabase();
    await repository.createNewDraft({ proposedSlug: "", payload: { slug: "" }, actorId: "admin-1" });
    expect(tx.invitationDraft.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      proposedSlug: "", draftVersion: 1, basePublishedVersion: null,
    }) });
  });

  it("requires current live content to equal its verified publication before opening a draft", async () => {
    const { repository, live, tx } = fakeDatabase();
    live.partners[0].name = "Changed outside publication";
    await expect(repository.createDraftForPublished({
      invitationId: live.id,
      expectedPublishedVersion: 1,
      payload: { slug: live.slug },
      actorId: "admin-1",
    })).rejects.toMatchObject({ code: "conflict" });
    expect(tx.invitationDraft.create).not.toHaveBeenCalled();
  });

  it("creates only one draft for a matching published version and immutable slug", async () => {
    const { repository, live, tx } = fakeDatabase();
    const draft = await repository.createDraftForPublished({
      invitationId: live.id,
      expectedPublishedVersion: 1,
      payload: { slug: live.slug },
      actorId: "admin-1",
    });
    expect(draft.id).toBe("draft-1");
    expect(tx.invitationDraft.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      invitationId: live.id,
      proposedSlug: live.slug,
      basePublishedVersion: 1,
    }) });
    await expect(repository.createDraftForPublished({
      invitationId: live.id,
      expectedPublishedVersion: 1,
      payload: { slug: "changed" },
      actorId: "admin-1",
    })).rejects.toMatchObject({ code: "invalid_state" });
  });

  it("rejects stale saves and published slug changes before writing", async () => {
    const { repository, live, tx } = fakeDatabase();
    tx.invitationDraft.findUnique.mockResolvedValue({
      id: "draft-1", invitationId: live.id, draftVersion: 2,
      basePublishedVersion: 1, proposedSlug: live.slug,
    });
    await expect(repository.saveDraftIfVersion({
      id: "draft-1", expectedDraftVersion: 1, proposedSlug: live.slug,
      payload: { slug: live.slug }, actorId: "admin-1",
    })).rejects.toMatchObject({ code: "conflict" });
    await expect(repository.saveDraftIfVersion({
      id: "draft-1", expectedDraftVersion: 2, proposedSlug: "changed",
      payload: { slug: "changed" }, actorId: "admin-1",
    })).rejects.toMatchObject({ code: "invalid_state" });
    expect(tx.invitationDraft.updateMany).not.toHaveBeenCalled();
  });

  it("scopes available media IDs to the published invitation", async () => {
    const { repository, tx } = fakeDatabase();
    tx.invitation.findUnique.mockResolvedValue({
      heroAssetId: "hero", musicAssetId: null,
      partners: [{ photoAssetId: "groom-photo" }, { photoAssetId: "bride-photo" }],
      galleryItems: [{ assetId: "gallery-photo" }],
    });
    const ids = await repository.findAllowedMediaAssetIds("inv-1");
    expect([...ids].sort()).toEqual(["bride-photo", "gallery-photo", "groom-photo", "hero"]);
    expect(ids.has("other-customer-photo")).toBe(false);
  });

  it("records an exact baseline with media pins and refuses a mismatched retry", async () => {
    const { repository, live, tx, publication } = fakeDatabase();
    tx.invitationPublication.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(publication);
    const first = await repository.recordBaselinePublication(live.id);
    expect(first.contentDigest).toBe(publication.contentDigest);
    expect(tx.invitationPublication.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        version: 1,
        source: "BASELINE",
        media: { create: publication.media },
      }),
      include: expect.anything(),
    });
    live.events[0].displayTime = "Changed without publish";
    await expect(repository.recordBaselinePublication(live.id)).rejects.toMatchObject({ code: "conflict" });
  });

  it("keeps expected persistence failures typed", () => {
    expect(new DraftPersistenceError("baseline_required", "missing").code).toBe("baseline_required");
  });
});

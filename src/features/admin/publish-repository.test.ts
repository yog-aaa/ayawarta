import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { publishedFixture } from "./testing/published-fixture";
import { buildPublicationSnapshot, digestPublicationSnapshot, publicationMediaIds } from "./publication-snapshot";
import { createEmptyDraftPayload } from "./draft-schema";
import { listAssociatedMedia } from "./editor-media";
import { createPublishRepository, summarizeChanges } from "./publish-repository";

vi.mock("./editor-media", () => ({ listAssociatedMedia: vi.fn() }));

function harness(slug = "rika-fauzi") {
  const live = publishedFixture();
  live.slug = slug;
  const snapshot = buildPublicationSnapshot(live);
  const baseline = {
    source: "BASELINE", schemaVersion: 1, snapshot,
    contentDigest: digestPublicationSnapshot(snapshot),
    media: publicationMediaIds(snapshot).map((mediaAssetId) => ({ mediaAssetId })),
  };
  const payload = createEmptyDraftPayload();
  payload.slug = live.slug;
  payload.meta = { theme: "classic-rose", variant: "red" };
  payload.weddingDate = live.weddingDate.toISOString();
  payload.sections = { couple: true, events: true, gallery: true, loveStory: false, gifts: false, wishes: true };
  payload.heroAssetId = "hero";
  payload.partners.groom = { name: "Bima Baru", parents: "Orang tua Bima", instagram: "", photoAssetId: "groom-photo" };
  payload.partners.bride = { name: "Anisa", parents: "Orang tua Anisa", instagram: "", photoAssetId: "bride-photo" };
  payload.events = [{ key: "event-1", name: "Akad", displayDate: "20 November 2026", displayTime: "08.00 WIB", location: "Gedung", address: "Alamat acara", mapUrl: "https://maps.example.com" }];
  payload.galleryItems = [{ key: "gallery-1", assetId: "gallery-photo", altText: "Pasangan di taman", caption: "" }];
  const draft = { id: "draft-1", invitationId: live.id, proposedSlug: live.slug, payload, schemaVersion: 1, draftVersion: 2, basePublishedVersion: 1 };
  const readDraft = vi.fn(async () => draft);
  let published = live;
  let currentPublication = baseline;
  const readLive = vi.fn(async () => published);
  const readPublication = vi.fn(async ({ where }: { where: { invitationId_version: { version: number } } }) =>
    where.invitationId_version.version === 1 ? baseline : currentPublication);
  const createPublication = vi.fn(async ({ data }: { data: { snapshot: typeof snapshot; contentDigest: string; media: { create: Array<{ mediaAssetId: string }> } } }) => {
    currentPublication = { source: "PUBLISH", schemaVersion: 1, snapshot: data.snapshot, contentDigest: data.contentDigest, media: data.media.create };
    return {};
  });
  const retainDraft = vi.fn(async ({ data }: { data: { payload: typeof payload; basePublishedVersion: number; draftVersion: { increment: number } } }) => {
    draft.payload = data.payload;
    draft.basePublishedVersion = data.basePublishedVersion;
    draft.draftVersion += data.draftVersion.increment;
    return { count: 1 };
  });
  const tx = {
    invitationDraft: { findUnique: readDraft, updateMany: retainDraft },
    invitation: {
      findUnique: readLive,
      updateMany: vi.fn(async ({ data }: { data: { publishedVersion: number; weddingDate: Date } }) => {
        published = { ...live, publishedVersion: data.publishedVersion, weddingDate: data.weddingDate };
        return { count: 1 };
      }),
    },
    invitationPublication: { findUnique: readPublication, create: createPublication },
    invitationSections: { update: vi.fn(async () => ({})) },
    partner: { update: vi.fn(async ({ where, data }: { where: { invitationId_role: { role: "GROOM" | "BRIDE" } }; data: { name: string } }) => {
      published = { ...published, partners: published.partners.map((row) => row.role === where.invitationId_role.role ? { ...row, name: data.name } : row) };
      return {};
    }) },
    event: { deleteMany: vi.fn(async () => ({})), createMany: vi.fn(async () => ({})) },
    galleryItem: { deleteMany: vi.fn(async () => ({})), createMany: vi.fn(async () => ({})) },
    loveStory: { deleteMany: vi.fn(async () => ({})), createMany: vi.fn(async () => ({})) },
    giftAccount: { deleteMany: vi.fn(async () => ({})), createMany: vi.fn(async () => ({})) },
    $queryRaw: vi.fn(async () => [{ id: live.id }]),
  };
  const db = {
    ...tx,
    $transaction: vi.fn(async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx)),
  } as unknown as PrismaClient;
  return { live, baseline, draft, tx, db, createPublication, retainDraft, readDraft, readPublication };
}

describe("publish repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listAssociatedMedia).mockResolvedValue([
      "hero", "groom-photo", "bride-photo", "gallery-photo",
    ].map((id) => ({ id, url: `https://res.cloudinary.com/demo/image/upload/${id}`, resourceType: "IMAGE" as const,
      width: 600, height: 600, label: id, shared: false, deliverable: true })));
  });

  it("reviews saved content without a transaction or live write", async () => {
    const h = harness();
    expect(await createPublishRepository(h.db).review("draft-1")).toMatchObject({
      draftId: "draft-1", invitationId: "inv-1", slug: "rika-fauzi", draftVersion: 2, publishedVersion: 1,
      publicPath: "/rika-fauzi", changeSummary: "Perubahan: mempelai.",
    });
    expect(h.db.$transaction).not.toHaveBeenCalled();
    expect(h.tx.invitation.updateMany).not.toHaveBeenCalled();
  });

  it("blocks new invitations and missing verified baseline", async () => {
    const h = harness();
    h.draft.invitationId = null as unknown as string;
    await expect(createPublishRepository(h.db).publish({ id: "draft-1", expectedDraftVersion: 2, expectedPublishedVersion: 1, confirmationSlug: "rika-fauzi", actorId: "admin-1" })).rejects.toMatchObject({ code: "dependency_failure" });
    expect(h.tx.invitation.updateMany).not.toHaveBeenCalled();
    const other = harness();
    other.readPublication.mockResolvedValue(null as never);
    await expect(createPublishRepository(other.db).review("draft-1")).rejects.toMatchObject({ code: "dependency_failure" });
  });

  it("rejects a fabricated BASELINE source for a new nonlegacy invitation", async () => {
    const h = harness("new-nonlegacy");
    await expect(createPublishRepository(h.db).review("draft-1")).rejects.toMatchObject({ code: "dependency_failure" });
    expect(h.tx.invitation.updateMany).not.toHaveBeenCalled();
  });

  it("blocks stale tokens and mismatched confirmation before any live write", async () => {
    const h = harness();
    const repo = createPublishRepository(h.db);
    await expect(repo.publish({ id: "draft-1", expectedDraftVersion: 1, expectedPublishedVersion: 1, confirmationSlug: "rika-fauzi", actorId: "admin-1" })).rejects.toMatchObject({ code: "conflict" });
    await expect(repo.publish({ id: "draft-1", expectedDraftVersion: 2, expectedPublishedVersion: 1, confirmationSlug: "other", actorId: "admin-1" })).rejects.toMatchObject({ code: "validation", fieldErrors: { confirmationSlug: expect.any(Array) } });
    expect(h.tx.invitation.updateMany).not.toHaveBeenCalled();
  });

  it("rejects a forged or shared media reference", async () => {
    const h = harness();
    h.draft.payload.heroAssetId = "foreign";
    await expect(createPublishRepository(h.db).review("draft-1")).rejects.toMatchObject({ code: "validation", fieldErrors: { heroAssetId: expect.any(Array) } });
    h.draft.payload.heroAssetId = "hero";
    h.draft.payload.galleryItems[0].assetId = "hero";
    vi.mocked(listAssociatedMedia).mockResolvedValueOnce([
      { id: "hero", url: "https://res.cloudinary.com/demo/image/upload/hero", resourceType: "IMAGE", width: 1, height: 1, label: "hero", shared: true, deliverable: true },
      ...["groom-photo", "bride-photo", "gallery-photo"].map((id) => ({ id, url: `https://res.cloudinary.com/demo/image/upload/${id}`, resourceType: "IMAGE" as const, width: 1, height: 1, label: id, shared: false, deliverable: true })),
    ]);
    await expect(createPublishRepository(h.db).review("draft-1")).rejects.toMatchObject({ code: "validation", fieldErrors: { "galleryItems.0.assetId": expect.any(Array) } });
    expect(h.tx.invitation.updateMany).not.toHaveBeenCalled();
  });

  it("rejects a hidden gallery row without an owned asset before review or publish", async () => {
    const h = harness();
    h.draft.payload.sections.gallery = false;
    h.draft.payload.galleryItems[0].assetId = null;
    const repo = createPublishRepository(h.db);
    await expect(repo.review("draft-1")).rejects.toMatchObject({ code: "validation", fieldErrors: { "galleryItems.0.assetId": expect.any(Array) } });
    await expect(repo.publish({ id: "draft-1", expectedDraftVersion: 2, expectedPublishedVersion: 1, confirmationSlug: "rika-fauzi", actorId: "admin-1" })).rejects.toMatchObject({ code: "validation" });
    expect(h.tx.invitation.updateMany).not.toHaveBeenCalled();
  });

  it("writes the aggregate, full snapshot and pins, then rebases the retained draft in one serializable transaction", async () => {
    const h = harness();
    const result = await createPublishRepository(h.db).publish({ id: "draft-1", expectedDraftVersion: 2, expectedPublishedVersion: 1, confirmationSlug: "rika-fauzi", actorId: "admin-1" });
    expect(result).toEqual({ slug: "rika-fauzi", version: 2, publicPath: "/rika-fauzi" });
    expect(h.db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
    expect(h.tx.$queryRaw).toHaveBeenCalled();
    expect(h.tx.invitation.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "inv-1", slug: "rika-fauzi", publishedVersion: 1 } }));
    expect(h.tx.event.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ position: 1 })] });
    expect(h.createPublication).toHaveBeenCalledWith({ data: expect.objectContaining({
      invitationId: "inv-1", version: 2, source: "PUBLISH", actorId: "admin-1", contentDigest: expect.any(String),
      media: { create: [{ mediaAssetId: "bride-photo" }, { mediaAssetId: "gallery-photo" }, { mediaAssetId: "groom-photo" }, { mediaAssetId: "hero" }] },
    }) });
    expect(h.retainDraft).toHaveBeenCalledWith({
      where: { id: "draft-1", draftVersion: 2, invitationId: "inv-1", basePublishedVersion: 1 },
      data: expect.objectContaining({ basePublishedVersion: 2, draftVersion: { increment: 1 }, updatedById: "admin-1" }),
    });
    expect(h.createPublication.mock.invocationCallOrder[0]).toBeLessThan(h.retainDraft.mock.invocationCallOrder[0]);
  });

  it("leaves the draft untouched if snapshot persistence fails inside the transaction", async () => {
    const h = harness();
    h.createPublication.mockRejectedValueOnce(new Error("injected publication failure"));
    await expect(createPublishRepository(h.db).publish({ id: "draft-1", expectedDraftVersion: 2, expectedPublishedVersion: 1, confirmationSlug: "rika-fauzi", actorId: "admin-1" })).rejects.toThrow("injected publication failure");
    expect(h.retainDraft).not.toHaveBeenCalled();
  });

  it("stops before replacing children when the conditional live version update loses a race", async () => {
    const h = harness();
    h.tx.invitation.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(createPublishRepository(h.db).publish({ id: "draft-1", expectedDraftVersion: 2, expectedPublishedVersion: 1, confirmationSlug: "rika-fauzi", actorId: "admin-1" })).rejects.toMatchObject({ code: "conflict" });
    expect(h.tx.event.deleteMany).not.toHaveBeenCalled();
    expect(h.createPublication).not.toHaveBeenCalled();
    expect(h.retainDraft).not.toHaveBeenCalled();
  });

  it("stops before snapshot and draft removal when child replacement fails", async () => {
    const h = harness();
    h.tx.galleryItem.createMany.mockRejectedValueOnce(new Error("injected child failure"));
    await expect(createPublishRepository(h.db).publish({ id: "draft-1", expectedDraftVersion: 2, expectedPublishedVersion: 1, confirmationSlug: "rika-fauzi", actorId: "admin-1" })).rejects.toThrow("injected child failure");
    expect(h.createPublication).not.toHaveBeenCalled();
    expect(h.retainDraft).not.toHaveBeenCalled();
  });

  it("aborts when the final draft rebase loses a race", async () => {
    const h = harness();
    h.retainDraft.mockResolvedValueOnce({ count: 0 });
    await expect(createPublishRepository(h.db).publish({ id: "draft-1", expectedDraftVersion: 2, expectedPublishedVersion: 1, confirmationSlug: "rika-fauzi", actorId: "admin-1" })).rejects.toMatchObject({ code: "conflict" });
    expect(h.createPublication).toHaveBeenCalledOnce();
  });

  it("rejects an immediate repeat publish of the retained unchanged draft", async () => {
    const h = harness();
    const repo = createPublishRepository(h.db);
    const input = { id: "draft-1", expectedDraftVersion: 2, expectedPublishedVersion: 1, confirmationSlug: "rika-fauzi", actorId: "admin-1" };
    await expect(repo.publish(input)).resolves.toMatchObject({ version: 2 });
    h.draft.basePublishedVersion = 2;
    h.draft.draftVersion = 3;
    await expect(repo.review("draft-1")).resolves.toMatchObject({ publishedVersion: 2, changeSummary: "Tidak ada perubahan konten." });
    await expect(repo.publish({ ...input, expectedDraftVersion: 3, expectedPublishedVersion: 2 })).rejects.toMatchObject({ code: "validation" });
    expect(h.createPublication).toHaveBeenCalledOnce();
  });

  it("does not publish Classic-only hidden greeting, prayer, alt or caption changes as a visible update", async () => {
    const h = harness();
    h.draft.payload.weddingDate = h.live.weddingDate.toISOString();
    h.draft.payload.partners.groom.name = "Bima";
    h.draft.payload.greeting = "Salam baru";
    h.draft.payload.prayer = "Doa baru";
    h.draft.payload.galleryItems[0].caption = "Keterangan baru";
    h.draft.payload.galleryItems[0].altText = "Deskripsi baru";
    const repo = createPublishRepository(h.db);
    await expect(repo.review("draft-1")).resolves.toMatchObject({ changeSummary: "Tidak ada perubahan konten." });
    await expect(repo.publish({ id: "draft-1", expectedDraftVersion: 2, expectedPublishedVersion: 1, confirmationSlug: "rika-fauzi", actorId: "admin-1" })).rejects.toMatchObject({ code: "validation" });
    expect(h.tx.invitation.updateMany).not.toHaveBeenCalled();
  });

  it("does not treat weddingDate alone as a guest-visible Classic change", async () => {
    const h = harness();
    h.draft.payload.partners.groom.name = "Bima";
    h.draft.payload.weddingDate = "2026-11-21T08:00:00.000Z";
    await expect(createPublishRepository(h.db).publish({ id: "draft-1", expectedDraftVersion: 2, expectedPublishedVersion: 1, confirmationSlug: "rika-fauzi", actorId: "admin-1" })).rejects.toMatchObject({ code: "validation" });
    expect(h.tx.invitation.updateMany).not.toHaveBeenCalled();
  });

  it("ignores content in sections hidden both before and after the edit", () => {
    const h = harness();
    h.live.sections!.events = false;
    h.live.sections!.gallery = false;
    h.draft.payload.sections.events = false;
    h.draft.payload.sections.gallery = false;
    h.draft.payload.partners.groom.name = "Bima";
    h.draft.payload.events[0].name = "Acara tersembunyi";
    h.draft.payload.galleryItems[0].assetId = "hero";
    h.draft.payload.galleryVideoUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    expect(summarizeChanges(h.live, h.draft.payload)).toBe("Tidak ada perubahan konten.");
  });
});

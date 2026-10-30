import { beforeEach, describe, expect, it, vi } from "vitest";

import { createEmptyDraftPayload } from "./draft-schema";
import { getAdminDraft } from "./draft-service";
import { loadAssociatedMedia } from "./editor-media";
import { loadAdminEditor, loadAdminPreview } from "./editor-loader";

vi.mock("./draft-service", () => ({ getAdminDraft: vi.fn() }));
vi.mock("./editor-media", () => ({ loadAssociatedMedia: vi.fn() }));

function draft(complete = false) {
  const payload = createEmptyDraftPayload();
  payload.slug = "damar-raras";
  if (complete) {
    payload.weddingDate = "2027-06-12T02:00:00.000Z";
    payload.heroAssetId = "hero";
    payload.partners.groom = { name: "Damar", parents: "", instagram: "", photoAssetId: "groom" };
    payload.partners.bride = { name: "Raras", parents: "", instagram: "", photoAssetId: "bride" };
    payload.events = [{
      key: "event-1", name: "Upacara Pernikahan", displayDate: "12 Juni 2027", displayTime: "09.00 WIB",
      location: "", address: "Bandung", mapUrl: "",
    }];
  }
  return {
    id: "draft-1", invitationId: "inv-1", proposedSlug: "damar-raras", payload,
    draftVersion: 1, basePublishedVersion: 1,
    createdAt: "2026-10-30T00:00:00.000Z", updatedAt: "2026-10-30T00:00:00.000Z",
  };
}

const media = [
  { id: "hero", url: "https://res.cloudinary.com/demo/image/upload/hero.jpg", resourceType: "IMAGE" as const, width: 1200, height: 800, label: "Hero", shared: false, deliverable: true },
  { id: "groom", url: "https://res.cloudinary.com/demo/image/upload/groom.jpg", resourceType: "IMAGE" as const, width: 600, height: 600, label: "Groom", shared: false, deliverable: true },
  { id: "bride", url: "https://res.cloudinary.com/demo/image/upload/bride.jpg", resourceType: "IMAGE" as const, width: 600, height: 600, label: "Bride", shared: true, deliverable: true },
];

describe("private admin editor loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadAssociatedMedia).mockResolvedValue(media);
  });

  it("does not query media after an authorization failure", async () => {
    vi.mocked(getAdminDraft).mockResolvedValueOnce({ ok: false, code: "unauthorized", message: "Login required" });
    expect(await loadAdminEditor("draft-1")).toMatchObject({ ok: false, code: "unauthorized" });
    expect(loadAssociatedMedia).not.toHaveBeenCalled();
  });

  it("returns only own media choices and marks shared media unavailable for new selection", async () => {
    vi.mocked(getAdminDraft).mockResolvedValueOnce({ ok: true, data: draft() });
    const result = await loadAdminEditor("draft-1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.mediaChoices.map((item) => item.id)).toEqual(["hero", "groom", "bride"]);
      expect(result.data.mediaChoices[2].selectable).toBe(false);
    }
  });

  it("maps saved complete content to a read-only draft preview", async () => {
    vi.mocked(getAdminDraft).mockResolvedValueOnce({ ok: true, data: draft(true) });
    const result = await loadAdminPreview("draft-1");
    expect(result.ok).toBe(true);
    if (result.ok && result.data.kind === "ready") {
      expect(result.data.guestInteractions).toBe("read-only");
      expect(result.data.slug).toBe("damar-raras");
      expect(result.data.data.couple.heroImage).toBe(media[0].url);
      expect(result.data.data.couple.bride.photo).toBe(media[2].url);
      expect(result.data.data.events[0].name).toBe("Upacara Pernikahan");
      expect(result.data.missingMediaFields).toEqual([]);
    } else {
      throw new Error("Expected ready preview");
    }
  });

  it("previews a new draft with empty marked photo slots before media provisioning", async () => {
    const newDraft = { ...draft(true), invitationId: null, basePublishedVersion: null };
    newDraft.payload.heroAssetId = null;
    newDraft.payload.partners.groom.photoAssetId = null;
    newDraft.payload.partners.bride.photoAssetId = null;
    vi.mocked(getAdminDraft).mockResolvedValueOnce({ ok: true, data: newDraft });
    const result = await loadAdminPreview("draft-1");
    expect(loadAssociatedMedia).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, data: { kind: "ready", guestInteractions: "read-only", missingMediaFields: [
      "heroAssetId", "partners.groom.photoAssetId", "partners.bride.photoAssetId",
    ] } });
    if (result.ok && result.data.kind === "ready") expect(result.data.data.couple.heroImage).toBe("");
  });

  it("returns field errors for incomplete saved content without rendering a broken invitation", async () => {
    vi.mocked(getAdminDraft).mockResolvedValueOnce({ ok: true, data: draft() });
    const result = await loadAdminPreview("draft-1");
    expect(result).toMatchObject({ ok: true, data: { kind: "incomplete", draftId: "draft-1" } });
    if (result.ok && result.data.kind === "incomplete") expect(result.data.fieldErrors.weddingDate).toBeDefined();
  });
});

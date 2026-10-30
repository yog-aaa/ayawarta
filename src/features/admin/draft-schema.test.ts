import { describe, expect, it } from "vitest";

import {
  createEmptyDraftPayload,
  parseDraftForSave,
  validateDraftForPublish,
  validateDraftForPreview,
} from "./draft-schema";

function completeDraft() {
  const payload = createEmptyDraftPayload();
  payload.slug = "damar-raras";
  payload.weddingDate = "2027-06-12T02:00:00.000Z";
  payload.heroAssetId = "asset-hero";
  payload.partners.groom.name = "Damar";
  payload.partners.groom.photoAssetId = "asset-groom";
  payload.partners.bride.name = "Raras";
  payload.partners.bride.photoAssetId = "asset-bride";
  payload.events = [{
    key: "event-1",
    name: "Resepsi",
    displayDate: "12 Juni 2027",
    displayTime: "09.00 WIB",
    location: "Gedung",
    address: "Bandung",
    mapUrl: "https://maps.example.com",
  }];
  return payload;
}

describe("draft payload v1", () => {
  it("allows an incomplete private draft but requires its fixed structure", () => {
    const saved = parseDraftForSave(createEmptyDraftPayload());
    expect(saved.ok).toBe(true);
    expect(validateDraftForPublish(createEmptyDraftPayload()).ok).toBe(false);
    expect(parseDraftForSave({ schemaVersion: 1, slug: "" }).ok).toBe(false);
  });

  it("accepts only an atomic supported theme and variant pair", () => {
    const payload = createEmptyDraftPayload();
    payload.meta = { theme: "siger-priangan", variant: "ivory" };
    expect(parseDraftForSave(payload).ok).toBe(true);
    expect(parseDraftForSave({ ...payload, meta: { theme: "siger-priangan", variant: "red" } }).ok).toBe(false);
    expect(parseDraftForSave({ ...payload, meta: { theme: "classic-rose", variant: "ivory" } }).ok).toBe(false);
  });

  it("rejects duplicate row keys even on partial save", () => {
    const payload = createEmptyDraftPayload();
    payload.events = [
      { key: "same", name: "", displayDate: "", displayTime: "", location: "", address: "", mapUrl: "" },
      { key: "same", name: "", displayDate: "", displayTime: "", location: "", address: "", mapUrl: "" },
    ];
    const result = parseDraftForSave(payload);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors["events.1.key"]).toBeDefined();
  });

  it("validates complete Classic Rose content and same-invitation media", () => {
    const payload = completeDraft();
    const allowedMediaAssetIds = new Set(["asset-hero", "asset-groom", "asset-bride"]);
    expect(validateDraftForPublish(payload, { existingPublishedSlug: "damar-raras", allowedMediaAssetIds }).ok).toBe(true);

    const forged = { ...payload, heroAssetId: "other-customer" };
    const result = validateDraftForPublish(forged, { allowedMediaAssetIds });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.heroAssetId).toBeDefined();
  });

  it("rejects a changed published slug and blocks Siger until enabled", () => {
    const payload = completeDraft();
    payload.meta = { theme: "siger-priangan", variant: "ivory" };
    const result = validateDraftForPublish(payload, {
      existingPublishedSlug: "original-slug",
      allowedMediaAssetIds: new Set(["asset-hero", "asset-groom", "asset-bride"]),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.slug).toBeDefined();
      expect(result.fieldErrors["meta.theme"]).toBeDefined();
    }
  });

  it("requires gallery alt text and scoped media when the gallery is visible", () => {
    const payload = completeDraft();
    payload.sections.gallery = true;
    payload.galleryItems = [{ key: "gallery-1", assetId: "foreign-photo", altText: "", caption: "" }];
    const result = validateDraftForPublish(payload, {
      allowedMediaAssetIds: new Set(["asset-hero", "asset-groom", "asset-bride"]),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors["galleryItems.0.assetId"]).toBeDefined();
      expect(result.fieldErrors["galleryItems.0.altText"]).toBeDefined();
    }
  });

  it("allows missing required portraits in preview while still rejecting foreign media", () => {
    const payload = completeDraft();
    payload.heroAssetId = null;
    payload.partners.groom.photoAssetId = null;
    payload.partners.bride.photoAssetId = null;
    const preview = validateDraftForPreview(payload, { allowedMediaAssetIds: new Set() });
    expect(preview).toMatchObject({ ok: true, missingMediaFields: [
      "heroAssetId", "partners.groom.photoAssetId", "partners.bride.photoAssetId",
    ] });

    payload.heroAssetId = "foreign-asset";
    const forged = validateDraftForPreview(payload, { allowedMediaAssetIds: new Set() });
    expect(forged.ok).toBe(false);
    if (!forged.ok) expect(forged.fieldErrors.heroAssetId).toBeDefined();
  });
});

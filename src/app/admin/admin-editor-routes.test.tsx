import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createEmptyDraftPayload } from "@/features/admin/draft-schema";
import type { AdminDraftDto } from "@/features/admin/draft-service";
import type { InvitationData } from "@/features/invitations/types";

const mocks = vi.hoisted(() => ({
  requireAdminSession: vi.fn(),
  loadEditor: vi.fn(),
  loadPreview: vi.fn(),
  redirect: vi.fn((href: string) => { throw new Error(`REDIRECT:${href}`); }),
  notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }),
}));
vi.mock("@/features/auth/service", () => ({ requireAdminSession: mocks.requireAdminSession }));
vi.mock("@/features/admin/editor-loader", () => ({ loadAdminEditor: mocks.loadEditor, loadAdminPreview: mocks.loadPreview }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: mocks.notFound }));
vi.mock("@/components/admin/AdminDraftEditor", () => ({
  AdminDraftEditor: ({ initialPayload, initialDraft, mediaChoices, mediaUploadEnabled, pendingMedia }: {
    initialPayload: { slug: string };
    initialDraft?: { id: string };
    mediaChoices: Array<{ id: string }>;
    mediaUploadEnabled?: boolean;
    pendingMedia?: Array<{ provisionId: string }>;
  }) => <div data-draft-id={initialDraft?.id ?? "new"} data-slug={initialPayload.slug} data-media-count={mediaChoices.length} data-upload-enabled={String(Boolean(mediaUploadEnabled))} data-pending-count={pendingMedia?.length ?? 0} />,
}));
vi.mock("@/app/(templates)/wedding/classic-rose/[variant]/components/ClassicRoseClientView", () => ({
  default: ({ invitationSlug, isDraftPreview }: { invitationSlug: string; isDraftPreview?: boolean }) => (
    <div data-renderer="classic" data-slug={invitationSlug} data-private={String(isDraftPreview)} />
  ),
}));
vi.mock("@/app/(templates)/wedding/siger-priangan/[variant]/components/SigerPrianganView", () => ({
  default: ({ invitationSlug, isPreview }: { invitationSlug: string; isPreview?: boolean }) => (
    <div data-renderer="siger" data-slug={invitationSlug} data-private={String(isPreview)} />
  ),
}));

import NewAdminInvitationPage from "./(workspace)/invitations/new/page";
import EditAdminInvitationPage from "./(workspace)/invitations/[id]/edit/page";
import AdminDraftPreviewPage, { dynamic, revalidate } from "./(preview)/invitations/[id]/preview/page";

const payload = createEmptyDraftPayload();
payload.slug = "default-preview";
const draft: AdminDraftDto = {
  id: "draft-1", invitationId: "inv-1", proposedSlug: payload.slug, payload,
  draftVersion: 2, basePublishedVersion: 1,
  createdAt: "2026-10-30T01:00:00.000Z", updatedAt: "2026-10-30T01:00:00.000Z",
};
const previewData: InvitationData = {
  sections: payload.sections,
  couple: {
    groom: { name: "Dudi", parents: "", instagram: "", photo: "" },
    bride: { name: "Aini", parents: "", instagram: "", photo: "" },
    heroImage: "",
  },
  weddingDate: new Date("2026-11-10T00:00:00.000Z"),
  events: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdminSession.mockResolvedValue({ id: "admin-1" });
  mocks.loadEditor.mockResolvedValue({ ok: true, data: { draft, mediaChoices: [{ id: "own-1" }], mediaUploadEnabled: false, pendingMedia: [] } });
  mocks.loadPreview.mockResolvedValue({ ok: true, data: {
    kind: "ready", draftId: "draft-1", slug: "default-preview",
    meta: { theme: "classic-rose", variant: "red" }, data: previewData,
    guestInteractions: "read-only", missingMediaFields: [],
  } });
});

describe("admin editor routes", () => {
  it("renders an unsaved new editor without creating a draft on page load", async () => {
    const html = renderToStaticMarkup(await NewAdminInvitationPage());
    expect(html).toContain('data-draft-id="new"');
    expect(mocks.loadEditor).not.toHaveBeenCalled();
    expect(mocks.loadPreview).not.toHaveBeenCalled();
  });

  it("loads an exact draft and its scoped media for editing", async () => {
    const html = renderToStaticMarkup(await EditAdminInvitationPage({ params: Promise.resolve({ id: "draft-1" }) }));
    expect(mocks.loadEditor).toHaveBeenCalledWith("draft-1");
    expect(html).toContain('data-draft-id="draft-1"');
    expect(html).toContain('data-media-count="1"');
    expect(html).toContain('data-upload-enabled="false"');
  });

  it("passes A5 upload gate and recoverable pending media to a new draft editor", async () => {
    mocks.loadEditor.mockResolvedValue({ ok: true, data: {
      draft: { ...draft, invitationId: null, basePublishedVersion: null }, mediaChoices: [], mediaUploadEnabled: true,
      pendingMedia: [{ provisionId: "pending-1", slot: "hero", idempotencyKey: "same-key", createdAt: "2026-10-31T01:00:00.000Z" }],
    } });
    const html = renderToStaticMarkup(await EditAdminInvitationPage({ params: Promise.resolve({ id: "draft-1" }) }));
    expect(html).toContain('data-upload-enabled="true"');
    expect(html).toContain('data-pending-count="1"');
  });

  it("renders an uncached, read-only preview of the exact saved draft", async () => {
    const html = renderToStaticMarkup(await AdminDraftPreviewPage({ params: Promise.resolve({ id: "draft-1" }) }));
    expect(dynamic).toBe("force-dynamic");
    expect(revalidate).toBe(0);
    expect(mocks.loadPreview).toHaveBeenCalledWith("draft-1");
    expect(html).toContain('data-renderer="classic"');
    expect(html).toContain('data-slug="default-preview"');
    expect(html).toContain('data-private="true"');
    expect(html).toContain("Pratinjau privat");
  });

  it("shows incomplete draft errors instead of mounting a theme", async () => {
    mocks.loadPreview.mockResolvedValue({ ok: true, data: {
      kind: "incomplete", draftId: "draft-1", slug: "default-preview", payload,
      fieldErrors: { heroAssetId: ["Pilih media yang terverifikasi."] },
    } });
    const html = renderToStaticMarkup(await AdminDraftPreviewPage({ params: Promise.resolve({ id: "draft-1" }) }));
    expect(html).toContain("Pratinjau belum lengkap");
    expect(html).toContain("heroAssetId");
    expect(html).not.toContain("data-renderer");
  });

  it("shows missing-media notice for a Siger draft preview", async () => {
    mocks.loadPreview.mockResolvedValue({ ok: true, data: {
      kind: "ready", draftId: "draft-1", slug: "baru", meta: { theme: "siger-priangan", variant: "ivory" },
      data: previewData, guestInteractions: "read-only", missingMediaFields: ["heroAssetId"],
    } });
    const html = renderToStaticMarkup(await AdminDraftPreviewPage({ params: Promise.resolve({ id: "draft-1" }) }));
    expect(html).toContain('data-renderer="siger"');
    expect(html).toContain('data-private="true"');
    expect(html).toContain("Foto atau musik belum tersedia");
  });

  it("redirects rejected sessions and hides missing draft IDs", async () => {
    mocks.requireAdminSession.mockRejectedValue(new Error("Forbidden"));
    await expect(NewAdminInvitationPage()).rejects.toThrow("REDIRECT:/admin/login");
    mocks.loadEditor.mockResolvedValue({ ok: false, code: "not_found", message: "Draf tidak ditemukan." });
    await expect(EditAdminInvitationPage({ params: Promise.resolve({ id: "forged" }) })).rejects.toThrow("NOT_FOUND");
    mocks.loadPreview.mockResolvedValue({ ok: false, code: "not_found", message: "Draf tidak ditemukan." });
    await expect(AdminDraftPreviewPage({ params: Promise.resolve({ id: "forged" }) })).rejects.toThrow("NOT_FOUND");
  });
});

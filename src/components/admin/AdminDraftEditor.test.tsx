// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createEmptyDraftPayload } from "@/features/admin/draft-schema";
import type { AdminDraftDto, AdminDraftResult } from "@/features/admin/draft-service";

// @ts-expect-error React 19 act test flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  save: vi.fn(),
  review: vi.fn(),
  publish: vi.fn(),
  recover: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));
vi.mock("@/app/admin/actions", () => ({
  createInvitationDraftAction: mocks.create,
  saveInvitationDraftAction: mocks.save,
  reviewInvitationDraftAction: mocks.review,
  publishInvitationDraftAction: mocks.publish,
  recoverDraftMediaAction: mocks.recover,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, replace: mocks.replace }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }>) => <a href={href} {...props}>{children}</a>,
}));
vi.mock("next/image", () => ({
  default: ({ alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt ?? ""} {...props} />
  ),
}));

import { AdminDraftEditor } from "./AdminDraftEditor";

function changeValue(element: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("admin draft editor", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, "", "/admin/invitations/new");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    window.history.replaceState(null, "", "/");
  });

  it("keeps a new draft private until save and then links its exact saved preview", async () => {
    const initial = createEmptyDraftPayload();
    await act(async () => root.render(<AdminDraftEditor initialPayload={initial} mediaChoices={[]} />));
    expect(mocks.create).not.toHaveBeenCalled();
    expect(container.querySelector('a[href*="/preview"]')).toBeNull();

    await act(async () => changeValue(container.querySelector<HTMLInputElement>("#draft-slug")!, "rani-bima"));
    expect(container.textContent).toContain("Perubahan belum disimpan");

    let resolveSave!: (result: AdminDraftResult<AdminDraftDto>) => void;
    mocks.create.mockReturnValue(new Promise((resolve) => { resolveSave = resolve; }));
    const form = container.querySelector("form")!;
    await act(async () => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ slug: "rani-bima" }));
    expect(container.textContent).toContain("Menyimpan draf");
    expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);

    const draft: AdminDraftDto = {
      id: "draft-123", invitationId: null, proposedSlug: "rani-bima",
      payload: { ...initial, slug: "rani-bima" }, draftVersion: 1,
      basePublishedVersion: null, createdAt: "2026-10-30T01:00:00.000Z", updatedAt: "2026-10-30T01:00:00.000Z",
    };
    await act(async () => resolveSave({ ok: true, data: draft }));
    expect(mocks.replace).toHaveBeenCalledWith("/admin/invitations/draft-123/edit");
    expect(container.textContent).toContain("Semua perubahan tersimpan");
    expect(container.querySelector('a[href="/admin/invitations/draft-123/preview"]')).not.toBeNull();
    expect(container.textContent).not.toContain("Tinjau penerbitan");
  });

  it("offers publication only for a saved existing invitation and suspends review after edits", async () => {
    const payload = createEmptyDraftPayload();
    payload.slug = "dudi-aini";
    const draft: AdminDraftDto = {
      id: "draft-existing", invitationId: "inv-existing", proposedSlug: "dudi-aini",
      payload, draftVersion: 5, basePublishedVersion: 3,
      createdAt: "2026-10-30T01:00:00.000Z", updatedAt: "2026-10-30T01:00:00.000Z",
    };
    await act(async () => root.render(<AdminDraftEditor initialPayload={payload} initialDraft={draft} mediaChoices={[]} />));
    const reviewButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Tinjau penerbitan"))!;
    expect(reviewButton.disabled).toBe(false);
    expect(mocks.review).not.toHaveBeenCalled();
    expect(mocks.publish).not.toHaveBeenCalled();

    await act(async () => changeValue(container.querySelector<HTMLInputElement>("#draft-weddingDate")!, "2026-11-01T12:00"));
    expect(container.textContent).toContain("Perubahan belum disimpan");
    expect(Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Tinjau penerbitan"))?.disabled).toBe(true);
    expect(mocks.review).not.toHaveBeenCalled();
  });

  it("locks editor changes during upload, then selects verified media for an explicit save", async () => {
    const payload = createEmptyDraftPayload();
    payload.slug = "rani-bima";
    const draft: AdminDraftDto = {
      id: "new-draft", invitationId: null, proposedSlug: "rani-bima", payload,
      draftVersion: 2, basePublishedVersion: null,
      createdAt: "2026-10-31T01:00:00.000Z", updatedAt: "2026-10-31T01:00:00.000Z",
    };
    let finishFetch!: (value: unknown) => void;
    const fetch = vi.fn().mockReturnValue(new Promise((resolve) => { finishFetch = resolve; }));
    vi.stubGlobal("fetch", fetch);
    await act(async () => root.render(<AdminDraftEditor initialPayload={payload} initialDraft={draft} mediaChoices={[]} mediaUploadEnabled />));
    const input = container.querySelector<HTMLInputElement>("#upload-hero")!;
    const file = new File(["image bytes"], "hero.jpg", { type: "image/jpeg" });
    Object.defineProperty(input, "files", { configurable: true, value: [file] });
    await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
    const upload = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Unggah foto"))!;
    await act(async () => upload.click());
    expect(container.textContent).toContain("Tunggu sampai pemeriksaan foto selesai");
    expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    expect(mocks.save).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith("/admin/api/drafts/new-draft/media", expect.objectContaining({
      method: "POST", body: file, headers: expect.objectContaining({
        "X-AyaWarta-Media-Slot": "hero", "X-AyaWarta-Draft-Version": "2", "Content-Type": "image/jpeg",
      }),
    }));

    await act(async () => finishFetch({ ok: true, json: async () => ({ ok: true, data: {
      state: "verified", provisionId: "provision-1", asset: { id: "asset-1", url: "https://res.cloudinary.com/example/image/upload/v1/hero.webp", width: 900, height: 1200, format: "webp" },
    } }) }));
    expect(container.querySelector<HTMLSelectElement>("#draft-heroAssetId")?.value).toBe("asset-1");
    expect(container.textContent).toContain("Perubahan belum disimpan");
    expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("recovers a pending upload after reload and selects the verified draft-owned asset", async () => {
    const payload = createEmptyDraftPayload();
    payload.slug = "rani-bima";
    const draft: AdminDraftDto = {
      id: "new-draft", invitationId: null, proposedSlug: "rani-bima", payload,
      draftVersion: 2, basePublishedVersion: null,
      createdAt: "2026-10-31T01:00:00.000Z", updatedAt: "2026-10-31T01:00:00.000Z",
    };
    mocks.recover.mockResolvedValue({ ok: true, data: {
      state: "verified", provisionId: "pending-1", asset: { id: "asset-1", url: "https://res.cloudinary.com/example/image/upload/v1/hero.webp", width: 900, height: 1200, format: "webp" },
    } });
    await act(async () => root.render(<AdminDraftEditor initialPayload={payload} initialDraft={draft} mediaChoices={[]} mediaUploadEnabled pendingMedia={[{
      provisionId: "pending-1", slot: "hero", idempotencyKey: "same-key", createdAt: "2026-10-31T01:00:00.000Z",
    }]} />));
    expect(container.textContent).toContain("Unggahan menunggu pemulihan");
    await act(async () => Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Pulihkan foto"))!.click());
    expect(mocks.recover).toHaveBeenCalledWith({ draftId: "new-draft", provisionId: "pending-1", expectedDraftVersion: 2 });
    expect(container.querySelector<HTMLSelectElement>("#draft-heroAssetId")?.value).toBe("asset-1");
    expect(container.textContent).not.toContain("Unggahan menunggu pemulihan");
    expect(container.textContent).toContain("Perubahan belum disimpan");
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("shows linked field errors and retains input after a failed save", async () => {
    const initial = createEmptyDraftPayload();
    initial.meta = null;
    initial.events = [{ key: "event-1", name: "", displayDate: "", displayTime: "", location: "", address: "", mapUrl: "" }];
    mocks.create.mockResolvedValue({ ok: false, code: "validation", message: "Periksa isi draf.", fieldErrors: {
      slug: ["Slug tidak valid."],
      "meta.theme": ["Tema tidak valid."],
      "meta.variant": ["Varian tidak valid."],
      "events.0.name": ["Nama acara wajib diisi."],
      "events.0.key": ["Kunci baris tidak unik."],
    } });
    await act(async () => root.render(<AdminDraftEditor initialPayload={initial} mediaChoices={[]} />));
    await act(async () => changeValue(container.querySelector<HTMLInputElement>("#draft-slug")!, "Nama Tidak Valid"));
    await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));

    const slug = container.querySelector<HTMLInputElement>("#draft-slug")!;
    expect(slug.value).toBe("Nama Tidak Valid");
    expect(slug.getAttribute("aria-invalid")).toBe("true");
    expect(slug.getAttribute("aria-describedby")).toContain("draft-slug-error");
    expect(container.querySelector('a[href="#draft-slug"]')).not.toBeNull();
    for (const path of ["draft-meta-theme", "draft-meta-variant", "draft-events-0-name", "draft-events"]) {
      expect(container.querySelector(`a[href="#${path}"]`)).not.toBeNull();
      expect(container.querySelector(`#${path}`)).not.toBeNull();
    }
    const scrollToSlug = vi.fn();
    slug.scrollIntoView = scrollToSlug;
    const slugLink = container.querySelector<HTMLAnchorElement>('a[href="#draft-slug"]')!;
    slugLink.focus();
    await act(async () => slugLink.click());
    expect(document.activeElement).toBe(slug);
    expect(scrollToSlug).toHaveBeenCalledWith({ block: "start" });
    expect(slug.classList.contains("scroll-mt-24")).toBe(true);

    const identity = container.querySelector<HTMLElement>("#draft-identity")!;
    const scrollToIdentity = vi.fn();
    identity.scrollIntoView = scrollToIdentity;
    await act(async () => container.querySelector<HTMLAnchorElement>('a[href="#draft-meta-variant"]')!.click());
    expect(document.activeElement).toBe(identity); // variant is disabled until a theme is selected
    expect(scrollToIdentity).toHaveBeenCalledWith({ block: "start" });
    expect(container.querySelector("#draft-meta-variant-error")).not.toBeNull();
    expect(container.textContent).toContain("Slug tidak valid");
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("warns on browser Back and keeps the unsaved editor when the user cancels", async () => {
    vi.useFakeTimers();
    const confirm = vi.fn().mockReturnValue(false);
    vi.stubGlobal("confirm", confirm);
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    await act(async () => root.render(<AdminDraftEditor initialPayload={createEmptyDraftPayload()} mediaChoices={[]} />));
    await act(async () => changeValue(container.querySelector<HTMLInputElement>("#draft-slug")!, "rani-bima"));
    expect(window.history.state?.__ayawartaDraftGuard).toBe("/admin/invitations/new");

    await act(async () => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(confirm).toHaveBeenCalledWith("Perubahan draf belum disimpan. Tinggalkan halaman ini?");
    expect(back).not.toHaveBeenCalled();
    expect(window.history.state?.__ayawartaDraftGuard).toBe("/admin/invitations/new");
    expect(container.querySelector<HTMLInputElement>("#draft-slug")?.value).toBe("rani-bima");

    confirm.mockReturnValue(true);
    await act(async () => window.dispatchEvent(new PopStateEvent("popstate")));
    await act(async () => vi.advanceTimersByTime(0));
    expect(back).toHaveBeenCalledTimes(1);
  });
});

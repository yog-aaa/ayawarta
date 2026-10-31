// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

// @ts-expect-error React 19 act test flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({ review: vi.fn(), publish: vi.fn(), replace: vi.fn() }));
vi.mock("@/app/admin/actions", () => ({
  reviewInvitationDraftAction: mocks.review,
  publishInvitationDraftAction: mocks.publish,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }>) => <a href={href} {...props}>{children}</a>,
}));

import { AdminPublishPanel } from "./AdminPublishPanel";

const review = {
  draftId: "draft-1", invitationId: "inv-1", slug: "dudi-aini",
  draftVersion: 5, publishedVersion: 3, changeSummary: "Nama acara diperbarui.", publicPath: "/dudi-aini",
};

function changeValue(element: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("admin publish panel", () => {
  let container: HTMLDivElement;
  let root: Root;
  const onValidationError = vi.fn();
  const onPublished = vi.fn();

  function renderPanel(disabled = false, invitationId = "draft-1", basePublishedVersion: number | null = 3) {
    return root.render(<AdminPublishPanel draftId={invitationId} draftVersion={5} basePublishedVersion={basePublishedVersion} disabled={disabled} onValidationError={onValidationError} onPublished={onPublished} />);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
    mocks.review.mockResolvedValue({ ok: true, data: review });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("requires saved review, matching versions, and exact slug confirmation before publishing", async () => {
    await act(async () => renderPanel(true));
    expect(container.querySelector<HTMLButtonElement>("button")?.disabled).toBe(true);
    expect(mocks.review).not.toHaveBeenCalled();
    await act(async () => renderPanel(false));
    const reviewButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Tinjau penerbitan"))!;
    await act(async () => reviewButton.click());
    expect(mocks.review).toHaveBeenCalledWith({ id: "draft-1" });
    expect(container.textContent).toContain("Nama acara diperbarui");
    expect(container.textContent).toContain("Versi terbit saat ini");

    const trigger = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Terbitkan")!;
    await act(async () => trigger.click());
    const dialog = container.querySelector("dialog")!;
    expect(dialog.hasAttribute("open")).toBe(true);
    const submit = dialog.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(submit.disabled).toBe(true);
    expect(mocks.publish).not.toHaveBeenCalled();

    const input = dialog.querySelector<HTMLInputElement>("#publish-confirm-slug")!;
    await act(async () => changeValue(input, "dudi-aini"));
    expect(submit.disabled).toBe(false);
    mocks.publish.mockResolvedValue({ ok: true, data: { slug: "dudi-aini", version: 4, publicPath: "/dudi-aini" } });
    await act(async () => dialog.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    await act(async () => vi.advanceTimersByTime(0));
    expect(mocks.publish).toHaveBeenCalledWith({ id: "draft-1", expectedDraftVersion: 5, expectedPublishedVersion: 3, confirmationSlug: "dudi-aini" });
    expect(onPublished).toHaveBeenCalledWith({ slug: "dudi-aini", version: 4, publicPath: "/dudi-aini" });
    expect(container.textContent).toContain("berhasil diterbitkan sebagai versi 4");
    expect(container.textContent).toContain("Draf tetap tersimpan; buka kembali undangan dari daftar");
    expect(container.querySelector('a[href="/dudi-aini"]')).not.toBeNull();
    expect(dialog.hasAttribute("open")).toBe(false);
  });

  it("rejects a review of a newer draft before confirmation", async () => {
    const reload = vi.fn();
    vi.stubGlobal("location", { reload });
    mocks.review.mockResolvedValue({ ok: true, data: { ...review, draftVersion: 6 } });
    await act(async () => renderPanel());
    await act(async () => Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Tinjau penerbitan"))!.click());
    expect(container.textContent).toContain("Draf atau undangan terbit berubah");
    expect(container.querySelector("dialog")?.hasAttribute("open")).toBe(false);
    expect(mocks.publish).not.toHaveBeenCalled();
    await act(async () => Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Muat ulang editor")!.click());
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("prevents confirmation when a reviewed draft has no guest-visible changes", async () => {
    mocks.review.mockResolvedValue({ ok: true, data: { ...review, changeSummary: "Tidak ada perubahan konten." } });
    await act(async () => renderPanel());
    await act(async () => Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Tinjau penerbitan"))!.click());

    const publishTrigger = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Terbitkan")!;
    expect(publishTrigger.disabled).toBe(true);
    expect(container.textContent).toContain("Ubah konten yang terlihat oleh tamu");
    await act(async () => publishTrigger.click());
    expect(container.querySelector("dialog")?.hasAttribute("open")).toBe(false);
    expect(mocks.publish).not.toHaveBeenCalled();
  });

  it("reviews the first publication with no live version and explicit slug confirmation", async () => {
    mocks.review.mockResolvedValue({ ok: true, data: { ...review, invitationId: null, publishedVersion: null, changeSummary: "Undangan baru siap diterbitkan." } });
    await act(async () => renderPanel(false, "draft-1", null));
    expect(container.textContent).toContain("Terbitkan undangan baru");
    await act(async () => Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Tinjau penerbitan"))!.click());
    expect(container.textContent).toContain("Belum terbit");
    await act(async () => Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Terbitkan")!.click());
    expect(container.textContent).toContain("versi terbit pertama");
    await act(async () => changeValue(container.querySelector<HTMLInputElement>("#publish-confirm-slug")!, "dudi-aini"));
    mocks.publish.mockResolvedValue({ ok: true, data: { slug: "dudi-aini", version: 1, publicPath: "/dudi-aini" } });
    await act(async () => container.querySelector("dialog form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(mocks.publish).toHaveBeenCalledWith({ id: "draft-1", expectedDraftVersion: 5, expectedPublishedVersion: null, confirmationSlug: "dudi-aini" });
    expect(container.textContent).toContain("versi 1");
  });

  it("surfaces field validation and blocks retry after uncertain post-commit verification", async () => {
    mocks.review.mockResolvedValueOnce({ ok: false, code: "validation", message: "Periksa isi draf.", fieldErrors: { heroAssetId: ["Foto sampul wajib."] } })
      .mockResolvedValueOnce({ ok: true, data: review });
    await act(async () => renderPanel());
    const reviewButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Tinjau penerbitan"))!;
    await act(async () => reviewButton.click());
    expect(onValidationError).toHaveBeenCalledWith("Periksa isi draf.", { heroAssetId: ["Foto sampul wajib."] });
    await act(async () => reviewButton.click());
    const trigger = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Terbitkan")!;
    await act(async () => trigger.click());
    await act(async () => changeValue(container.querySelector<HTMLInputElement>("#publish-confirm-slug")!, "dudi-aini"));
    mocks.publish.mockResolvedValue({ ok: false, code: "dependency_failure", committedUnverified: true, message: "Penerbitan tersimpan, tetapi pemeriksaan halaman publik gagal." });
    await act(async () => container.querySelector("dialog form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    await act(async () => vi.advanceTimersByTime(0));
    expect(container.textContent).toContain("Jangan mengulangi penerbitan");
    expect(container.querySelector<HTMLButtonElement>("button")?.disabled).toBe(true);
    expect(mocks.publish).toHaveBeenCalledTimes(1);
  });

  it("allows a fresh review after a pre-commit dependency failure", async () => {
    await act(async () => renderPanel());
    const reviewButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Tinjau penerbitan"))!;
    await act(async () => reviewButton.click());
    await act(async () => Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Terbitkan")!.click());
    await act(async () => changeValue(container.querySelector<HTMLInputElement>("#publish-confirm-slug")!, "dudi-aini"));
    mocks.publish.mockResolvedValue({ ok: false, code: "dependency_failure", message: "Penyimpanan belum tersedia." });
    await act(async () => container.querySelector("dialog form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    await act(async () => vi.advanceTimersByTime(0));

    expect(container.textContent).toContain("Penyimpanan belum tersedia.");
    expect(container.textContent).not.toContain("Jangan mengulangi penerbitan");
    expect(reviewButton.disabled).toBe(false);
    await act(async () => reviewButton.click());
    expect(mocks.review).toHaveBeenCalledTimes(2);
    expect(mocks.publish).toHaveBeenCalledTimes(1);
  });
});

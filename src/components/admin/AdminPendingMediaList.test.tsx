// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

// @ts-expect-error React 19 act test flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

import { AdminPendingMediaList } from "./AdminPendingMediaList";

describe("pending draft media", () => {
  let container: HTMLDivElement;
  let root: Root;
  const recover = vi.fn();
  const pending = [{ provisionId: "pending-1", slot: "gallery:row-1", idempotencyKey: "fixed-key", createdAt: "2026-10-31T01:00:00.000Z" }];
  const retryUpload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("keeps a pending gallery upload visible even without its form row", async () => {
    recover.mockResolvedValue({ kind: "pending", message: "Penyimpanan belum siap." });
    await act(async () => root.render(<AdminPendingMediaList pending={pending} disabled={false} onRecover={recover} onRetryUpload={retryUpload} />));
    expect(container.textContent).toContain("Foto galeri");
    expect(container.textContent).toContain("pilih kembali berkas yang sama");
    const retry = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Pulihkan foto"))!;
    await act(async () => retry.click());
    expect(recover).toHaveBeenCalledWith("pending-1");
    expect(container.textContent).toContain("Penyimpanan belum siap.");
  });

  it("disables recovery during a dirty edit", async () => {
    await act(async () => root.render(<AdminPendingMediaList pending={pending} disabled onRecover={recover} onRetryUpload={retryUpload} />));
    expect(container.querySelector<HTMLButtonElement>("button")?.disabled).toBe(true);
    expect(recover).not.toHaveBeenCalled();
  });

  it("retries a RESERVED upload with the original idempotency key and selected file", async () => {
    retryUpload.mockResolvedValue({ kind: "verified" });
    await act(async () => root.render(<AdminPendingMediaList pending={pending} disabled={false} onRecover={recover} onRetryUpload={retryUpload} />));
    const input = container.querySelector<HTMLInputElement>('#retry-pending-1')!;
    const file = new File(["same bytes"], "foto.jpg", { type: "image/jpeg" });
    Object.defineProperty(input, "files", { configurable: true, value: [file] });
    await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
    const retry = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Unggah berkas yang sama"))!;
    await act(async () => retry.click());
    expect(retryUpload).toHaveBeenCalledWith("gallery:row-1", file, "fixed-key");
    expect(recover).not.toHaveBeenCalled();
  });
});

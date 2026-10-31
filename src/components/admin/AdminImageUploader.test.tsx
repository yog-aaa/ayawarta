// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

// @ts-expect-error React 19 act test flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

import { AdminImageUploader } from "./AdminImageUploader";

describe("admin image uploader", () => {
  let container: HTMLDivElement;
  let root: Root;
  const upload = vi.fn();

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

  function render(disabled = false, hasPending = false) {
    return root.render(<AdminImageUploader slot="hero" label="Foto sampul" disabled={disabled} hasPending={hasPending} onUpload={upload} />);
  }

  it("waits for a saved draft and exposes a labeled mobile-friendly file control", async () => {
    await act(async () => render(true));
    const input = container.querySelector<HTMLInputElement>('#upload-hero')!;
    expect(input.disabled).toBe(true);
    expect(container.querySelector('label[for="upload-hero"]')?.textContent).toContain("foto sampul");
    expect(container.textContent).toContain("Foto belum tampil di undangan publik sampai diterbitkan");
    expect(container.textContent).toContain("Simpan draf");
    expect(upload).not.toHaveBeenCalled();
  });

  it("retries the same file with the same idempotency key after a transient failure", async () => {
    upload.mockResolvedValueOnce({ kind: "error", message: "Coba lagi." }).mockResolvedValueOnce({ kind: "verified" });
    await act(async () => render());
    const input = container.querySelector<HTMLInputElement>('#upload-hero')!;
    const file = new File(["sample"], "foto.jpg", { type: "image/jpeg" });
    Object.defineProperty(input, "files", { configurable: true, value: [file] });
    await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
    const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes("Unggah foto"))!;
    await act(async () => button.click());
    expect(container.textContent).toContain("Coba lagi.");
    await act(async () => button.click());
    expect(upload).toHaveBeenCalledTimes(2);
    expect(upload.mock.calls[0][0]).toBe("hero");
    expect(upload.mock.calls[0][1]).toBe(file);
    expect(upload.mock.calls[0][2]).toBe(upload.mock.calls[1][2]);
    expect(container.textContent).toContain("Foto terverifikasi dan dipilih");
  });

  it("keeps a pending upload visible while allowing another file", async () => {
    await act(async () => render(false, true));
    expect(container.querySelector<HTMLInputElement>('#upload-hero')?.disabled).toBe(false);
    expect(container.textContent).toContain("menunggu pemulihan");
    expect(upload).not.toHaveBeenCalled();
  });
});

// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WishesGateway } from "@/features/wishes";

vi.mock("@/features/wishes/firebase-adapter", () => ({
  defaultFirebaseWishesAdapter: { subscribe: () => { throw new Error("Unexpected Firebase read"); }, submitWish: () => { throw new Error("Unexpected Firebase write"); } },
}));

import SigerLiveWishes from "./SigerLiveWishes";

let root: Root | null = null;
let host: HTMLDivElement | null = null;
afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

function setInput(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = element instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("Siger Priangan live wishes", () => {
  it("uses the existing gateway for the current slug and sends a validated response", async () => {
    const unsubscribe = vi.fn();
    const submitWish = vi.fn().mockResolvedValue(undefined);
    const gateway: WishesGateway = {
      subscribe: vi.fn((_slug, onData) => {
        onData({ wishes: [], skippedCount: 0 });
        return unsubscribe;
      }),
      submitWish,
    };
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => root?.render(<SigerLiveWishes invitationSlug="test-siger" gateway={gateway} />));
    expect(gateway.subscribe).toHaveBeenCalledWith("test-siger", expect.any(Function), expect.any(Function));

    await act(async () => {
      setInput(host!.querySelector<HTMLInputElement>("#siger-wish-name")!, "Tamu");
      setInput(host!.querySelector<HTMLTextAreaElement>("#siger-wish-message")!, "Selamat berbahagia");
      host!.querySelector<HTMLInputElement>('input[name="attendance"][value="Hadir"]')!.click();
    });
    await act(async () => {
      host!.querySelector<HTMLFormElement>("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(submitWish).toHaveBeenCalledWith("test-siger", { name: "Tamu", message: "Selamat berbahagia", attendance: "Hadir" });
    expect(host.textContent).toContain("berhasil dikirim");
    await act(async () => root?.unmount());
    root = null;
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});

// @vitest-environment happy-dom
import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { sigerPrianganSample } from "@/features/invitations/siger-priangan-sample";

// @ts-expect-error React test environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/features/wishes/firebase-adapter", () => ({ defaultFirebaseWishesAdapter: { subscribe: vi.fn(), submitWish: vi.fn() } }));
import SigerPrianganView from "./SigerPrianganView";

describe("Siger Priangan invitation opening", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    window.history.replaceState(null, "", window.location.pathname);
    Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn(() => ({ matches: false })) });
    vi.stubGlobal("scrollTo", vi.fn());
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

  async function mount() {
    await act(async () => {
      root.render(<SigerPrianganView invitationSlug="siger-priangan-sample" data={sigerPrianganSample.invitation.data} isPreview />);
    });
  }

  it("keeps the invitation closed until the cover action finishes", async () => {
    await mount();
    const shell = container.querySelector(".siger-shell")!;
    const content = container.querySelector("main")!;
    expect(shell.getAttribute("data-gate")).toBe("closed");
    expect(content.inert).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");

    await act(async () => { (container.querySelector(".siger-cover-button") as HTMLAnchorElement).click(); });
    expect(shell.getAttribute("data-gate")).toBe("opening");
    expect(content.inert).toBe(true);

    await act(async () => { vi.advanceTimersByTime(1700); });
    expect(shell.getAttribute("data-gate")).toBe("open");
    expect(content.inert).toBe(false);
    expect(document.activeElement).toBe(content);
    expect(document.body.style.overflow).toBe("");
  });

  it("opens immediately when reduced motion is preferred", async () => {
    Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn(() => ({ matches: true })) });
    await mount();
    await act(async () => { (container.querySelector(".siger-cover-button") as HTMLAnchorElement).click(); });
    expect(container.querySelector(".siger-shell")?.getAttribute("data-gate")).toBe("open");
    expect(container.querySelector("main")?.inert).toBe(false);
  });
});

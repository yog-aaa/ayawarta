// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sigerPrianganSample } from "@/features/invitations/siger-priangan-sample";
import { getClassicRoseThemeConfig } from "@/lib/theme-config/classic-rose";

const gateway = vi.hoisted(() => ({ subscribe: vi.fn(), submitWish: vi.fn() }));
vi.mock("@/features/wishes/firebase-adapter", () => ({ defaultFirebaseWishesAdapter: gateway }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("next/image", () => ({
  default: ({ alt, src, ...rest }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean; loader?: unknown }) => {
    const { fill: _fill, priority: _priority, loader: _loader, ...safe } = rest;
    void _fill; void _priority; void _loader;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt ?? ""} src={src} {...safe} />;
  },
}));
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy({}, { get: (_target, name: string) => ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => {
    const { initial: _initial, animate: _animate, exit: _exit, transition: _transition, whileInView: _while, viewport: _viewport, ...safe } = props;
    void _initial; void _animate; void _exit; void _transition; void _while; void _viewport;
    return React.createElement(name, safe, children);
  } }),
}));

import ClassicRoseClientView from "./ClassicRoseClientView";

let root: Root | null = null;
let host: HTMLDivElement | null = null;
afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  host?.remove();
  root = null; host = null;
  gateway.subscribe.mockReset(); gateway.submitWish.mockReset();
});

describe("Classic Rose private draft preview", () => {
  it("opens without mounting the Firestore-backed wishes adapter", async () => {
    host = document.createElement("div"); document.body.appendChild(host);
    root = createRoot(host);
    const data = sigerPrianganSample.invitation.data;
    await act(async () => root?.render(<ClassicRoseClientView invitationSlug="private-draft" data={data} themeConfig={getClassicRoseThemeConfig("red")} isDraftPreview />));
    await act(async () => host?.querySelector<HTMLButtonElement>('button[data-invitation-open="true"]')?.click());
    expect(host.textContent).toContain("Formulir dinonaktifkan dalam pratinjau draf.");
    expect(host.querySelector("form")).toBeNull();
    expect(gateway.subscribe).not.toHaveBeenCalled();
    expect(gateway.submitWish).not.toHaveBeenCalled();
  });
});

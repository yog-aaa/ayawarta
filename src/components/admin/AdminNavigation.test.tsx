// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

// @ts-expect-error React 19 act test flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("next/image", () => ({
  default: ({ alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt ?? ""} {...props} />
  ),
}));
vi.mock("@/features/auth/actions", () => ({ logoutAction: vi.fn() }));
const pathname = vi.hoisted(() => ({ current: "/admin" }));
const linkStatus = vi.hoisted(() => ({ pendingHref: null as string | null }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));
vi.mock("next/link", async () => {
  const React = await import("react");
  const LinkContext = React.createContext("");
  return {
    default: ({ href, children, ...props }: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }>) => (
      <LinkContext.Provider value={href}>
        <a href={href} {...props}>{children}</a>
      </LinkContext.Provider>
    ),
    useLinkStatus: () => ({ pending: React.useContext(LinkContext) === linkStatus.pendingHref }),
  };
});

import { AdminNavigation } from "./AdminNavigation";

describe("admin navigation", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    pathname.current = "/admin";
    linkStatus.pendingHref = null;
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it("offers only live admin routes and marks the active page", async () => {
    pathname.current = "/admin/invitations";
    await act(async () => root.render(<AdminNavigation adminName="Rani" />));

    const links = container.querySelectorAll('nav[aria-label="Navigasi panel admin"] a');
    expect(links.length).toBe(4); // desktop and mobile drawer
    expect(Array.from(links).map((link) => link.getAttribute("href"))).toEqual([
      "/admin", "/admin/invitations", "/admin", "/admin/invitations",
    ]);
    expect(container.querySelectorAll('a[aria-current="page"]').length).toBe(2);
    expect(Array.from(container.querySelectorAll('a[aria-current="page"]')).every((link) => link.getAttribute("href") === "/admin/invitations")).toBe(true);
    expect(container.textContent).not.toContain("Harga");

    pathname.current = "/admin";
    await act(async () => root.render(<AdminNavigation adminName="Rani" />));
    expect(Array.from(container.querySelectorAll('a[aria-current="page"]')).every((link) => link.getAttribute("href") === "/admin")).toBe(true);
  });

  it("closes the mobile dialog on Escape and returns focus to its trigger", async () => {
    await act(async () => root.render(<AdminNavigation adminName="Rani" />));
    const trigger = container.querySelector('button[aria-label="Buka navigasi admin"]') as HTMLButtonElement;
    const dialog = container.querySelector("dialog") as HTMLDialogElement;

    await act(async () => trigger.click());
    expect(dialog.hasAttribute("open")).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    await act(async () => dialog.dispatchEvent(new Event("cancel", { cancelable: true })));
    expect(dialog.hasAttribute("open")).toBe(false);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  it("shows a delayed mobile header status and clears it after failure or completion", async () => {
    vi.useFakeTimers();
    await act(async () => root.render(<AdminNavigation adminName="Rani" />));
    const trigger = container.querySelector('button[aria-label="Buka navigasi admin"]') as HTMLButtonElement;
    const dialog = container.querySelector("dialog") as HTMLDialogElement;

    await act(async () => trigger.click());
    const destination = dialog.querySelector('nav a[href="/admin/invitations"]') as HTMLAnchorElement;
    await act(async () => destination.click());
    expect(dialog.hasAttribute("open")).toBe(false);
    expect(document.activeElement).toBe(trigger);

    linkStatus.pendingHref = "/admin/invitations";
    await act(async () => root.render(<AdminNavigation adminName="Rani" />));
    expect(container.querySelector("header [role='status']")).toBeNull();

    await act(async () => vi.advanceTimersByTime(349));
    expect(container.querySelector("header [role='status']")).toBeNull();
    await act(async () => vi.advanceTimersByTime(1));
    expect(container.querySelector("header [role='status']")?.textContent).toContain("Memuat halaman");

    linkStatus.pendingHref = null;
    await act(async () => root.render(<AdminNavigation adminName="Rani" />));
    await act(async () => vi.advanceTimersByTime(0));
    expect(container.querySelector("header [role='status']")).toBeNull();

    linkStatus.pendingHref = "/admin/invitations";
    await act(async () => root.render(<AdminNavigation adminName="Rani" />));
    await act(async () => vi.advanceTimersByTime(350));
    expect(container.querySelector("header [role='status']")).not.toBeNull();

    linkStatus.pendingHref = null;
    pathname.current = "/admin/invitations";
    await act(async () => root.render(<AdminNavigation adminName="Rani" />));
    await act(async () => vi.advanceTimersByTime(0));
    expect(container.querySelector("header [role='status']")).toBeNull();
  });
});

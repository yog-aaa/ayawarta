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

import { AdminNavigation } from "./AdminNavigation";

describe("admin navigation", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
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
  });

  it("offers only live admin routes and marks the active page", async () => {
    await act(async () => root.render(<AdminNavigation adminName="Rani" activePage="invitations" />));

    const links = container.querySelectorAll('nav[aria-label="Navigasi panel admin"] a');
    expect(links.length).toBe(4); // desktop and mobile drawer
    expect(Array.from(links).map((link) => link.getAttribute("href"))).toEqual([
      "/admin", "/admin/invitations", "/admin", "/admin/invitations",
    ]);
    expect(container.querySelectorAll('a[aria-current="page"]').length).toBe(2);
    expect(container.textContent).not.toContain("Harga");
  });

  it("closes the mobile dialog on Escape and returns focus to its trigger", async () => {
    await act(async () => root.render(<AdminNavigation adminName="Rani" activePage="overview" />));
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
});

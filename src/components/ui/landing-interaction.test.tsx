// @vitest-environment happy-dom
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

// Configure React 19 act environment
// @ts-expect-error global flag for react act
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const STRIP_PROPS = new Set([
  "whileInView",
  "initial",
  "animate",
  "exit",
  "transition",
  "viewport",
  "variants",
  "fill",
  "priority",
]);

function cleanDomProps(
  props: Record<string, unknown>
): React.HTMLAttributes<HTMLElement> {
  const clean: Record<string, unknown> = {};
  for (const key of Object.keys(props)) {
    if (!STRIP_PROPS.has(key)) {
      clean[key] = props[key];
    }
  }
  return clean as React.HTMLAttributes<HTMLElement>;
}

// Mock next/image to render standard img tag without Next.js custom props leaking to DOM
vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...cleanDomProps(props as unknown as Record<string, unknown>)}
      alt={props.alt || ""}
    />
  ),
}));

let mockReducedMotion = false;
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("framer-motion");
  return {
    ...actual,
    useReducedMotion: () => mockReducedMotion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      div: ({
        children,
        ...props
      }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => (
        <div {...cleanDomProps(props)}>{children}</div>
      ),
      h1: ({
        children,
        ...props
      }: React.HTMLAttributes<HTMLHeadingElement> & Record<string, unknown>) => (
        <h1 {...cleanDomProps(props)}>{children}</h1>
      ),
      p: ({
        children,
        ...props
      }: React.HTMLAttributes<HTMLParagraphElement> & Record<string, unknown>) => (
        <p {...cleanDomProps(props)}>{children}</p>
      ),
    },
  };
});

import HomeSection from "@/app/components/landing/HomeSection";
import Header from "@/app/components/landing/Header";
import ThemeSection from "@/app/components/landing/ThemeSection";
import PricingSection from "@/app/components/landing/PricingSection";

describe("Landing Interactive Behavior & Rendered State Tests (UI-10, UI-11, UI-12)", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    mockReducedMotion = false;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
  });

  describe("Hero Carousel Autoplay, Pause/Resume & Reduced Motion (UI-11, UI-12)", () => {
    it("keeps each changing invitation preview inside the phone screen", async () => {
      await act(async () => {
        root.render(<HomeSection />);
      });

      const heading = container.querySelector("h1");
      expect(heading?.textContent).toContain("AyaWarta");
      expect(heading?.textContent).toContain("Undangan digital,");
      expect(heading?.textContent).toContain("semudah bercerita.");
      expect(heading?.querySelector("img")).toBeNull();
      expect(container.textContent).not.toContain("5rb Pengguna");

      const phone = container.querySelector('[data-testid="hero-phone-frame"]');
      const screen = container.querySelector('[data-testid="hero-phone-screen"]');
      const nextBtn = container.querySelector(
        'button[aria-label="Slide berikutnya"]'
      ) as HTMLButtonElement;

      expect(phone).toBeTruthy();
      expect(screen).toBeTruthy();
      expect(phone?.contains(screen)).toBe(true);
      expect(screen?.querySelector("img[alt='Contoh desain template undangan 1']")).toBeTruthy();

      await act(async () => {
        nextBtn.click();
      });

      expect(screen?.querySelector("img[alt='Contoh desain template undangan 2']")).toBeTruthy();
      expect(container.querySelectorAll("img[alt*='Contoh desain template']").length).toBe(1);
    });

    it("proves ordinary autoplay advances slide every 5 seconds using fake timers", async () => {
      vi.useFakeTimers();

      await act(async () => {
        root.render(<HomeSection />);
      });

      // Initially slide 1 is displayed
      const getImgAlt = () =>
        container.querySelector("img[alt*='Contoh desain template']")?.getAttribute("alt");

      expect(getImgAlt()).toContain("Contoh desain template undangan 1");

      // Advance timers by 5000ms
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(getImgAlt()).toContain("Contoh desain template undangan 2");

      // Advance timers by another 5000ms
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(getImgAlt()).toContain("Contoh desain template undangan 3");
    });

    it("proves pause button stops autoplay and resume restarts it", async () => {
      vi.useFakeTimers();

      await act(async () => {
        root.render(<HomeSection />);
      });

      const getImgAlt = () =>
        container.querySelector("img[alt*='Contoh desain template']")?.getAttribute("alt");

      expect(getImgAlt()).toContain("Contoh desain template undangan 1");

      // Find pause button
      const pauseBtn = container.querySelector(
        'button[aria-label="Jeda putar otomatis"]'
      ) as HTMLButtonElement;
      expect(pauseBtn).toBeTruthy();

      // Click pause
      await act(async () => {
        pauseBtn.click();
      });

      // Label should update to resume
      expect(pauseBtn.getAttribute("aria-label")).toBe("Lanjutkan putar otomatis");

      // Fast-forward 10 seconds: slide should NOT change while paused
      await act(async () => {
        vi.advanceTimersByTime(10000);
      });
      expect(getImgAlt()).toContain("Contoh desain template undangan 1");

      // Click resume
      await act(async () => {
        pauseBtn.click();
      });

      // Label updates back to pause
      expect(pauseBtn.getAttribute("aria-label")).toBe("Jeda putar otomatis");

      // Fast-forward 5 seconds: slide should now advance
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      expect(getImgAlt()).toContain("Contoh desain template undangan 2");
    });

    it("proves autoplay is disabled under reduced motion with truthful disabled control (UI-11)", async () => {
      vi.useFakeTimers();
      mockReducedMotion = true;

      await act(async () => {
        root.render(<HomeSection />);
      });

      const getImgAlt = () =>
        container.querySelector("img[alt*='Contoh desain template']")?.getAttribute("alt");

      // Verify the central toggle button is disabled with exact required label
      const reducedMotionBtn = container.querySelector(
        'button[aria-label="Putar otomatis dinonaktifkan karena preferensi gerak dikurangi"]'
      ) as HTMLButtonElement;

      expect(reducedMotionBtn).toBeTruthy();
      expect(reducedMotionBtn.hasAttribute("disabled")).toBe(true);
      expect(reducedMotionBtn.getAttribute("aria-disabled")).toBe("true");
      expect(reducedMotionBtn.getAttribute("title")).toBe(
        "Putar otomatis dinonaktifkan karena preferensi gerak dikurangi"
      );

      // Fast-forward 20 seconds: slide NEVER advances
      await act(async () => {
        vi.advanceTimersByTime(20000);
      });
      expect(getImgAlt()).toContain("Contoh desain template undangan 1");

      // Manual controls must still be fully functional under reduced motion
      const nextBtn = container.querySelector(
        'button[aria-label="Slide berikutnya"]'
      ) as HTMLButtonElement;
      const prevBtn = container.querySelector(
        'button[aria-label="Slide sebelumnya"]'
      ) as HTMLButtonElement;

      expect(nextBtn).toBeTruthy();
      expect(prevBtn).toBeTruthy();

      await act(async () => {
        nextBtn.click();
      });
      expect(getImgAlt()).toContain("Contoh desain template undangan 2");

      await act(async () => {
        prevBtn.click();
      });
      expect(getImgAlt()).toContain("Contoh desain template undangan 1");
    });
  });

  describe("Header Mobile Disclosure Menu (UI-05, UI-12)", () => {
    it("opens on hamburger click, exposes aria-controls, closes on Escape, and returns focus", async () => {
      await act(async () => {
        root.render(<Header />);
      });

      const toggleBtn = container.querySelector(
        'button[aria-label="Buka menu navigasi"]'
      ) as HTMLButtonElement;
      expect(toggleBtn).toBeTruthy();
      expect(toggleBtn.getAttribute("aria-expanded")).toBe("false");
      expect(toggleBtn.getAttribute("aria-controls")).toBe("mobile-nav-menu");

      // Initial focus on toggle button
      toggleBtn.focus();
      expect(document.activeElement).toBe(toggleBtn);

      // Open menu
      await act(async () => {
        toggleBtn.click();
      });

      expect(toggleBtn.getAttribute("aria-expanded")).toBe("true");
      const mobileNav = container.querySelector("#mobile-nav-menu");
      expect(mobileNav).toBeTruthy();

      // Press Escape key on window
      await act(async () => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      });

      // Menu closes
      expect(toggleBtn.getAttribute("aria-expanded")).toBe("false");
      expect(container.querySelector("#mobile-nav-menu")).toBeNull();

      // Focus returns to toggle button
      expect(document.activeElement).toBe(toggleBtn);
    });
  });

  describe("Theme Section Actions & Swatches (UI-10, UI-12)", () => {
    it("renders every preview action as semantic link to /wedding/classic-rose/red and every external link with new-tab target", async () => {
      await act(async () => {
        root.render(<ThemeSection />);
      });

      // Representative card test: Card 1
      const previewLinks = container.querySelectorAll(
        'a[aria-label^="Lihat pratinjau tema"]'
      );
      const externalLinks = container.querySelectorAll(
        'a[aria-label^="Buka pratinjau tema"][aria-label$="di tab baru"]'
      );
      const bookmarkButtons = container.querySelectorAll(
        'button[aria-label="Simpan tema (segera hadir)"]'
      );

      // Assert that exactly 8 cards are rendered initially
      expect(previewLinks.length).toBe(8);
      expect(externalLinks.length).toBe(8);
      expect(bookmarkButtons.length).toBe(8);

      // Representative assertion on Card 1
      const firstPreview = previewLinks[0] as HTMLAnchorElement;
      expect(firstPreview.getAttribute("href")).toBe("/wedding/classic-rose/red");
      expect(firstPreview.hasAttribute("target")).toBe(false); // same tab

      const firstExternal = externalLinks[0] as HTMLAnchorElement;
      expect(firstExternal.getAttribute("href")).toBe("/wedding/classic-rose/red");
      expect(firstExternal.getAttribute("target")).toBe("_blank"); // new tab
      expect(firstExternal.getAttribute("rel")).toBe("noopener noreferrer");

      const firstBookmark = bookmarkButtons[0] as HTMLButtonElement;
      expect(firstBookmark.hasAttribute("disabled")).toBe(true);
      expect(firstBookmark.getAttribute("aria-disabled")).toBe("true");
      expect(firstBookmark.getAttribute("title")).toBe("Fitur simpan tema segera hadir");

      // Universal contract assertion: ALL 8 cards strictly follow this valid contract
      previewLinks.forEach((link) => {
        expect(link.getAttribute("href")).toBe("/wedding/classic-rose/red");
      });

      externalLinks.forEach((link) => {
        expect(link.getAttribute("href")).toBe("/wedding/classic-rose/red");
        expect(link.getAttribute("target")).toBe("_blank");
        expect(link.getAttribute("rel")).toBe("noopener noreferrer");
      });

      bookmarkButtons.forEach((btn) => {
        expect(btn.hasAttribute("disabled")).toBe(true);
        expect(btn.getAttribute("aria-disabled")).toBe("true");
      });
    });

    it("renders color swatches as honestly disabled controls with 44x44px touch targets when expanded", async () => {
      await act(async () => {
        root.render(<ThemeSection />);
      });

      // Expand theme section
      const expandBtn = container.querySelector(
        "button.rounded-lg.bg-blue-600"
      ) as HTMLButtonElement;
      expect(expandBtn).toBeTruthy();

      await act(async () => {
        expandBtn.click();
      });

      // Swatches are now visible
      const swatches = container.querySelectorAll(
        'button[aria-label="Filter warna segera hadir"]'
      );
      expect(swatches.length).toBe(8);

      swatches.forEach((swatch) => {
        expect(swatch.hasAttribute("disabled")).toBe(true);
        expect(swatch.getAttribute("aria-disabled")).toBe("true");
        expect(swatch.getAttribute("title")).toBe("Filter warna segera hadir");
        // Minimum 44x44px touch target class
        expect(swatch.className).toContain("h-11 w-11");
      });
    });
  });

  describe("Pricing Section CTAs (UI-10, UI-12)", () => {
    it("renders all pricing tier CTAs as semantic links to #tentang", async () => {
      await act(async () => {
        root.render(<PricingSection />);
      });

      const ctaLinks = container.querySelectorAll(
        'a[href="#tentang"]'
      );

      // 3 tiers: Basic ("Coba"), Standar ("Pesan Sekarang"), Premium ("Pesan Sekarang")
      expect(ctaLinks.length).toBe(3);

      const expectedLabels = [
        "Coba untuk paket Basic",
        "Pesan Sekarang untuk paket Standar",
        "Pesan Sekarang untuk paket Premium",
      ];

      ctaLinks.forEach((link, index) => {
        expect(link.getAttribute("href")).toBe("#tentang");
        expect(link.getAttribute("aria-label")).toBe(expectedLabels[index]);
        expect(link.className).toContain("min-h-[44px]");
      });
    });
  });
});

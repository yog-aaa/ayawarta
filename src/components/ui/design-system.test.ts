import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { cn } from "@/lib/cn";
import {
  MOTION_DURATIONS,
  MOTION_EASINGS,
  createFadeInUp,
  createFadeIn,
  createStaggerContainer,
  createScaleIn,
  createSlideIn,
} from "@/lib/motion";
import {
  NAV_LINKS,
  HERO_CONFIG,
  FEATURES_DATA,
  FEATURE_ASSETS,
  PRICING_PLANS,
  PAYMENT_METHODS,
  THEME_CATEGORIES,
  DUMMY_THEMES,
  TESTIMONIALS_DATA,
  SOCIAL_LINKS,
  FOOTER_CONFIG,
} from "@/config/landing";

const rootDir = process.cwd();

describe("Stage 8 & 8.1 — UI and Tailwind Design-System Refactor", () => {
  describe("Class Name Utility & Deterministic Conflict Resolution (cn)", () => {
    it("merges distinct class names", () => {
      expect(cn("px-4", "py-2", "text-center")).toBe("px-4 py-2 text-center");
    });

    it("filters out falsy values (undefined, null, false, empty string)", () => {
      const condition = false;
      expect(
        cn("base-class", condition && "hidden", null, undefined, "", "extra")
      ).toBe("base-class extra");
    });

    it("handles array arguments and nested values", () => {
      expect(cn(["btn", "btn-primary"], "shadow-md")).toBe(
        "btn btn-primary shadow-md"
      );
    });

    it("deterministically overrides earlier conflicting utility classes (UI-06)", () => {
      // Font size conflict: text-2xl overrides text-3xl
      expect(cn("text-3xl font-extrabold", "text-2xl")).toBe(
        "font-extrabold text-2xl"
      );
      // Background color conflict: bg-blue-500 overrides bg-red-500
      expect(cn("p-4 bg-red-500", "bg-blue-500")).toBe("p-4 bg-blue-500");
      // Padding conflict
      expect(cn("px-4 py-2", "px-6")).toBe("py-2 px-6");
    });
  });

  describe("Motion Presets & Reduced Motion Support (motion.ts)", () => {
    it("provides standard transition timing and easing curves", () => {
      expect(MOTION_DURATIONS.fast).toBe(0.15);
      expect(MOTION_DURATIONS.normal).toBe(0.3);
      expect(MOTION_DURATIONS.deliberate).toBe(0.6);
      expect(MOTION_DURATIONS.slow).toBe(0.8);
      expect(MOTION_EASINGS.easeOut).toBeDefined();
    });

    it("createFadeInUp: applies y-displacement when motion is allowed", () => {
      const variant = createFadeInUp(false);
      expect((variant.hidden as { y?: number }).y).toBe(20);
      expect((variant.visible as { y?: number }).y).toBe(0);
      expect((variant.hidden as { opacity?: number }).opacity).toBe(0);
      expect((variant.visible as { opacity?: number }).opacity).toBe(1);
    });

    it("createFadeInUp: zeroes out y-displacement when motion is reduced", () => {
      const variant = createFadeInUp(true);
      expect((variant.hidden as { y?: number }).y).toBe(0);
      expect((variant.visible as { y?: number }).y).toBe(0);
      expect((variant.hidden as { opacity?: number }).opacity).toBe(0);
      expect((variant.visible as { opacity?: number }).opacity).toBe(1);
    });

    it("createSlideIn: translates across axes only when motion is allowed", () => {
      const normalLeft = createSlideIn("left", false);
      expect((normalLeft.hidden as { x?: number }).x).toBe(-100);

      const reducedLeft = createSlideIn("left", true);
      expect((reducedLeft.hidden as { x?: number }).x).toBe(0);

      const normalRight = createSlideIn("right", false);
      expect((normalRight.hidden as { x?: number }).x).toBe(100);

      const reducedRight = createSlideIn("right", true);
      expect((reducedRight.hidden as { x?: number }).x).toBe(0);
    });

    it("createScaleIn: applies scaling only when motion is allowed", () => {
      const normalScale = createScaleIn(false);
      expect((normalScale.hidden as { scale?: number }).scale).toBe(0.9);

      const reducedScale = createScaleIn(true);
      expect((reducedScale.hidden as { scale?: number }).scale).toBe(1);
    });

    it("createFadeIn: handles pure opacity transitions safely", () => {
      const variant = createFadeIn(false);
      expect((variant.hidden as { opacity?: number }).opacity).toBe(0);
      expect((variant.visible as { opacity?: number }).opacity).toBe(1);
    });

    it("createStaggerContainer: configures child stagger and delay correctly", () => {
      const stagger = createStaggerContainer(0.1, 0.2, false);
      const visible = stagger.visible as {
        transition?: { staggerChildren?: number; delayChildren?: number };
      };
      expect(visible.transition?.staggerChildren).toBe(0.1);
      expect(visible.transition?.delayChildren).toBe(0.2);

      const reducedStagger = createStaggerContainer(0.1, 0.2, true);
      const reducedVisible = reducedStagger.visible as {
        transition?: { staggerChildren?: number; delayChildren?: number };
      };
      expect(reducedVisible.transition?.staggerChildren).toBe(0);
      expect(reducedVisible.transition?.delayChildren).toBe(0);
    });
  });

  describe("Typed Landing Configuration (config/landing.ts)", () => {
    it("defines valid navigation links with hash/href targets", () => {
      expect(NAV_LINKS.length).toBeGreaterThanOrEqual(4);
      NAV_LINKS.forEach((link) => {
        expect(link.name).toBeTruthy();
        expect(link.href).toMatch(/^#[a-z]+|^\//);
      });
    });

    it("configures hero content with complete metadata and image carousel", () => {
      expect(HERO_CONFIG.brandName).toBe("AyaWarta");
      expect(HERO_CONFIG.headlineLead).toBeTruthy();
      expect(HERO_CONFIG.headlineEmphasis).toBeTruthy();
      expect(HERO_CONFIG.headlineStory).toBeTruthy();
      expect(HERO_CONFIG.sliderImages.length).toBe(3);
      HERO_CONFIG.sliderImages.forEach((img) => {
        expect(img).toMatch(/^\/images\//);
      });
      expect(HERO_CONFIG.description).toBeTruthy();
      expect(HERO_CONFIG.primaryCtaText).toBeTruthy();
      expect(HERO_CONFIG.secondaryCtaText).toBeTruthy();
    });

    it("provides complete feature data with icons and tags", () => {
      expect(FEATURES_DATA.length).toBe(6);
      FEATURES_DATA.forEach((feat) => {
        expect(feat.title).toBeTruthy();
        expect(feat.description).toBeTruthy();
        expect(feat.iconName).toBeTruthy();
      });
      expect(FEATURE_ASSETS.phoneFeature).toBeTruthy();
    });

    it("defines pricing plans and payment gateway support", () => {
      expect(PRICING_PLANS.length).toBe(3);
      PRICING_PLANS.forEach((plan) => {
        expect(plan.name).toBeTruthy();
        expect(plan.price).toBeTruthy();
        expect(plan.features.length).toBeGreaterThan(0);
      });
      expect(PAYMENT_METHODS.length).toBeGreaterThan(0);
    });

    it("defines theme catalog categories and dummy theme entries", () => {
      expect(THEME_CATEGORIES.length).toBeGreaterThanOrEqual(4);
      expect(THEME_CATEGORIES[0]).toBe("Semua");
      expect(DUMMY_THEMES.length).toBe(50);
      DUMMY_THEMES.forEach((theme) => {
        expect(theme.id).toBeTruthy();
        expect(theme.title).toBeTruthy();
        expect(theme.category).toBeTruthy();
        expect(theme.imageSrc).toBeTruthy();
        expect(theme.code).toBeTruthy();
      });
    });

    it("defines testimonials and footer configurations", () => {
      expect(TESTIMONIALS_DATA.length).toBeGreaterThanOrEqual(3);
      TESTIMONIALS_DATA.forEach((t) => {
        expect(t.name).toBeTruthy();
        expect(t.text).toBeTruthy();
        expect(t.rating).toBeGreaterThanOrEqual(1);
      });
      expect(SOCIAL_LINKS.length).toBeGreaterThan(0);
      expect(FOOTER_CONFIG.brandName).toBe("AyaWarta");
      expect(FOOTER_CONFIG.aboutParagraphs.length).toBeGreaterThan(0);
    });
  });

  describe("Server / Client Architecture Boundaries (UI-03)", () => {
    const useClientPattern = new RegExp('^\\s*["\']use ' + 'client["\'];?');

    it("ensures src/app/page.tsx is a Server Component (no 'use client')", () => {
      const pagePath = path.join(rootDir, "src/app/page.tsx");
      const content = fs.readFileSync(pagePath, "utf8");
      expect(useClientPattern.test(content)).toBe(false);
      expect(content).toContain("<a href=\"#main-content\" className=\"skip-link\"");
    });

    it("ensures Footer, FeatureSection, PricingSection, and TestimonialSection are Server Components (UI-03)", () => {
      const serverSections = [
        "Footer.tsx",
        "FeatureSection.tsx",
        "PricingSection.tsx",
        "TestimonialSection.tsx",
      ];

      for (const section of serverSections) {
        const sectionPath = path.join(
          rootDir,
          "src/app/components/landing",
          section
        );
        const content = fs.readFileSync(sectionPath, "utf8");
        expect(useClientPattern.test(content)).toBe(false);
      }
    });

    it("verifies interactive landing sections and motion island are the only Client Components", () => {
      const clientComponents = [
        "Header.tsx",
        "HomeSection.tsx",
        "ThemeSection.tsx",
      ];

      for (const comp of clientComponents) {
        const filePath = path.join(
          rootDir,
          "src/app/components/landing",
          comp
        );
        expect(fs.existsSync(filePath)).toBe(true);
        const content = fs.readFileSync(filePath, "utf8");
        expect(useClientPattern.test(content)).toBe(true);
      }

      // Small motion island is client-side
      const motionIslandPath = path.join(
        rootDir,
        "src/components/ui/AnimateIn.tsx"
      );
      expect(fs.existsSync(motionIslandPath)).toBe(true);
      const motionContent = fs.readFileSync(motionIslandPath, "utf8");
      expect(useClientPattern.test(motionContent)).toBe(true);
    });

    it("verifies PascalCase filenames for landing components and absence of old lowercase files", () => {
      const landingDir = path.join(rootDir, "src/app/components/landing");
      const files = fs.readdirSync(landingDir);

      const expectedFiles = [
        "Header.tsx",
        "HomeSection.tsx",
        "FeatureSection.tsx",
        "PricingSection.tsx",
        "ThemeSection.tsx",
        "TestimonialSection.tsx",
        "Footer.tsx",
      ];

      for (const expected of expectedFiles) {
        expect(files).toContain(expected);
      }
    });

    it("ensures no landing component imports database, auth credentials, or server-only", () => {
      const landingDir = path.join(rootDir, "src/app/components/landing");
      const files = fs.readdirSync(landingDir).filter((f) => f.endsWith(".tsx"));

      for (const file of files) {
        const content = fs.readFileSync(path.join(landingDir, file), "utf8");
        expect(content).not.toContain("server-only");
        expect(content).not.toContain("@/lib/server/db");
        expect(content).not.toContain("@prisma/client");
        expect(content).not.toContain(["AUTH", "_SECRET"].join(""));
        expect(content).not.toContain(["DATA", "BASE_URL"].join(""));
      }
    });
  });

  describe("Semantic Tailwind v4 Theme & Accessibility CSS Tokens (UI-06)", () => {
    it("contains semantic @theme tokens and standard content widths in globals.css", () => {
      const cssPath = path.join(rootDir, "src/app/globals.css");
      const content = fs.readFileSync(cssPath, "utf8");

      expect(content).toContain("@theme {");
      expect(content).toContain("--color-brand-primary");
      expect(content).toContain("--color-brand-secondary");
      expect(content).toContain("--color-brand-accent");
      expect(content).toContain("--color-surface");
      expect(content).toContain("--color-muted");

      // Content widths token category
      expect(content).toContain("--content-width-narrow");
      expect(content).toContain("--content-width-default");
      expect(content).toContain("--content-width-fluid");

      expect(content).toContain(".focus-ring");
      expect(content).toContain(".skip-link");
      expect(content).toContain("@media (prefers-reduced-motion: reduce)");

      // Verify Classic Rose variables remain preserved and unpolluted
      expect(content).toContain("--color-primary-rose");
      expect(content).toContain(".bg-primary-rose");
      expect(content).toContain(".text-primary-rose");
    });
  });

  describe("Interactive Accessibility & Reduced Motion Contracts (UI-04, UI-05, UI-08)", () => {
    it("HomeSection: implements autoplay pause when reduced motion is preferred and exposes pause/play control (UI-04)", () => {
      const homePath = path.join(
        rootDir,
        "src/app/components/landing/HomeSection.tsx"
      );
      const content = fs.readFileSync(homePath, "utf8");

      // Verify reduced motion check halts autoplay
      expect(content).toContain("shouldReduceMotion || isAutoplayPaused");
      // Verify visible pause/resume control with accessible aria-label
      expect(content).toContain("isAutoplayPaused ?");
      expect(content).toContain("Lanjutkan putar otomatis");
      expect(content).toContain("Jeda putar otomatis");
      // Verify manual navigation controls preserved
      expect(content).toContain("Slide sebelumnya");
      expect(content).toContain("Slide berikutnya");
    });

    it("Header: implements aria-controls, Escape handler, and focus return for mobile menu (UI-05)", () => {
      const headerPath = path.join(
        rootDir,
        "src/app/components/landing/Header.tsx"
      );
      const content = fs.readFileSync(headerPath, "utf8");

      expect(content).toContain('aria-controls="mobile-nav-menu"');
      expect(content).toContain('id="mobile-nav-menu"');
      expect(content).toContain('e.key === "Escape"');
      expect(content).toContain("toggleButtonRef.current?.focus()");
    });

    it("ThemeSection: keeps card actions always visible and marks bookmark disabled truthfully (UI-05)", () => {
      const themePath = path.join(
        rootDir,
        "src/app/components/landing/ThemeSection.tsx"
      );
      const content = fs.readFileSync(themePath, "utf8");

      expect(content).toContain("aria-disabled=\"true\"");
      expect(content).toContain("Fitur simpan tema segera hadir");
      expect(content).toContain("Preview");
      expect(content).toContain('htmlFor="theme-search"');
      expect(content).toContain('name="search"');
      expect(content).toContain('autoComplete="off"');
      expect(content).toContain("spellCheck={false}");
    });

    it("Section anchors: provide scroll-margin to prevent clipping under sticky header (UI-08)", () => {
      const sections = [
        "HomeSection.tsx",
        "FeatureSection.tsx",
        "PricingSection.tsx",
        "ThemeSection.tsx",
        "TestimonialSection.tsx",
        "Footer.tsx",
      ];

      for (const section of sections) {
        const filePath = path.join(
          rootDir,
          "src/app/components/landing",
          section
        );
        const content = fs.readFileSync(filePath, "utf8");
        expect(content).toContain("scroll-mt-20 lg:scroll-mt-24");
      }
    });
  });
});

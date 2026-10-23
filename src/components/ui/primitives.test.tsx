import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { Container } from "./Container";
import { SectionHeader } from "./SectionHeader";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { FramedImage } from "./FramedImage";

describe("Rendered Primitives Contract Tests (UI-06, UI-09)", () => {
  describe("Container Primitive", () => {
    it("renders default container with semantic max-width token and padding", () => {
      const html = renderToString(
        <Container className="test-custom">
          <span>Container Content</span>
        </Container>
      );

      expect(html).toContain("<div");
      expect(html).toContain("max-w-[var(--content-width-default,80rem)]");
      expect(html).toContain("px-4 sm:px-6 lg:px-8");
      expect(html).toContain("test-custom");
      expect(html).toContain("Container Content");
    });

    it("renders polymorphic semantic HTML tags (section, main) with narrow token", () => {
      const sectionHtml = renderToString(
        <Container as="section" size="narrow">
          <p>Section Content</p>
        </Container>
      );
      expect(sectionHtml).toContain("<section");
      expect(sectionHtml).toContain("max-w-[var(--content-width-narrow,48rem)]");
      expect(sectionHtml).toContain("Section Content");

      const mainHtml = renderToString(
        <Container as="main" size="fluid">
          <p>Main Content</p>
        </Container>
      );
      expect(mainHtml).toContain("<main");
      expect(mainHtml).toContain("max-w-[var(--content-width-fluid,100%)]");
    });
  });

  describe("SectionHeader Primitive", () => {
    it("renders heading and subtitle with center alignment by default", () => {
      const html = renderToString(
        <SectionHeader
          title="Daftar Paket"
          subtitle="Pilihan fleksibel untuk semua kebutuhan"
        />
      );

      expect(html).toContain("<h2");
      expect(html).toContain("Daftar Paket");
      expect(html).toContain("Pilihan fleksibel untuk semua kebutuhan");
      expect(html).toContain("text-center");
      expect(html).toContain("text-3xl font-extrabold text-gray-800 lg:text-4xl");
    });

    it("supports left alignment and deterministic utility override via cn()", () => {
      const html = renderToString(
        <SectionHeader
          title="Fitur Unggulan"
          align="left"
          titleClassName="text-2xl"
          className="custom-header"
        />
      );

      expect(html).toContain("text-left");
      expect(html).toContain("custom-header");
      expect(html).toContain("text-2xl");
      // cn() conflict merger replaces text-3xl with text-2xl
      expect(html).not.toContain("text-3xl");
    });
  });

  describe("Button Primitive", () => {
    it("renders native button with primary variant, focus-ring, and touch target", () => {
      const html = renderToString(
        <Button variant="primary" size="md" type="submit">
          Kirim Pesan
        </Button>
      );

      expect(html).toContain("<button");
      expect(html).toContain('type="submit"');
      expect(html).toContain("min-h-[44px]");
      expect(html).toContain("focus-ring");
      expect(html).toContain("transition-[background-color,color,border-color,box-shadow,transform]");
      expect(html).toContain("Kirim Pesan");
    });

    it("renders disabled button preventing user interaction", () => {
      const html = renderToString(
        <Button variant="primary" disabled>
          Memproses…
        </Button>
      );

      expect(html).toContain("disabled");
      expect(html).toContain("disabled:opacity-50");
      expect(html).toContain("disabled:pointer-events-none");
    });

    it("renders semantic anchor tag when href is supplied", () => {
      const html = renderToString(
        <Button href="#fitur" variant="secondary">
          Pelajari Lebih Lanjut
        </Button>
      );

      expect(html).toContain("<a");
      expect(html).toContain('href="#fitur"');
      expect(html).toContain("Pelajari Lebih Lanjut");
      expect(html).toContain("focus-ring");
    });
  });

  describe("IconButton Primitive", () => {
    it("renders accessible button enforcing aria-label and 44x44px touch target", () => {
      const html = renderToString(
        <IconButton
          aria-label="Tutup navigasi"
          variant="secondary"
          size="md"
        >
          <span aria-hidden="true">✕</span>
        </IconButton>
      );

      expect(html).toContain("<button");
      expect(html).toContain('aria-label="Tutup navigasi"');
      expect(html).toContain("h-11 w-11"); // 44px by 44px
      expect(html).toContain("focus-ring");
      expect(html).toContain("transition-[background-color,color,border-color,box-shadow,transform]");
      expect(html).toContain("✕");
    });

    it("renders primary icon button consuming brand semantic token", () => {
      const html = renderToString(
        <IconButton aria-label="Putar otomatis" variant="primary">
          <span>▶</span>
        </IconButton>
      );

      expect(html).toContain("bg-brand-primary");
      expect(html).toContain("shadow-brand");
      expect(html).toContain("hover:bg-brand-primary-hover");
    });
  });

  describe("FramedImage Primitive", () => {
    it("renders framed image container with fill and portrait aspect ratio", () => {
      const html = renderToString(
        <FramedImage
          src="/images/slider/slide 1.jpg"
          alt="Contoh tema pernikahan"
          fill={true}
          aspectRatio="portrait"
          rounded="2xl"
          className="theme-card-frame"
        />
      );

      expect(html).toContain("<div");
      expect(html).toContain("aspect-[3/4]");
      expect(html).toContain("rounded-2xl");
      expect(html).toContain("theme-card-frame");
      expect(html).toContain("<img");
      expect(html).toContain('alt="Contoh tema pernikahan"');
    });

    it("renders framed image with explicit width and height when fill is false", () => {
      const html = renderToString(
        <FramedImage
          src="/images/logo.png"
          alt="Logo AyaWarta"
          fill={false}
          width={150}
          height={40}
          aspectRatio="custom"
          rounded="none"
        />
      );

      expect(html).toContain("<img");
      expect(html).toContain('width="150"');
      expect(html).toContain('height="40"');
      expect(html).toContain('alt="Logo AyaWarta"');
    });
  });
});

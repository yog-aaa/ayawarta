import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { sigerPrianganSample } from "@/features/invitations/siger-priangan-sample";

const gateway = vi.hoisted(() => ({ subscribe: vi.fn(), submitWish: vi.fn() }));
vi.mock("@/features/wishes/firebase-adapter", () => ({ defaultFirebaseWishesAdapter: gateway }));
import SigerPrianganView from "./SigerPrianganView";
import SigerWishes from "./SigerWishes";

describe("Siger Priangan static template", () => {
  it("server-renders the cover and all invitation details with a no-JS anchor", () => {
    const html = renderToStaticMarkup(<SigerPrianganView invitationSlug="siger-priangan-sample" data={sigerPrianganSample.invitation.data} isPreview />);
    expect(html).toContain("Damar &amp; Raras");
    expect(html).toContain('href="#siger-content"');
    expect(html).toContain('<noscript><style>');
    expect(html).toContain('display:block!important');
    expect(html).toMatch(/class="siger-cover-relief" aria-hidden="true"><svg[^>]+focusable="false"/);
    expect(html).toContain("Upacara Pernikahan");
    expect(html).toContain("Alamat contoh, Jawa Barat");
    expect(html).toContain("Sampai bertemu");
    expect(html).toContain("Pratinjau ilustratif");
    expect(html).not.toContain("squidward");
    expect(html).not.toContain("<form");
    expect(gateway.subscribe).not.toHaveBeenCalled();
    expect(gateway.submitWish).not.toHaveBeenCalled();
  });

  it("keeps illustrative and draft wishes previews read-only", () => {
    const sample = renderToStaticMarkup(<SigerWishes invitationSlug="siger-priangan-sample" isPreview />);
    const draft = renderToStaticMarkup(<SigerWishes invitationSlug="draft-private" isPreview />);
    expect(sample).toContain("Pratinjau contoh");
    expect(draft).toContain("Pratinjau draf");
    expect(sample).not.toContain("<form");
    expect(draft).not.toContain("<form");
  });

  it("keeps schedule details readable and gives the sample a photo chapter", () => {
    const html = renderToStaticMarkup(<SigerPrianganView invitationSlug="siger-priangan-sample" data={sigerPrianganSample.invitation.data} isPreview />);
    const event = html.match(/<article class="siger-event"[^>]*>.*?<\/article>/)?.[0];
    expect(event).toMatch(/<header class="siger-event-heading">.*?<h3>Upacara Pernikahan<\/h3><\/header>/);
    expect(event).toContain("Sabtu, 12 Juni 2027");
    expect(event).toContain("09.00 WIB");
    expect(event).toContain("Tempat acara contoh");
    expect(event).toContain("Alamat contoh, Jawa Barat");
    expect(html).toContain('class="siger-photo-chapter"');
    expect(html).toContain("forest-walk.webp");
    expect(html).toContain("Ilustrasi pasangan fiktif berjalan bersama di hutan pinus");
    expect(html).not.toContain("Foto belum tersedia");
  });

  it("retains the honest placeholder when media is missing", () => {
    const data = {
      ...sigerPrianganSample.invitation.data,
      couple: { ...sigerPrianganSample.invitation.data.couple, heroImage: "" },
      gallery: { ...sigerPrianganSample.invitation.data.gallery, items: [{ url: "", altText: "", caption: "" }] },
    };
    const html = renderToStaticMarkup(<SigerPrianganView invitationSlug="draft-private" data={data} isPreview />);
    expect(html).not.toContain('class="siger-photo-chapter"');
    expect(html).toContain('class="siger-gallery-placeholder"');
    expect(html).toContain("Foto belum tersedia");
  });

  it("renders each visual scene as decoration around stable invitation content", () => {
    const html = renderToStaticMarkup(<SigerPrianganView invitationSlug="siger-priangan-sample" data={sigerPrianganSample.invitation.data} isPreview />);
    for (const scene of ["opening", "pair", "schedule", "spine", "album", "ending"]) {
      expect(html).toContain(`class="siger-scene siger-scene-${scene}" aria-hidden="true"`);
    }
    expect(html).toContain('class="siger-cover-horizon" aria-hidden="true"');
    expect(html).toContain('class="siger-gallery-mat" aria-hidden="true"');
    expect(html).toContain('class="siger-pair-fold siger-pair-fold-left" aria-hidden="true"');
    expect(html).toContain('class="siger-event-paper-veil" aria-hidden="true"');
    expect(html).toContain('class="siger-story-unfurl" aria-hidden="true"');
    expect(html).toContain('class="siger-album-cover" aria-hidden="true"');
    expect(html).toMatch(/<h2 id="siger-events-title">Rangkaian Acara<\/h2>.*?<article class="siger-event"/);
    expect(html.indexOf('class="siger-lede"')).toBeLessThan(html.indexOf('class="siger-scene siger-scene-opening"'));
    expect(html).toMatch(/<h2 id="siger-events-title">Rangkaian Acara<\/h2><div class="siger-event-stage"><div class="siger-scene siger-scene-schedule" aria-hidden="true"/);
  });
});

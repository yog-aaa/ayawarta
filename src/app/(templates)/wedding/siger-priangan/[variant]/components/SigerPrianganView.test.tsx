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

  it("keeps schedule details and empty gallery media as readable text", () => {
    const html = renderToStaticMarkup(<SigerPrianganView invitationSlug="siger-priangan-sample" data={sigerPrianganSample.invitation.data} isPreview />);
    const event = html.match(/<article class="siger-event"[^>]*>.*?<\/article>/)?.[0];
    expect(event).toMatch(/<header class="siger-event-heading">.*?<h3>Upacara Pernikahan<\/h3><\/header>/);
    expect(event).toContain("Sabtu, 12 Juni 2027");
    expect(event).toContain("09.00 WIB");
    expect(event).toContain("Tempat acara contoh");
    expect(event).toContain("Alamat contoh, Jawa Barat");
    expect(html).toContain('class="siger-gallery-placeholder"');
    expect(html).toContain("Foto belum tersedia");
  });
});

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
});

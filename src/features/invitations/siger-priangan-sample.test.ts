import { describe, expect, it } from "vitest";

import { sigerPrianganSample } from "./siger-priangan-sample";

describe("Siger Priangan illustrative sample", () => {
  it("is explicitly noninteractive and contains no borrowed production media", () => {
    expect(sigerPrianganSample.kind).toBe("illustrative-preview");
    expect(sigerPrianganSample.guestInteractions).toBe("read-only");
    expect(sigerPrianganSample.mediaStatus).toBe("illustrative-generated");
    expect(sigerPrianganSample.invitation.meta).toEqual({ theme: "siger-priangan", variant: "ivory" });
    expect(sigerPrianganSample.invitation.data.couple.heroImage).toBe("/themes/siger-priangan/sample/couple-portrait.webp");
    expect(sigerPrianganSample.invitation.data.couple.groom.photo).toBe("/themes/siger-priangan/sample/groom-portrait.webp");
    expect(sigerPrianganSample.invitation.data.couple.bride.photo).toBe("/themes/siger-priangan/sample/bride-portrait.webp");
    expect(sigerPrianganSample.invitation.data.gallery.items).toHaveLength(3);
    expect(sigerPrianganSample.invitation.data.prayer).toBe("");
    expect(sigerPrianganSample.invitation.data.greeting).toBe("Selamat datang dalam cerita kami.");
    expect(sigerPrianganSample.invitation.data.events[0]?.name).toBe("Upacara Pernikahan");
  });
});

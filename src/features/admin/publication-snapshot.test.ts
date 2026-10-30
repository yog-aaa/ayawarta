import { describe, expect, it } from "vitest";
import { publishedFixture } from "./testing/published-fixture";
import {
  buildPublicationSnapshot,
  digestPublicationSnapshot,
  publicationMediaIds,
  verifyPublicationSnapshot,
} from "./publication-snapshot";

describe("publication snapshots", () => {
  it("captures the complete aggregate and pins every unique referenced asset", () => {
    const payload = publishedFixture();
    const snapshot = buildPublicationSnapshot(payload);

    expect(snapshot.invitation.slug).toBe("sample");
    expect(snapshot.sections.gallery).toBe(true);
    expect(snapshot.events[0].position).toBe(1);
    expect(snapshot.galleryItems[0]).toMatchObject({
      position: 1, altText: "Pasangan di taman", caption: null,
    });
    expect(publicationMediaIds(snapshot)).toEqual([
      "bride-photo", "gallery-photo", "groom-photo", "hero",
    ]);
    const digest = digestPublicationSnapshot(snapshot);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(verifyPublicationSnapshot(snapshot, digest, "inv-1", 1)).toBe(true);
  });

  it("rejects a digest-consistent but incomplete snapshot", () => {
    const complete = buildPublicationSnapshot(publishedFixture());
    const incomplete = { ...complete, events: undefined };
    expect(verifyPublicationSnapshot(incomplete, digestPublicationSnapshot(incomplete as unknown as typeof complete))).toBe(false);
  });

  it("detects content mutation, wrong owner, or missing pinned media", () => {
    const snapshot = buildPublicationSnapshot(publishedFixture());
    const digest = digestPublicationSnapshot(snapshot);
    expect(verifyPublicationSnapshot({ ...snapshot, invitation: { ...snapshot.invitation, slug: "changed" } }, digest)).toBe(false);
    expect(verifyPublicationSnapshot(snapshot, digest, "another-invitation", 1)).toBe(false);
    expect(verifyPublicationSnapshot({ ...snapshot, media: snapshot.media.slice(1) }, digestPublicationSnapshot({ ...snapshot, media: snapshot.media.slice(1) }))).toBe(false);
  });

  it("requires contiguous one-based ordering", () => {
    const payload = publishedFixture();
    payload.events[0].position = 2;
    expect(() => buildPublicationSnapshot(payload)).toThrow(/contiguous and 1-based/);
  });
});

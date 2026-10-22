import { describe, expect, it } from "vitest";
import {
  APPROVED_COUPLE_ROLES,
  APPROVED_INVITATION_SLUGS,
  buildAudioPublicId,
  buildCouplePublicId,
  buildGalleryPublicId,
  validateInvitationPublicId,
} from "./public-id";

describe("public-id", () => {
  describe("buildCouplePublicId", () => {
    it("generates deterministic public IDs for all approved slugs and roles", () => {
      for (const slug of APPROVED_INVITATION_SLUGS) {
        for (const role of APPROVED_COUPLE_ROLES) {
          const publicId = buildCouplePublicId(slug, role);
          expect(publicId).toBe(
            `ayawarta/production/invitations/${slug}/couple/${role}`
          );
          const validation = validateInvitationPublicId(publicId);
          expect(validation.valid).toBe(true);
        }
      }
    });

    it("throws on invalid slug or role", () => {
      // @ts-expect-error testing invalid slug
      expect(() => buildCouplePublicId("unknown-slug", "groom")).toThrow(
        /Invalid invitation slug/
      );
      // @ts-expect-error testing invalid role
      expect(() => buildCouplePublicId("rika-fauzi", "cousin")).toThrow(
        /Invalid couple role/
      );
    });
  });

  describe("buildGalleryPublicId", () => {
    it("generates zero-padded gallery IDs", () => {
      expect(buildGalleryPublicId("rika-fauzi", 1)).toBe(
        "ayawarta/production/invitations/rika-fauzi/gallery/gallery-01"
      );
      expect(buildGalleryPublicId("shidqi-mita", 12)).toBe(
        "ayawarta/production/invitations/shidqi-mita/gallery/gallery-12"
      );
    });

    it("throws on invalid position", () => {
      expect(() => buildGalleryPublicId("rika-fauzi", 0)).toThrow(
        /Gallery position must be an integer between 1 and 99/
      );
      expect(() => buildGalleryPublicId("rika-fauzi", -1)).toThrow(
        /Gallery position must be an integer between 1 and 99/
      );
      expect(() => buildGalleryPublicId("rika-fauzi", 100)).toThrow(
        /Gallery position must be an integer between 1 and 99/
      );
      expect(() => buildGalleryPublicId("rika-fauzi", 1.5)).toThrow(
        /Gallery position must be an integer between 1 and 99/
      );
    });
  });

  describe("buildAudioPublicId", () => {
    it("generates audio public IDs with defaults or custom items", () => {
      expect(buildAudioPublicId("dudi-aini")).toBe(
        "ayawarta/production/invitations/dudi-aini/audio/background-music"
      );
      expect(buildAudioPublicId("dudi-aini", "track-01")).toBe(
        "ayawarta/production/invitations/dudi-aini/audio/track-01"
      );
    });

    it("throws on invalid item name", () => {
      expect(() => buildAudioPublicId("dudi-aini", "bad_name!")).toThrow(
        /Invalid audio item name/
      );
    });
  });

  describe("validateInvitationPublicId", () => {
    it("accepts valid couple, gallery, audio, and video public IDs", () => {
      const validCases = [
        "ayawarta/production/invitations/rika-fauzi/couple/groom",
        "ayawarta/production/invitations/rika-fauzi/couple/bride",
        "ayawarta/production/invitations/rika-fauzi/couple/hero",
        "ayawarta/production/invitations/shidqi-mita/gallery/gallery-01",
        "ayawarta/production/invitations/dudi-aini/audio/background-music",
        "ayawarta/production/invitations/default-preview/gallery/gallery-06",
      ];

      for (const id of validCases) {
        const result = validateInvitationPublicId(id);
        expect(result.valid).toBe(true);
      }
    });

    it("rejects path traversal (..)", () => {
      const result = validateInvitationPublicId(
        "ayawarta/production/invitations/rika-fauzi/couple/../hero"
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toMatch(/path traversal/);
      }
    });

    it("rejects backslashes", () => {
      const result = validateInvitationPublicId(
        "ayawarta\\production\\invitations\\rika-fauzi\\couple\\hero"
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toMatch(/backslashes/);
      }
    });

    it("rejects leading slash", () => {
      const result = validateInvitationPublicId(
        "/ayawarta/production/invitations/rika-fauzi/couple/hero"
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toMatch(/leading slash/);
      }
    });

    it("rejects trailing slash", () => {
      const result = validateInvitationPublicId(
        "ayawarta/production/invitations/rika-fauzi/couple/hero/"
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toMatch(/trailing slash/);
      }
    });

    it("rejects double slashes and empty segments", () => {
      const result = validateInvitationPublicId(
        "ayawarta/production/invitations//couple/hero"
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toMatch(/empty segments or consecutive slashes/);
      }
    });

    it("rejects query parameters or hash fragments", () => {
      expect(
        validateInvitationPublicId(
          "ayawarta/production/invitations/rika-fauzi/couple/hero?v=1"
        ).valid
      ).toBe(false);
      expect(
        validateInvitationPublicId(
          "ayawarta/production/invitations/rika-fauzi/couple/hero#heading"
        ).valid
      ).toBe(false);
    });

    it("rejects non-approved slug", () => {
      const result = validateInvitationPublicId(
        "ayawarta/production/invitations/fake-wedding/couple/hero"
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toMatch(/not an approved invitation slug/);
      }
    });

    it("rejects non-approved category", () => {
      const result = validateInvitationPublicId(
        "ayawarta/production/invitations/rika-fauzi/decor/flowers"
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toMatch(/not an approved media category/);
      }
    });

    it("rejects non-approved couple role", () => {
      const result = validateInvitationPublicId(
        "ayawarta/production/invitations/rika-fauzi/couple/friend"
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toMatch(/Couple item 'friend' must be one of/);
      }
    });

    it("rejects malformed gallery items", () => {
      expect(
        validateInvitationPublicId(
          "ayawarta/production/invitations/rika-fauzi/gallery/gallery-1"
        ).valid
      ).toBe(false);
      expect(
        validateInvitationPublicId(
          "ayawarta/production/invitations/rika-fauzi/gallery/photo-01"
        ).valid
      ).toBe(false);
      expect(
        validateInvitationPublicId(
          "ayawarta/production/invitations/rika-fauzi/gallery/gallery-00"
        ).valid
      ).toBe(false);
    });

    it("rejects empty, non-string, or whitespace-only inputs", () => {
      expect(validateInvitationPublicId("").valid).toBe(false);
      // @ts-expect-error testing non-string
      expect(validateInvitationPublicId(null).valid).toBe(false);
      // @ts-expect-error testing non-string
      expect(validateInvitationPublicId(undefined).valid).toBe(false);
      expect(
        validateInvitationPublicId(
          " ayawarta/production/invitations/rika-fauzi/couple/hero "
        ).valid
      ).toBe(false);
    });
  });
});

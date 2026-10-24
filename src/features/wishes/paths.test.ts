import { describe, it, expect } from "vitest";
import {
  SLUG_REGEX,
  validateInvitationSlug,
  getWishesCollectionSegments,
  getWishesCollectionPath,
} from "./paths";

describe("Wishes Path and Slug Validation", () => {
  it("accepts valid kebab-case invitation slugs", () => {
    const validSlugs = [
      "rika-fauzi",
      "shidqi-mita",
      "dudi-aini",
      "default-preview",
      "wedding-2026",
      "john-doe-invitation",
      "celebration1",
    ];

    for (const slug of validSlugs) {
      expect(SLUG_REGEX.test(slug)).toBe(true);
      expect(validateInvitationSlug(slug)).toBe(slug);
      expect(getWishesCollectionSegments(slug)).toEqual([
        "wishes",
        slug,
        "messages",
      ]);
      expect(getWishesCollectionPath(slug)).toBe(`wishes/${slug}/messages`);
    }
  });

  it("proves read and write collection path segments are centralized and identical", () => {
    const slug = "rika-fauzi";
    const readSegments = getWishesCollectionSegments(slug);
    const writeSegments = getWishesCollectionSegments(slug);

    expect(readSegments).toEqual(["wishes", "rika-fauzi", "messages"]);
    expect(writeSegments).toEqual(["wishes", "rika-fauzi", "messages"]);
    expect(readSegments).toEqual(writeSegments);
  });

  it("rejects invalid slugs: empty or whitespace", () => {
    expect(() => validateInvitationSlug("")).toThrow(
      /slug cannot be empty/i
    );
    expect(() => validateInvitationSlug("   ")).toThrow(
      /slug cannot be empty/i
    );
  });

  it("rejects invalid slugs: non-string inputs", () => {
    // @ts-expect-error test invalid type
    expect(() => validateInvitationSlug(null)).toThrow(/must be a string/i);
    // @ts-expect-error test invalid type
    expect(() => validateInvitationSlug(undefined)).toThrow(/must be a string/i);
    // @ts-expect-error test invalid type
    expect(() => validateInvitationSlug(123)).toThrow(/must be a string/i);
  });

  it("rejects invalid slugs: path traversal and slashes", () => {
    expect(() => validateInvitationSlug("../traversal")).toThrow(
      /cannot contain slashes or directory traversal/i
    );
    expect(() => validateInvitationSlug("wishes/hack")).toThrow(
      /cannot contain slashes or directory traversal/i
    );
    expect(() => validateInvitationSlug("hack\\back")).toThrow(
      /cannot contain slashes or directory traversal/i
    );
  });

  it("rejects invalid slugs: uppercase and special characters", () => {
    expect(() => validateInvitationSlug("Rika-Fauzi")).toThrow(
      /does not match required kebab-case/i
    );
    expect(() => validateInvitationSlug("rika_fauzi")).toThrow(
      /does not match required kebab-case/i
    );
    expect(() => validateInvitationSlug("rika@fauzi")).toThrow(
      /does not match required kebab-case/i
    );
    expect(() => validateInvitationSlug("rika fauzi")).toThrow(
      /does not match required kebab-case/i
    );
    expect(() => validateInvitationSlug("-leading-dash")).toThrow(
      /does not match required kebab-case/i
    );
    expect(() => validateInvitationSlug("trailing-dash-")).toThrow(
      /does not match required kebab-case/i
    );
  });
});

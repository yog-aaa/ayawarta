export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateInvitationSlug(slug: string): string {
  if (typeof slug !== "string") {
    throw new Error("Invalid invitation slug: slug must be a string.");
  }
  const trimmed = slug.trim();
  if (!trimmed) {
    throw new Error("Invalid invitation slug: slug cannot be empty.");
  }
  if (trimmed.includes("/") || trimmed.includes("\\") || trimmed.includes("..")) {
    throw new Error(
      "Invalid invitation slug: slug cannot contain slashes or directory traversal."
    );
  }
  if (!SLUG_REGEX.test(trimmed)) {
    throw new Error(
      `Invalid invitation slug: "${slug}" does not match required kebab-case format.`
    );
  }
  return trimmed;
}

export function getWishesCollectionSegments(
  slug: string
): [string, string, string] {
  const validatedSlug = validateInvitationSlug(slug);
  return ["wishes", validatedSlug, "messages"];
}

export function getWishesCollectionPath(slug: string): string {
  const [root, slugSegment, sub] = getWishesCollectionSegments(slug);
  return `${root}/${slugSegment}/${sub}`;
}

import type {
  DerivedImageValidationResult,
  ImageResolver,
} from "../image-resolution";
import type { InvitationSlug } from "../types";

export function createFixtureImageResolver(): ImageResolver {
  return {
    resolveDerivedHero(slug: InvitationSlug) {
      if (slug === "rika-fauzi") {
        return {
          sourceLocation: ".media-migration/input/images/rika-fauzi-hero.jpg",
          byteSize: 4151481,
          targetPublicId: "ayawarta/production/invitations/rika-fauzi/couple/hero",
          width: 3877,
          height: 5816,
          sha256:
            "9A268A4EEA90EAC96F4180D3AF0B121121DD4D32A17FD30484460A0752B3BC77",
        };
      }
      return null;
    },
  };
}

export function createFixtureImageValidator(): (
  rawPath: string,
  options?: { repoRoot?: string }
) => DerivedImageValidationResult {
  return (rawPath: string): DerivedImageValidationResult => {
    if (rawPath.includes("rika-fauzi-hero.jpg")) {
      return {
        valid: true,
        posixRelativePath: ".media-migration/input/images/rika-fauzi-hero.jpg",
        absolutePath: "/virtual/repo/.media-migration/input/images/rika-fauzi-hero.jpg",
        byteSize: 4151481,
        sha256:
          "9A268A4EEA90EAC96F4180D3AF0B121121DD4D32A17FD30484460A0752B3BC77",
      };
    }
    return {
      valid: false,
      reason: `Unknown fixture image source: ${rawPath}`,
    };
  };
}

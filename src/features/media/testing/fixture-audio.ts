import type {
  AudioResolver,
  AudioValidationResult,
  LocalAudioSlug,
  validateLocalAudioSource,
} from "../audio-resolution";
import {
  LOCAL_AUDIO_DESCRIPTORS,
  LOCAL_AUDIO_INPUT_DIR,
} from "../audio-resolution";

/**
 * Creates a hermetic fixture AudioResolver for unit tests.
 * Resolves the three approved invitation audio inputs without touching disk
 * or depending on uncommitted/ignored operator files.
 */
export function createFixtureAudioResolver(): AudioResolver {
  const fixtureMap = new Map(
    LOCAL_AUDIO_DESCRIPTORS.map((d) => [
      d.slug,
      {
        sourceLocation: d.relativeSourcePath,
        byteSize: d.expectedByteSize,
        sha256: d.expectedSha256,
        targetPublicId: d.targetPublicId,
      },
    ])
  );

  return {
    resolveAudio: (slug: LocalAudioSlug) => {
      const data = fixtureMap.get(slug);
      if (!data) {
        throw new Error(`No fixture audio found for slug: ${slug}`);
      }
      return data;
    },
  };
}

/**
 * Creates a hermetic fixture audio validator function for offline dry-run verification tests.
 * Validates against approved descriptors without reading physical files from disk.
 */
export function createFixtureAudioValidator(): typeof validateLocalAudioSource {
  return (localSourcePath, options): AudioValidationResult => {
    const descriptor =
      options?.descriptor ??
      LOCAL_AUDIO_DESCRIPTORS.find(
        (d) =>
          d.relativeSourcePath === localSourcePath ||
          `${LOCAL_AUDIO_INPUT_DIR}/${d.fileName}` === localSourcePath
      );

    if (!descriptor) {
      return {
        valid: false,
        reason: `No fixture audio descriptor found for path: ${localSourcePath}`,
      };
    }

    if (descriptor.relativeSourcePath !== localSourcePath) {
      return {
        valid: false,
        reason: `Fixture path mismatch: expected '${descriptor.relativeSourcePath}', got '${localSourcePath}'`,
      };
    }

    return {
      valid: true,
      posixRelativePath: descriptor.relativeSourcePath,
      absolutePath: `/fixture/${descriptor.relativeSourcePath}`,
      byteSize: descriptor.expectedByteSize,
      sha256: descriptor.expectedSha256,
    };
  };
}

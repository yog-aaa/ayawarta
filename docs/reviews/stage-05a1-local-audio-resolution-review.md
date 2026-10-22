# Stage 5A.1 — Resolve Local Audio Inputs Review

## Status

`ACCEPTED FOR COMMIT`

## Review Scope

The implementation was reviewed against the approved Stage 5A.1 prompt, the accepted Stage 5A manifest, the three operator-provided MP3 descriptors, and the requirement that default unit tests remain independent of ignored operator files.

The production mapping is otherwise consistent. The amendment produces 31 physical assets, 37 logical usages, 15 local sources, 16 old-Cloudinary sources, 27 images, four audio assets, zero video assets, zero unresolved music blockers, and four explicit heroes. The intentionally identical `shidqi-mita` and `default-preview` MP3s retain distinct slug-scoped target public IDs. No upload, remote download, database mutation, route cutover, or file deletion occurred.

## Blocking Finding

### AUDIO-01 — Default unit-test suite still depends on ignored operator MP3s

The Stage 5A.1 prompt requires `pnpm test` to be hermetic and explicitly says it must not depend on the operator's ignored audio files. That boundary is not currently met:

- `scripts/data/invitation-media-manifest.test.ts` creates its shared manifest with `generateMediaManifest({ repoRoot })`, so the default `DefaultLocalAudioResolver` reads and hashes the three real files from `.media-migration/input/audio/`.
- Additional determinism/report tests in the same unit-test file also call the default resolver instead of the injected fixture resolver.
- `src/features/media/audio-resolution.test.ts` includes the real-file check inside the default unit-test suite and silently skips it when the files are missing. This neither keeps `pnpm test` independent of those files nor provides a separately invokable, fail-closed local-input gate.

The 214 tests pass on the current workstation only because the three ignored MP3s are present. A clean checkout or CI worker without those operator files will fail in the manifest unit tests before the conditional real-file test can be skipped.

Make every default unit-test manifest build inject a fixture `AudioResolver`. Move the real-file validation out of the default Vitest suite into a separate explicit integration/local-input command. That command must validate all three real descriptors and fail when any required file is absent or invalid; it must not silently skip. Keep the production dry-run and offline verifier using the real resolver by default.

## Evidence Correction

The handoff lists the Dudi/Aini source as `.../v1727768565/sound/sound_kfg0u4.mp3`, but the current production source remains `https://res.cloudinary.com/doig3gwek/video/upload/v1764532212/lagu_ruirls.mp3` in `src/lib/invitations.ts`. The manifest continues to read that current value, so this is a handoff-reporting error rather than a code/data mutation. Correct it in the next handoff.

## Independent Verification

- `pnpm test`: PASS — 214/214 on the current workstation, but not hermetic for the reason above.
- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS — zero errors and the two previously approved warnings.
- `pnpm build`: PASS.
- Two sequential default `pnpm media:dry-run` executions: PASS — identical SHA-256 `0D08737525BD20D7E9D3CC36EEF0D985253344478022B4FEA611555F38479C7F`.
- `pnpm media:verify`: PASS — 31 physical assets, 37 usages, 15 local files, 16 remote URLs, four heroes, three local audio inputs, one remote audio input, zero blockers, and zero collisions.
- Live execution guard: PASS — `--execute` returned exit code 1 without upload.
- `git diff --check`: PASS.
- External effects: none.

## Required Correction Handoff

Return the implementation uncommitted with `AUDIO-01` mapped to the correction. Report the exact command used for the separate local-input gate and prove both boundaries:

1. `pnpm test` passes without reading or requiring `.media-migration/input/audio/`.
2. The separate local-input command fails closed when inputs are missing and passes against all three operator MP3s with the approved sizes and hashes.

Repeat the existing Stage 5A.1 verification matrix, retain the canonical report hash unless an intentional canonical representation change is justified, correct the Dudi/Aini source URL in the handoff, and do not commit or start Stage 5B.

## Correction Review

`AUDIO-01` is closed.

All manifest and report-verifier unit-test paths now inject shared fixture audio dependencies. The default `pnpm test` suite no longer reads or requires `.media-migration/input/audio/`. The former conditional real-file check was removed, and `pnpm media:verify-audio` is now the explicit fail-closed operator-input gate. The gate exits nonzero when its required directory is missing and validates all three canonical descriptors when the inputs are present.

The corrected handoff also identifies the current Dudi/Aini source accurately as `https://res.cloudinary.com/doig3gwek/video/upload/v1764532212/lagu_ruirls.mp3`.

### Final Independent Verification

- `pnpm test`: PASS — 215/215 hermetic tests.
- `pnpm media:verify-audio`: PASS — 3/3 operator MP3s matched the approved sizes, hashes, signatures, paths, and public IDs.
- Fail-closed audio-gate check with a nonexistent input directory: PASS — exit code 1 with a controlled missing-directory error.
- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS — zero errors and the two previously approved warnings.
- `pnpm build`: PASS.
- Two sequential default `pnpm media:dry-run` executions: PASS — identical SHA-256 `0D08737525BD20D7E9D3CC36EEF0D985253344478022B4FEA611555F38479C7F`.
- `pnpm media:verify`: PASS — 31 physical assets, 37 usages, 15 local files, 16 remote URLs, four heroes, three local audio inputs, one remote audio input, zero blockers, and zero collisions.
- Live execution guard: PASS — exit code 1 without upload.
- `git diff --check`: PASS.
- Credential scan: PASS.
- External effects: none.

### Commit Authorization

Commit only the approved Stage 5A.1 implementation paths together with this review document. Do not include `.media-migration`, MP3 binaries, environment files, credentials, lockfiles, generated build output, or unrelated files. Re-run the fast verification and staged-file/credential checks after staging, then report the exact committed paths and commit hash.

Acceptance of Stage 5A.1 does not authorize Stage 5B or any Cloudinary upload.

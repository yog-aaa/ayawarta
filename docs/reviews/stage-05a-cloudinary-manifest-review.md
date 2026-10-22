# Stage 5A — Cloudinary Manifest and Dry Run Review

## Status

`CHANGES REQUIRED`

## Review Scope

The implementation was reviewed against `docs/media-migration.md`, the approved Stage 5A prompt, the Phase 5 implementation plan, the current invitation source data, and the generated offline report.

The inventory itself is correct: 28 physical assets, 34 logical usages, 12 local sources, 16 old-Cloudinary sources, four explicit heroes, one Dudi/Aini audio asset, and three unresolved YouTube music sources. No upload, remote download, database mutation, application cutover, or file deletion occurred.

## Blocking Findings

### MEDIA-01 — Local path validation occurs after normalization and does not prove real-path containment

`validateLocalSource` calls `path.join` before looking for `..`. Because `path.join` normalizes traversal segments, an input such as `/images/SAMPLE/../dummy-couples/groom.jpg` becomes an approved path and is accepted even though the Stage 5A contract requires all traversal input to be rejected. Prefix checks with `startsWith` are also not path-boundary checks, and `statSync` follows a symlink or junction without confirming that its real target remains in an approved source root.

Reject traversal, backslashes, absolute/drive paths, null bytes, and empty segments from the raw input before normalization. Resolve both the candidate and approved roots with `realpath`, then use `path.relative` or an equivalent boundary-safe comparison to prove the final file stays inside one exact approved root. Add tests for normalized traversal, sibling-prefix paths, symlink/junction escape where supported, and both approved roots.

### MEDIA-02 — Offline verification does not enforce manifest referential integrity

The verifier checks counts, public-ID syntax, file sizes, heroes, gallery ordering, and alt-text presence, but it never proves that every logical usage references an existing physical asset. It also does not verify unique usage IDs, `PhysicalAsset.id === targetPublicId`, consistency of `reusedInUsages`, slug ownership, usage/category/role compatibility, or recompute summary values from the arrays. A report can therefore be edited so a usage points to a nonexistent or wrong asset and still pass if the top-level counts remain unchanged.

Make the verifier distrust the serialized report. Recompute all counts and per-slug summaries, validate unique asset and usage identifiers, require every logical target to resolve to exactly one physical asset, require every physical `reusedInUsages` list to exactly match reverse references, validate slug/category/role/position semantics, and validate the exact unresolved-music slug set. Reuse the hardened local and remote source validators rather than maintaining weaker duplicate checks. Add mutation tests proving each corrupted relation or summary causes verification failure.

### MEDIA-03 — The claimed deterministic report changes on every run

`buildDryRunReport` assigns `new Date().toISOString()`. The manifest is deterministic, but the full generated report is not, while the approved contract explicitly requires deterministic dry-run output. The current test only compares two manifests and does not compare complete reports.

Inject the clock/timestamp into report generation and test complete report equality with a fixed clock. If runtime generation time remains useful, keep it as explicit non-canonical metadata and define/test a deterministic canonical payload separately.

### MEDIA-04 — CLI report output is not confined to the ignored report directory

The CLI accepts an arbitrary `--output-dir` and resolves it directly against the repository root. It can therefore write the report outside `.media-migration`, including into tracked project locations or outside the repository. Adding the broad root ignore `/output/` also hides an unrelated directory and is unnecessary for the documented report path.

Confine normal CLI output to the dedicated `.media-migration` directory and prove containment with a boundary-safe path check. Dependency injection may still provide a temporary test directory, but the user-facing CLI must reject absolute paths, traversal, and destinations outside the approved report root. Remove `/output/` from `.gitignore` unless a documented project artifact genuinely requires it. Add negative CLI tests.

### MEDIA-05 — Remote allowlist accepts credential-bearing or decorated URLs

The host and account path are checked, but URLs containing `username`, `password`, a non-default port, query parameters, or fragments are still accepted and copied into logs/reports. That weakens both the allowlist and the credential-free report claim.

Reject URL userinfo, unexpected ports, search parameters, and fragments for executable Cloudinary sources, and use the same validator in the offline verifier. Add corresponding tests.

## Independent Verification

- `pnpm test`: PASS — 143/143 tests.
- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS — zero errors and the two previously approved warnings.
- `pnpm build`: PASS.
- `pnpm media:dry-run`: PASS — reported 28 physical assets and 34 logical usages.
- `pnpm media:verify`: PASS under the current incomplete verification contract.
- Live execution guard: PASS — `--execute` returned exit code 1 without upload.
- `git diff --check`: PASS.

## Required Correction Handoff

Return the implementation uncommitted with a mapping from `MEDIA-01` through `MEDIA-05` to the correction and tests. Repeat all Stage 5A checks. Explicitly include negative-test evidence for traversal before normalization, real-path containment, tampered report references, tampered summaries, full-report determinism, output-path escape, and decorated remote URLs.

Stage 5B remains blocked. The three unresolved YouTube music sources also remain a separate product/data decision after Stage 5A implementation quality is accepted.

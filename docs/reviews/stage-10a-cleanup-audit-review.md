# Stage 10A — Cleanup Gate and Dependency Audit Review

Status: CHANGES REQUIRED — evidence classification only. No cleanup approved.

The read-only audit correctly identified the 14 tracked candidate files (12 media files plus two legacy data modules), totaling 12,074,741 bytes, and the critical transitive dependency from the seed report reader to the old media manifest. The reported verification leaves the worktree clean. These findings are sufficient to establish that direct deletion is unsafe and Stage 10B decoupling is necessary.

## Findings

### CLEAN-01 — Required audio playback gate remains unproven

`docs/media-migration.md` says audio **works** for `dudi-aini`. The identity report proves byte equality and the route smoke test proves page markup, but neither proves that a browser loads, decodes, and plays the audio. Record this mandatory gate as `UNPROVEN`, with delivery and byte identity as supporting sub-evidence. Do not infer cleanup approval from a successful `<audio>` render. Specify the browser/manual playback check needed before Stage 10C.

### CLEAN-02 — Command-survival verdicts need conditional evidence

The matrix treats some commands as unconditionally surviving deletion. `media:verify-upload` needs the ignored upload report; `media:verify-audio` needs ignored operator MP3 files; `seed:verify` needs an already-seeded reachable database; and route smoke tests need a running server/database. Distinguish (a) this machine with ignored artifacts and seeded local DB from (b) a fresh checkout intended for future Aiven bootstrap. `pnpm build` cannot be marked `SURVIVES` merely because runtime routes avoid old data: `tsconfig.json` includes all TypeScript files, and the old manifest would have a missing import. Treat post-deletion build as `UNPROVEN` or expected to fail until decoupling is demonstrated. Conversely, do not assert `pnpm lint` definitely fails from an unresolved import without a matching effective lint rule or a safe proof.

### CLEAN-03 — Gate status and provenance must be singular

The active-source/tooling/test stale-reference gate is `FAIL` while operational media tooling and tests still reference old local assets and Cloudinary sources; retained historical documentation is not an active dependency, and a passing public-route subset does not make this gate pass. The Stage 6 review explicitly records at line 18 that two seed runs were *reported* with identical 82-row counts; cite this as historical accepted evidence, not as a result of the current `seed:verify`, and use `UNPROVEN` if the underlying run evidence cannot be identified. Attribute the content-identity GET audit to the accepted historical Stage 5B evidence; the current upload verifier checks its report offline. A read-only `prisma migrate status` may corroborate the local migration gate, but an accepted historical migration record can support `PASS` with its provenance stated.

## Required correction

Issue a revised Stage 10A handoff containing a single PASS/FAIL/UNPROVEN value per mandatory gate, an evidence-provenance column (current check versus previously accepted artifact), and a two-environment command-survival matrix. If the original handoff is unavailable to the correcting agent, reconstruct from repository evidence and label unavailable historical checks `UNPROVEN`; never invent command results. No source, database, Cloudinary, or file deletion changes. The Stage 10C reviewer-approval gate remains `UNPROVEN` until the exact deletion inventory is approved after Stage 10B. Stage 10B may be planned, but not executed as part of this correction.

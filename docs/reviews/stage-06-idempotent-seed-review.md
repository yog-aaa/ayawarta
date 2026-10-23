# Stage 6 — Idempotent Local Seed Review

## Status

`ACCEPTED — READY FOR FINALIZATION COMMIT`

Stage 6.1 resolves the four original findings at implementation level: all writes now share one transaction, the seed CLI has a local-only target guard, the upload report is reconciled with the canonical manifest, and wedding timestamps are explicit WIB instants. Independent verification passed 344 unit tests, 9 live database tests, typecheck, lint, production build, and reconstruction of the expected 82 local rows.

Stage 6.3 closes the final proof-integrity findings. All seed, local-target, report-reconciliation, rollback, timestamp, and verification boundaries are now accepted. Stage 7 may begin only after the accepted Stage 6 changes are committed cleanly.

## Accepted Results

- Four explicit invitation definitions preserve the current customer-facing text, section flags, event strings, stories, gifts, gallery reuse, and `default-preview` gallery video.
- Media relations use the intended Cloudinary public IDs, including first-class hero and music relations.
- Empty legacy gallery video values are normalized to `null`; the mapper preserves the existing empty-string domain behavior.
- Ordered child collections are replaced deterministically and repository lookup still returns `null` for an unknown slug.
- Administrator bootstrap is idempotent and uses the existing secure Auth implementation.
- The reported first and second runs both produced 82 rows with identical counts.

## Blocking Findings

### SEED-01 — The production dataset is not committed atomically

`executeSeed()` upserts all `MediaAsset` records outside a transaction and then opens one separate transaction per invitation. If media resolution, the third invitation, or admin bootstrap fails, earlier writes remain committed. The missing-hero unit test demonstrates the structural problem: media upserts occur before the invariant failure, but the test only asserts the thrown error and never proves rollback.

Run the owned Stage 6 dataset in one outer interactive transaction: media upserts, media lookup, four invitation parents and child replacements, and preferably the administrator upsert. `seedSingleInvitation` must accept the transaction client instead of opening nested transactions. Add fault-injection tests proving a failure after media writes and a failure during a later invitation leave the pre-seed state unchanged.

### SEED-02 — The seed CLI has no fail-closed local database target guard

`prisma/seed.ts` loads `DATABASE_URL` and immediately imports the Prisma client. Nothing rejects Aiven, another host, another port, or another database name. An accidental `pnpm prisma:seed` with production environment variables would execute the local-only Stage 6 mutation against production.

Before importing or connecting Prisma, parse `DATABASE_URL` without logging credentials and require PostgreSQL on `localhost`, `127.0.0.1`, or `::1`, port `5432`, database `ayawarta`. Apply the same guard to `seed:verify`. Add hermetic tests for the approved URL and rejection of Aiven/non-local hosts, wrong ports, wrong database names, malformed URLs, and sanitized error output.

### SEED-03 — The seed reader trusts counts and summary claims instead of the canonical media set

`readValidatedUploadReport()` applies the Zod shape and checks length, summary hero/audio counts, and non-null URLs, but it does not recompute the summary, reject duplicate/substituted public IDs, validate delivery URL ownership, or reconcile the exact 31 records with the canonical manifest. `mapUploadAssetToMediaAssetInput()` also converts missing byte metadata to zero. A tampered report can therefore seed unrelated URLs or incomplete metadata while still satisfying the superficial counters.

Reuse or extract the hardened Stage 5B verification/reconciliation contract. Require target cloud `uhwi7xvb`, exact unique canonical public IDs, matching slug/category/resource type/source metadata, successful status, strict delivery URLs, positive bytes, valid image dimensions, and exact 4/4 hero/audio mappings before any database transaction begins. Unit tests must actually invoke this validation; the current 30-asset test only checks that an array was shortened.

### SEED-04 — Canonical wedding timestamps depend on the machine timezone

The seed definitions construct dates from strings such as `new Date("2025-09-07T08:00:00")` without an offset. The same seed run under Asia/Jakarta and UTC produces different stored instants, making future Aiven/Vercel seeding nondeterministic. Preserve the current intended WIB wall-clock values with explicit `+07:00` offsets and test their exact ISO instants.

## Stage 6.1 Correction Assessment

`SEED-01` through `SEED-04` are accepted as corrected. The remaining findings below were discovered while reviewing the correction proof.

### SEED-05 — `seed:verify` imports Prisma before the local-target guard

`verifySeed()` contains the guard before its own dynamic Prisma import, but `main()` imports `@/lib/server/db` first solely to obtain the disconnect handle. Therefore the CLI entry path violates the required ordering even though the first query happens later. Refactor the entry point so the guard succeeds before any Prisma module import. Keep disconnect cleanup guaranteed after the guarded import.

Add a hermetic module-boundary test that proves an invalid/non-local `DATABASE_URL` rejects without evaluating the Prisma/database module. Do not rely only on source-text inspection.

### SEED-06 — Rollback integration tests compare counts, not database state

Both fault-injection tests snapshot only nine row counts. On the already-seeded database, media upserts can update rows and invitation replacement can delete/recreate children while producing identical counts. Those tests would therefore pass even if the transaction boundary were broken.

Create a deterministic, credential-free content snapshot before and after each injected failure and compare it byte-for-byte or structurally. Include stable identifiers and persisted values for all nine tables, including `updatedAt` where relevant; sort rows and nested results deterministically. The proof must detect updated media rows and replaced child IDs, not just inserted/deleted counts. Keep the tests constrained by the local database guard.

### SEED-07 — A valid target-cloud URL is not bound to its report `targetPublicId`

The reader validates HTTPS, host, cloud name, and URL decorations, but it never proves that the delivery path resolves to the record's own `targetPublicId`. Swapping two otherwise valid `uhwi7xvb` URLs in the upload report still passes reconciliation and can seed the wrong image/audio relation.

Parse the Cloudinary delivery path safely and require its resource type and decoded public-ID path (excluding optional transformation/version and file extension) to match the record's canonical `resourceType` and `targetPublicId`. Reject encoded traversal or ambiguous path segments. Add mutation tests that swap two valid URLs, substitute another approved public ID, change resource type, omit or forge a version segment, and use percent-encoded path tricks. Preserve valid production URLs already present in the approved report.

## Stage 6.2 Correction Assessment

`SEED-05` through `SEED-07` are substantially corrected: the guarded import boundary is testable, rollback assertions now compare full structures, and delivery URLs are bound to canonical resource/public-ID paths. Two final false-proof paths remain.

### SEED-08 — Snapshot SHA-256 omits every nested row field

`computeSnapshotDigest()` calls `JSON.stringify(snapshot, Object.keys(snapshot).sort())`. A JSON replacer array applies at every nesting level, so only the nine root table names are retained and every row becomes `{}`. Two databases with the same per-table row counts but entirely different IDs and values produce the same digest. The accompanying structural equality assertion currently prevents the rollback test from becoming ineffective, but the digest function and its claimed evidence are incorrect and unsafe for reuse.

Serialize the already deterministic snapshot without that replacer, or use a recursive canonical JSON serializer that sorts keys at every depth without dropping them. Add a hermetic test proving that changing one nested value while preserving every row count changes the digest, while semantically identical snapshots retain the same digest.

### SEED-09 — URL extension is checked against untrusted report format

The report reader passes `asset.format` into `validateCloudinaryAssetBinding()` as `expectedFormat`, but both the extension and `asset.format` come from the same untrusted report. An attacker can change a canonical JPG record to `format: "png"` and change its URL suffix to `.png`; both values agree and the report passes even though the canonical manifest still says JPG.

First require `asset.format` to equal `canonical.format` using the intended JPG/JPEG normalization rule if necessary, then pass the canonical format into the URL binding validator. Add a production-reader mutation test that changes both report format and URL extension together and prove it fails before the transaction.

## Stage 6.3 Final Acceptance

- `SEED-08` is resolved with recursive key canonicalization that retains every nested field. Ten hermetic tests prove content sensitivity and deterministic equality across object key order.
- `SEED-09` is resolved by reconciling report format against canonical manifest format before URL validation and by passing `canonical.format` into the URL binding validator. Simultaneous report-format and extension tampering is rejected.
- Both live fault-injection scenarios retain full structural equality and identical content-sensitive SHA-256 snapshots.
- No schema, customer content, canonical public ID, route, or external service state changed in Stage 6.3.

## Independent Verification

- `pnpm install --frozen-lockfile`: PASS with pnpm `10.34.7`.
- `pnpm test`: PASS — 381/381 across 20 test files.
- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS — 0 errors; only the two previously approved UI warnings.
- `pnpm build`: PASS — Next.js 16 compiled and generated all routes successfully.
- `pnpm test:db`: PASS — 9/9 across two integration files.
- `pnpm seed:verify`: PASS — 82 rows and four repository reconstructions verified.
- Worktree remains uncommitted as required.

## Decision

Stage 6, including corrections 6.1 through 6.3, is accepted. Finalize and commit the complete Stage 6 scope with message `feat: add idempotent invitation seed`. Do not make feature changes during finalization and do not begin Stage 7 in the same handoff.

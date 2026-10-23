# Stage 5B — Cloudinary Upload and Verification Review

## Status

`APPROVED — READY FOR FINALIZATION COMMIT`

Cloudinary target state is now complete: 31/31 expected public IDs are present on
`uhwi7xvb`, including four heroes and four audio assets. No further upload is
authorized or required for the corrections below unless a read-only identity
audit finds an actual mismatch.

## Review Scope

The Stage 5B implementation, ignored live-upload report, current worktree, and reported Cloudinary effects were reviewed against the approved Stage 5B prompt and final Stage 5A.1 manifest.

The partial result is internally consistent at the summary level: 28 assets were newly uploaded, two existing Rika/Fauzi portrait assets were accepted, and one required Rika/Fauzi hero failed. Four audio assets and three of four heroes are represented as successful. No database, route, deployment, deletion, or old-account mutation is reported.

Stage 6 remains blocked because every invitation requires a verified hero.

## Blocking Findings

### CLOUD-01 — Required Rika/Fauzi hero exceeds the target account image limit

`public/images/SAMPLE/FOTO - Couple.jpg` is a 3,877 × 5,816 JPEG containing 11,261,085 bytes with SHA-256 `ACCB84DEA196E0AF36ADBFA914867654965CBAA97CB9B2A798EFC382CA161776`. Cloudinary rejected it because the account limit is 10,485,760 bytes. The target public ID `ayawarta/production/invitations/rika-fauzi/couple/hero` is therefore absent and the upload verifier correctly fails.

Do not delete or replace the original source silently. Resolution requires an owner choice between increasing the Cloudinary account limit or approving a visually lossless/high-quality derived JPEG below the limit. If compression is chosen, retain the original, generate a deterministic migration input, record its size and hash, update the canonical manifest source contract, and visually compare the derived image before retrying only the missing deterministic target.

### CLOUD-02 — Post-upload verification does not query Cloudinary after upload

The code labels a section “Post-Upload” but builds verification counts from upload responses and preflight resources already held in memory. It never re-runs `getResourcesByIds` after the uploads. Therefore the reported 30 “verified” assets have not passed the required post-write Admin API read-back.

After uploading, query all 31 expected public IDs again, separated by Cloudinary resource type. Build final success records and hero/audio counts from that read-back, not from the upload response. A missing or mismatched read-back must fail the stage.

### CLOUD-03 — Existing-resource matching does not prove image identity

`verifyExistingAssetMatch` accepts an existing image when public ID, resource type, cloud-name substring, format, and nonzero byte size match. It does not compare expected bytes/dimensions for local images or a content fingerprint/prior verified metadata for remote assets. An unrelated JPEG under the expected public ID could therefore become `existing_verified`.

For local assets, at minimum require exact source byte size and expected image dimensions from a trusted manifest descriptor. Prefer a stable digest/Cloudinary `etag` comparison when available. For assets created by the partial run, reconcile the post-upload Admin API metadata with the prior report or a source-derived fingerprint before accepting them on retry. Treat any unprovable target as a conflict; do not overwrite or delete it automatically.

### CLOUD-04 — Partial report contains a false success statement and weak URL ownership checks

The report summary correctly says three of four heroes, but `externalEffects.details` says “Verified 4/4 explicit heroes and 4/4 audio assets.” Details must be generated from actual counters and the verifier must reject inconsistent claims.

Both upload matching and report verification use substring checks for target cloud ownership. Parse each delivery URL and require HTTPS, exact host `res.cloudinary.com`, no userinfo/custom port/query/fragment, and the exact target cloud name as the first path segment. Do not accept a cloud-name substring elsewhere in the URL.

## Independent Verification

- `pnpm test`: PASS — 229/229.
- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS — zero errors and two approved baseline warnings.
- `pnpm build`: PASS.
- `pnpm media:verify-upload`: FAIL as required — rejected the failed Rika/Fauzi hero and 3/4 hero count.
- Partial report summary: 31 expected, 28 uploaded, two existing, one failed, four audio, three heroes.
- Reported target: `uhwi7xvb`, distinct from old account `doig3gwek`.
- Local source and old Cloudinary assets remain undeleted.
- Database, route, Aiven, Vercel, and Firestore effects: none.

## Required Next Step

Do not commit, seed, cut over routes, or start Stage 6. Obtain the owner decision for the oversized hero, then implement the smallest remediation together with `CLOUD-02` through `CLOUD-04`. Retry must reuse the same 31 target public IDs, preserve the 30 existing resources, upload only the missing hero when the other targets are proven matching, perform a complete live read-back, and return a clean 31/31 report for review.

## Owner Decision

The owner approved high-quality automatic image compression. For the current migration, the original Rika/Fauzi JPEG must remain unchanged and a deterministic derived JPEG must be created under an ignored migration-input directory. The derived output becomes the canonical upload source for the same hero public ID and its reused gallery usage.

The compressor must be implemented as a reusable server-only primitive suitable for the future admin media-upload workflow. Stage 5B.1 must not add the admin upload UI, write media records, or expand into route/database work.

## Stage 5B.1 Correction Review

### Accepted results

- The derived Rika/Fauzi hero is 3,877 × 5,816 JPEG, 4,151,481 bytes, quality 95, with SHA-256 `9A268A4EEA90EAC96F4180D3AF0B121121DD4D32A17FD30484460A0752B3BC77`.
- The original remains unchanged at 11,261,085 bytes with SHA-256 `ACCB84DEA196E0AF36ADBFA914867654965CBAA97CB9B2A798EFC382CA161776`.
- Independent visual inspection found the same framing, orientation, and dimensions with no obvious visible degradation at normal review scale.
- Final ignored upload report SHA-256 is `03BE7F497480598C66FEC7BB88D8015C5071FDA2BE966ECA3AE8860EA928EAF2` and reports one upload, 30 existing verified, zero failures, 4/4 heroes, and 4/4 audio.
- Post-upload Admin API read-back is implemented and final records are rebuilt from the 31 live resources.
- Strict Cloudinary delivery URL parsing and dynamically generated result details are implemented.

### Remaining blocking findings

#### CLOUD-05 — Derived-image generation is not connected to the production CLI

`ensureDerivedHeroImage()` exists, but `scripts/migrate-invitation-media.ts` never imports or calls it. Both dry-run and execute flows ask `DefaultLocalImageResolver` for the expected descriptor and then generate the manifest. The resolver returns hard-coded size/hash metadata without checking that the ignored derived file exists or still matches it. A fresh checkout or a deleted/tampered `.media-migration/input/images/rika-fauzi-hero.jpg` can therefore pass manifest generation and fail later or produce a misleading dry-run.

Wire an explicit preparation/validation step before manifest generation in the real CLI. Missing derived input must be regenerated deterministically from the verified original; a generated output whose bytes/hash/dimensions differ from the pinned descriptor must fail closed. Add tests for missing, valid, and tampered derived output. Dependency-injected test resolvers must remain hermetic.

#### CLOUD-06 — Remote `existing_verified` identity is still unproven

`verifyExistingAssetMatch()` performs exact byte/dimension checks for selected local sources, but every remote source falls through after public ID, resource type, URL ownership, nonzero bytes, and format checks. The partial report required by `CLOUD-03` is not consumed or reconciled, and a different remote JPEG with the same target public ID and format would still be accepted.

Add a read-only content-identity audit. For remote sources, compute a bounded streaming SHA-256 of the allowlisted old source and the strict target delivery URL and require equality. Apply equivalent source-versus-target digest verification to local assets where delivery bytes are stable. Redirects must be disabled or each redirect target must be revalidated. Persist only safe hashes/byte counts, never credentials. Any mismatch blocks acceptance without overwrite or deletion.

#### CLOUD-07 — The reusable image primitive can return an oversized PNG/WebP

`prepareImage()` advertises JPEG, PNG, and WebP support, but `needsRecompression` is true only for JPEG. Oversized PNG/WebP inputs enter the normal branch and are returned without checking the final buffer against `targetMaxBytes`. This violates the size-safety contract expected by the future admin upload pipeline.

Always enforce the postcondition `0 < output.byteSize <= targetMaxBytes`. Either implement deterministic bounded preparation for PNG/WebP or reject oversized non-JPEG inputs with a clear fail-closed error until that support is intentionally added. Test both formats at and above the configured limit.

#### CLOUD-08 — Deterministic processor dependency and server boundary are not enforced

The descriptor pins exact output bytes/hash, but `package.json` declares `sharp` with a caret range. A future lockfile refresh may upgrade Sharp/libvips and change deterministic output. The modules also describe themselves as server-only but do not import the repository's `server-only` guard.

Pin `sharp` exactly to `0.35.5`, regenerate the pnpm lockfile, and add `import "server-only"` to the runtime image-processing/resolution boundary. Tests may continue using the existing Vitest `server-only` alias.

### Review decision

Stage 5B external migration is operationally complete, but Stage 5B.1 is not approved for commit. Complete `CLOUD-05` through `CLOUD-08`, perform only read-only Cloudinary/source verification, and return for review. Stage 6 remains paused until this implementation correction is accepted.

## Stage 5B.2 Correction Review

### Accepted results

- The production CLI now runs `ensureDerivedHeroImage()` before either manifest path. Missing and tampered derived inputs are regenerated from the pinned original, while a valid output is reused without a rewrite.
- The default image resolver validates the real derived file. The original and derived byte size, dimensions, and SHA-256 descriptors remain unchanged.
- `prepareImage()` now guarantees the successful-return size postcondition and rejects oversized PNG/WebP inputs explicitly until bounded processing for those formats is implemented.
- `sharp` is pinned exactly to `0.35.5`, and the image preparation, image resolution, and identity-audit modules carry the `server-only` guard.
- Independent checks passed: frozen install, 281 unit tests, typecheck, lint with only the two approved baseline warnings, production build, audio verification, deterministic dry-run hash `F5C2F578DA0CEB411DA8E5B6FDD5BD86B14E3AE9B227F8DE1ED0755BD27F948E`, offline manifest verification, and upload-report verification.
- The independent read-only live audit reproduced 31/31 byte-identical matches, including 16 remote sources, 15 local sources, four heroes, and four audio assets. No Cloudinary or database mutation occurred.

### Remaining blocking findings

#### CLOUD-09 — The identity audit trusts an unvalidated upload report and local source paths

`runContentIdentityAudit()` calls `JSON.parse()`, reads `targetCloudName`, and maps `rawJson.assets` without applying `cloudinaryUploadReportSchema` or reconciling the records against the canonical manifest. It checks only the array length. Duplicate, missing, or substituted public IDs can therefore enter the audit, and a tampered local `sourceLocation` is passed through `path.resolve(repoRoot, sourceLocation)` without an approved-root containment check. A crafted ignored report could make the read-only command hash any readable local file and include its digest and size in the report and logs.

Parse the report as untrusted input, fail safely on malformed payloads, require the exact unique set of 31 canonical target public IDs, and reconcile slug, category, source type, source location, and resource type against a freshly verified canonical manifest. Use canonical source paths for hashing rather than report-provided local paths. Sanitize top-level CLI errors as well as per-record errors. Add mutation tests for malformed reports, duplicates, missing or extra IDs, metadata substitution, and local path traversal.

#### CLOUD-10 — Audit network evidence is inaccurate and injected HTTP status is ignored

The report currently writes `networkRequestsMade: assets.length * 2`, which produces 62 even though a successful run performs 31 target GETs plus 16 old-source GETs: 47 total. The comment itself describes the conditional behavior. The audit abstraction also exposes `HttpStreamResponse.status` but `auditSingleAssetContentIdentity()` never rejects a non-2xx status returned by an injected fetcher; only the default fetch wrapper happens to enforce it.

Count actual fetch attempts instead of using a fixed multiplier, and enforce successful HTTP status in the audit core so production and dependency-injected behavior share the same contract. The final successful report must state 47 requests. Test local-versus-remote request counts, early failures, and non-2xx injected responses.

### Review decision

The Cloudinary data itself is accepted as complete and content-identical: 31/31 live assets are present and no upload rerun is authorized. Stage 5B.2 is not yet approved for commit because the new audit command does not fail closed on its local report boundary and records false network evidence. Apply the narrow `CLOUD-09` and `CLOUD-10` corrections, rerun the same read-only audit, and return for final review. Stage 6 remains paused until this final audit-hardening correction is accepted.

## Stage 5B.3 Final Review

### Accepted corrections

- `CLOUD-09` is resolved. The upload report is parsed as untrusted input with `cloudinaryUploadReportSchema.safeParse()` before dereference. Its exact unique set of 31 public IDs and asset metadata are reconciled against a freshly generated canonical manifest.
- Audit hashing uses canonical source metadata. All local inputs are checked with boundary-safe `realpath` containment under the four approved roots before any network audit starts, preventing absolute-path, traversal, sibling-prefix, and symlink escapes.
- The canonical manifest is independently required to contain one hero and one audio asset for each of the four approved slugs. Duplicate, missing, extra, and substituted upload-report records fail closed.
- Top-level CLI and per-record failures use sanitized error output. Mutation tests cover malformed and primitive JSON, schema failure, credential keywords, canonical-set changes, metadata substitution, and local path tampering.
- `CLOUD-10` is resolved. HTTP status `200..299` is enforced by the audit core for both production and injected fetchers. Network attempts are counted by the fetch wrapper instead of a fixed multiplier.
- The independently rerun live audit recorded exactly 47 read-only GET attempts: 31 target deliveries and 16 remote sources. All 31 digests and byte counts matched; the 15 local sources required no source-side network request.

### Independent final verification

- `pnpm install --frozen-lockfile`: PASS with pnpm `10.34.7`.
- `pnpm test`: PASS — 307/307 tests across 16 files.
- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS — zero errors and the two approved baseline React warnings.
- `pnpm build`: PASS — Next.js 16 production build completed; only the non-blocking stale `baseline-browser-mapping` notice remains.
- `pnpm media:verify-audio`: PASS — 3/3 local operator audio inputs.
- Two `pnpm media:dry-run` runs were byte-identical with SHA-256 `F5C2F578DA0CEB411DA8E5B6FDD5BD86B14E3AE9B227F8DE1ED0755BD27F948E`.
- `pnpm media:verify`: PASS — 31 physical assets, 37 usages, 15 local, 16 remote, four heroes, four audio, and zero blockers.
- `pnpm media:verify-upload`: PASS. Upload report SHA-256 remains `03BE7F497480598C66FEC7BB88D8015C5071FDA2BE966ECA3AE8860EA928EAF2`.
- `pnpm media:audit-identity`: PASS — 31/31 byte-identical assets, 16/16 remote, 15/15 local, 4/4 heroes, 4/4 audio, zero mismatch, and exactly 47 network requests.
- `git diff --check`: PASS; line-ending notices are informational only.

### External effects

The final review performed read-only streaming GET requests only. It caused zero uploads, overwrites, renames, deletions, database writes, route changes, deployments, or old-account mutations.

### Decision

Stage 5B, including corrections 5B.1 through 5B.3, is approved for a single scoped finalization commit. Do not commit ignored media inputs, generated reports, comparison artifacts, `.env.local`, credentials, or other binary outputs. After the finalization commit is reviewed and the worktree is clean, Stage 6 — Idempotent Local Seed may begin against the local Laragon PostgreSQL database only.

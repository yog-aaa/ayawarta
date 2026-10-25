# Stage 11 — Documentation and Final QA

Status: **ACCEPTED — FINALIZED** (2026-10-25). This report records local verification and the remaining production cutover work. It does not authorize deployment.

## Scope and repository state

- Baseline: `develop` at `b5579c5ef53c48090a7aab01fcdd0131f1f1872c` (`chore: remove migrated dynamic media`), five local commits ahead of `origin/develop` at review time.
- Stage 11 scope: documentation and `.env.example` only; no application source, package, lockfile, or Prisma schema change. Its documentation was finalized alongside the subsequent reviewed Neon preparation.
- Operational documents updated: `README.md`, `docs/architecture.md`, `docs/authentication.md`, `docs/deployment.md`, `docs/media-migration.md`, `docs/qa-checklist.md`, `docs/agent/index.md`, plus new `docs/deployment-aiven-vercel.md` and `docs/media-management.md`.
- Stage 10C removed 14 tracked files: 12 images (12,060,994 bytes) and two legacy modules (13,519 bytes), totaling **12,074,513 bytes** removed from the tracked checkout. Git history still retains their blobs; this is not a claim about `.git` object-store size.

## Final verification matrix

The checks followed the approved plan's sequence. The pinned pnpm version was used through its locally cached executable because Corepack's registry lookup was unavailable in this environment.

| Gate | Result | Evidence and limits |
| --- | --- | --- |
| Frozen lockfile | PASS | `pnpm install --frozen-lockfile`; lockfile up to date, pnpm 10.34.7. |
| Prisma format / validate / generate | PASS | Schema formatted without tracked changes; schema valid; Prisma Client 7.10.1 generated. A read-only migration-status check found four applied migrations and an up-to-date local schema. |
| TypeScript | PASS | `pnpm typecheck`, zero errors. |
| Unit tests | PASS | `pnpm test`, 30 files and 544 tests. |
| Local database integration tests | PASS at the original Stage 11 QA run | `pnpm test:db`, four files and 25 tests against local PostgreSQL. This run also had the ignored Stage 5B upload report; fresh checkouts without it fail the provenance tests. The provenance test guards its own database query, but other integration tests (such as `db.integration.test.ts`) have no internal guard and require the documented preflight target check immediately before execution. |
| ESLint | PASS | `pnpm lint`, zero errors and warnings. |
| Media catalog and URLs | PASS locally | Portable canonical-catalog tests passed. `pnpm media:verify-upload` checked the ignored Stage 5B report's internal consistency: 31/31 assets, four heroes, four audio, zero failures. The provenance integration tests in `pnpm test:db` separately verified pinned report SHA-256 `03BE7F497480598C66FEC7BB88D8015C5071FDA2BE966ECA3AE8860EA928EAF2` and catalog/database equality. `pnpm media:verify-audio` checked 3/3 retained operator inputs. These are offline checks, not new live Cloudinary GETs. |
| Seed idempotency | PASS locally | `pnpm seed:verify` passed before the runs; `pnpm prisma:seed` passed twice; `pnpm seed:verify` passed after both runs and again after the admin smoke. The nine documented table counts sum to 86 rows and four reconstructed invitations. The earlier handoff's “82 rows” total was an arithmetic error. |
| Production build | PASS | `pnpm build` compiled and optimized all routes. Only the existing nonblocking `baseline-browser-mapping` age notice appeared. |
| Public route smoke | PASS locally | `pnpm smoke:routes` against port 3000: 10/10 expected 200/404 results, including four invitations and unknown-slug 404. |
| Admin HTTP boundary | PASS locally | `/admin/login` returned 200; unauthenticated `/admin` returned 307 to login. A temporary credentials session using local environment values returned 302 on sign-in, 200 on authenticated `/admin`, 302 on sign-out, and 307 on the next protected request. No credential or cookie value was printed. Browser-specific login UI was not inspected. |
| Firestore wishes | PASS for live read | In the browser, opening `/dudi-aini` progressed from “Memuat ucapan…” to a populated wish list from Firestore. No live wish was submitted, so the write path was not exercised against the project. Component/adapter tests cover write behavior hermetically. |
| Diff, secrets, stale media | PASS | `git diff --check` clean; changed paths limited to documentation and the placeholder environment example; active runtime paths have no reference to deleted dynamic images/modules. No real credential value was added. |

## Data and external effects

The two local seed runs wrote to `localhost:5432/ayawarta`, including re-upserting invitations/media and updating the administrator password hash and lockout state from local environment values. The local login smoke also exercised the success counter reset. Counts remained 82. Unit/integration tests and read-only checks did not leave additional persistent rows. Browser testing performed a Firestore **read** only. No Firestore write, Cloudinary mutation, Aiven operation, Vercel configuration change, production migration, or deployment occurred.

## Known risks and deferred work

1. **Production database cutover is blocked by tooling:** `prisma/seed.ts` and `scripts/verify-seed.ts` reject remote targets before connecting. A separately reviewed production seed/verifier with explicit target controls is needed before Neon use. `pnpm prisma:migrate`, `pnpm prisma:migrate:deploy`, `pnpm admin:bootstrap`, and `pnpm test:db` (which includes tests like `db.integration.test.ts` that connect directly to `DATABASE_URL`) have no automatic local-target guard across the entire suite (the provenance test guard only protects its own queries); local operations require the documented read-only target check immediately beforehand, and remote mutations/tests require a separately authorized cutover.
2. Auth.js remains pinned to `next-auth@5.0.0-beta.32`; upgrades need targeted regression review.
3. The admin flow was checked over local HTTP, but the browser login UI was not inspected. A live Firestore wish submission was not performed. Both remain production cutover smoke checks with controlled credentials and an approved test record.
4. The accepted Cloudinary upload report is ignored and local to the operator checkout. A fresh checkout can seed from the Git-tracked catalog, but `media:verify-upload` and the full `test:db` suite require that report to be supplied. The former checks report consistency offline; the latter also runs pinned-hash and canonical/database provenance checks.
5. No administrator media upload UI or supported routine upload CLI exists yet. The image primitive rejects oversized PNG/WebP until reviewed format-specific recompression is implemented.
6. The nonblocking `baseline-browser-mapping` age notice appeared during the production build; no dependency update was made in this documentation stage.

## Remaining actions requiring owner authorization

1. Approve and prepare Neon project, TLS connection, network policy, and backup/restore procedure.
2. Review and implement a guarded production seed and verifier; test them against a controlled nonproduction target.
3. Authorize Neon migration deployment, production seed, and data verification in that order.
4. Configure scoped Vercel Production and Preview variables, build and deploy a reviewed commit, and retain the previous healthy deployment.
5. Perform production browser checks for all four invitations, `dudi-aini` audio, admin sign-in/logout and protected routes, Firestore read and an approved test write, and unknown-slug 404.
6. Authorize rollback or corrective operations separately if a cutover check fails. Keep Neon data and both Cloudinary accounts intact.

Stage 11 stops at documentation and local QA. No production cutover step above has been started.

## Post-review documentation corrections

- The local workflow now runs the existing, read-only database target guard before unguarded `prisma:migrate`, `admin:bootstrap`, and `test:db` operations. The documented command passed for the configured local URL and rejected a synthetic remote URL without connecting or printing its credentials.
- The setup instructions in `README.md` and `docs/deployment-aiven-vercel.md` now use a conditional PowerShell copy step (`if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }`) that preserves any existing `.env.local` to prevent accidental overwrites of operator configuration.
- The preflight database target check is now explicitly documented as mandatory **immediately before every** `pnpm test:db` execution. Several integration tests (such as `db.integration.test.ts`) connect directly to `DATABASE_URL` without internal guards; the guard in `canonical-provenance.integration.test.ts` only covers its own query, not the full integration suite.
- The README and deployment guide state that the full `test:db` suite needs the ignored accepted Stage 5B upload report as well as local PostgreSQL. The media guide separates offline upload-report consistency from pinned-hash and catalog/database provenance checks.
- For production, owner selected Neon replacing the previous Aiven plan. Dedicated production tooling (`prod:migrate`, `prod:seed`, `prod:verify`) was established supporting direct (`DATABASE_URL`) and pooled (`DATABASE_URL_POOLED`) connections with fail-closed Neon preflight target validation and mandatory `--execute` safety flags.
- On 2026-10-24, `pnpm media:verify-upload` passed again. A targeted provenance run passed its two report checks but could not complete the third, read-only database comparison because `127.0.0.1:5432` was unreachable from this execution environment. The original 25/25 Stage 11 integration result above is historical; the targeted check should be repeated when local PostgreSQL is reachable.
- Subsequent Neon preparation added a local-target guard to the default `prisma.config.ts` and guarded `prod:migrate`, `prod:seed`, and `prod:verify` commands. The earlier tooling risk in this historical Stage 11 report is superseded for those commands. `admin:bootstrap` and the full `test:db` suite still require the documented local-target preflight. No production command has been run with `--execute`.

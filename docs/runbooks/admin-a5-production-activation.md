# Admin A5 production activation runbook

**Status: A5 schema migrated on Neon; application/media activation pending; isolated migrated browser gate OPEN.** The approved production identity is `ep-mute-water-azaf9oyl:ayawarta:neondb_owner`; the Cloudinary target name is `uhwi7xvb`. These are identifiers, not credentials. The additive A5 migration `20261031060000_add_draft_media_provenance` ran on Neon on 2026-10-31 under the owner's migration-only authorization. Its [operation record](../reviews/admin-a5-neon-migration-2026-10-31.md) includes preflight, snapshot evidence, and postchecks. The four legacy version-1 publication baselines still matched 4 of 4 afterward. No instruction in this runbook is authorization for another Neon, Cloudinary, Vercel, or Git mutation.

Two separately reviewed operations remain. The schema portion of the original first operation is complete, but the release wrapper and Git push were not run:

1. **Application release:** verify the already-applied schema and recovery point, then deploy the reviewed A5 code through a separately authorized `Update` release. Keep `AYAWARTA_A5_MEDIA` unset. The old four invitations remain usable.
2. **Media activation:** only after the migrated code passes production smoke checks, verify the Cloudinary account and configure both A5 switches in Vercel Production, then deploy that configuration. The first actual customer upload/publication is a separate, explicitly reviewed content operation; do not create a disposable production invitation merely for a smoke test.

## Preconditions for both operations

- Record the reviewed 40-character commit SHA, linked Vercel project, Production Git branch, current Ready deployment ID, UTC maintenance window, operator, and exact Neon endpoint/database/role tuple. Do not record connection strings or passwords in the review artifact.
- Independently compare Vercel Production direct `DATABASE_URL` and pooled `DATABASE_URL_POOLED` against the approved secret source. Both must identify the same endpoint, database, and role; the direct host must be unpooled and both URLs must enforce TLS. The repository's target guard checks the tuple but does not prove Vercel variable parity. Stop if a Secret value cannot be checked.
- Confirm the previous healthy Vercel deployment is eligible for rollback and record its deployment ID. A Vercel rollback changes application routing, not Neon data or schema. [Vercel Instant Rollback](https://vercel.com/docs/instant-rollback) also notes that an old build keeps its previous environment configuration and automatic domain assignment changes after rollback.
- The owner supplied a Neon Console screenshot showing a manual snapshot on AyaWarta's default `production` branch at **2026-10-31 09:36:15 UTC**, with no expiry, before the A5 schema migration. The screenshot did not expose an opaque snapshot ID or the branch endpoint, and no restored-branch rehearsal was performed. Before a later code release, inspect the snapshot in the Neon Console against the approved target and decide whether a fresh recovery point or a separate-branch restore rehearsal is needed. Do not switch production to a restored branch as a preflight. [Neon's Backup & restore guide](https://neon.com/docs/guides/backup-restore) documents snapshots and multi-step restore; [Instant restore](https://neon.com/docs/postgres/backup-restore/branch-restore) can overwrite the target timeline and is **not** a preflight test.
- A later [encrypted local logical backup](../reviews/neon-local-backup-2026-10-31.md) was created and successfully restored to disposable PostgreSQL. It is tied to the current Windows user profile and does not capture Cloudinary objects or Firestore data. Preserve it as an additional recovery artifact; do not automatically restore it over production.
- Complete the isolated migrated browser check described below. The A5 source tests and A6 release preparation did not close this gate.
- Review `git status --porcelain`; `release.ps1 -Execute` requires a clean local `main` at the exact approved commit and the approved `origin` repository. The canonical seed must **not** run again on the populated production database.

## Open gate: isolated migrated browser review

This gate remains **pending**. The [A7 local test review](../reviews/admin-a7-local-testing-2026-10-31.md) covers route/action/DB success and recovery with a fake provider, but not the browser flow required below. Use a disposable local PostgreSQL database with all six committed migrations and a synthetic administrator. Verify the effective database target is loopback before each migration, bootstrap, or test command; never reuse the current `.env.local` if it points to Neon. The repository's ordinary local Prisma commands require `localhost`, `127.0.0.1`, or `::1` on port `5432` with database `ayawarta`; use a disposable instance configured to satisfy that guard, or a separately reviewed isolated test harness. Do not reset an existing local database to create this fixture. Give the local app only synthetic invitation content and sample images.

For layout and error-state review, set the A5 switches in this isolated app process and set `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` to the required canonical name, but use dummy Cloudinary API credentials that cannot upload. Exercise server refusal and UI error handling without a provider call. The successful upload, idempotent retry, remote-success/database-failure recovery, draft preview, and first publication must use a mocked Cloudinary provider in an isolated browser harness. The current A5 gate and readback require the canonical cloud name, so a separate nonproduction Cloudinary account cannot be substituted without a separately reviewed code/configuration change. Never perform a test upload against the production account or production Neon.

Review 360, 390–430, 768, 1280, and 1440 px widths; keyboard navigation and visible focus; reduced-motion mode; file type/size rejection; pending reservation and recovery; saved draft versus public state; confirmation text and slug; and full image composition without clipping or overflow. Record the fixture/migration identity, browser and viewport, screenshots or short clips, observed pass/fail, and tester/date in the review artifact without credentials or customer media. If the success and recovery browser harness is unavailable, leave this gate **OPEN** and stop before either live operation. A6 checked layout and field-error focus on an isolated local fixture but did not complete this browser review.

## Operation 1: application release after the additive migration

The migration-only command has already completed; the commands below are instructions for a later, separately authorized code release. Run them from the reviewed repository checkout with an ignored `.env.production` containing the approved direct/pooled targets and `APPROVED_NEON_TARGET_FINGERPRINT`. Do not paste secret values into shell arguments, logs, or chat. `Update -Execute` also pushes Git; the migration-only authorization did **not** authorize that push. Its migration step should find no pending migrations, but verify this rather than assuming it.

1. Keep `AYAWARTA_A5_MEDIA` and `AYAWARTA_A5_APPROVED_CLOUD` absent in Vercel Production. Capture the current production routes and admin login behavior without editing customer content.
2. Run the default dry run, which opens no database connection:

   ```powershell
   ./scripts/production/release.ps1 -Mode Update -ApprovedCommit '<reviewed-40-character-SHA>'
   ```

3. Run the guarded read-only `pnpm prod:verify --release-state --execute` against the reviewed target. Expected pre-release state is `seeded` with the A5 migration in the ledger; this validates the migration history and original seed identities. Run `pnpm prod:baseline --check --execute`; for the current untouched four version-1 invitations, expect **4 matching and 0 missing**. If any of those invitations has since advanced beyond version 1, this baseline command is not the right verification path; stop and review the full publication history instead of rerunning baseline or seed.
4. Confirm the Neon recovery point from the preconditions. Obtain explicit owner authorization for **this code-release and Git-push** `Update -Execute` operation, target tuple, reviewed SHA, Vercel project, and recovery point. Then run:

   ```powershell
   ./scripts/production/release.ps1 -Mode Update -ApprovedCommit '<reviewed-40-character-SHA>' -Execute
   ```

   The wrapper checks Git identity and clean tree, pnpm/tests/typecheck/lint/Prisma/build, Vercel Production target attestation, and read-only `seeded` state **before** mutation. It applies pending migrations without rerunning seed. After migration it calls the read-only release-state verifier again; **anything other than `seeded` stops before Git push**. A successful push proves only `origin/main` points to the reviewed SHA; it does not prove Vercel built or served it.
5. In the linked Vercel project, confirm that the Production deployment for the exact SHA becomes Ready. Smoke-test `/`, the four legacy invitations, invite links, an unknown slug 404, `/admin/login`, unauthenticated admin redirect, authenticated list and private draft preview, and Firestore wishes. Do not submit a customer draft or publish during a read-only smoke check. Check server logs without copying credentials or customer content.
6. Re-run `pnpm prod:verify --release-state --execute` and, while the four originals remain at version 1, `pnpm prod:baseline --check --execute`. Verify migration history includes `20261031060000_add_draft_media_provenance` and the release-state gate recognizes `DraftMediaProvision`. Do **not** use the ordinary `pnpm prod:verify --execute` as a post-A5 gate: it intentionally asserts the exact original seed counts and 31 canonical media rows, which cease to be the complete production inventory after admin activity.

**Stop points:** If migration fails, leave feature flags absent, do not push or rerun seed, and inspect the read-only ledger/state with a reviewed procedure. If the post-migration release-state gate fails, the wrapper stops before push; preserve Neon as-is for diagnosis. If Vercel does not show a Ready deployment for the exact SHA, stop before media activation. Never infer deployment success from a responsive old production URL.

## Operation 2: enable verified media for new drafts

This operation needs separate approval after Operation 1 and the isolated browser gate pass. Confirm the linked Cloudinary account is the intended `uhwi7xvb` account using the provider console without displaying API credentials. The public cloud name alone does not prove key ownership. Confirm Vercel Production has server-only `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`, and `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=uhwi7xvb`.

Set the two additional **Production-only** values `AYAWARTA_A5_MEDIA=enabled` and `AYAWARTA_A5_APPROVED_CLOUD=uhwi7xvb` in Vercel's secure environment settings, then create and verify a deployment for that configuration. Do not expose these as `NEXT_PUBLIC_` values. Check that Preview environments cannot connect to production Neon or upload to the production Cloudinary account. The server requires both switches and the configured cloud name to match before it accesses the A5 table or writes media. Changing Vercel settings does not retroactively alter an already-built deployment; verify the exact deployment now serving Production.

For the first customer invitation, use [admin operations](../admin-operations.md): save a private draft, upload only approved customer images, check verified IDs and visible preview, save media choices, then review and confirm the exact slug. Capture the resulting public URL/version and provision IDs in a private operational record. Each upload produces an unlisted **public Cloudinary delivery URL** even before invitation publication. Do not use the upload flow for access-controlled imagery. Do not delete Cloudinary resources or ledger rows as part of a retry.

## Recovery decision table

| Failure point | Immediate action | Recovery boundary |
| --- | --- | --- |
| Before application release | Stop. Keep media flags absent. | A5 schema is already present; the previous application deployment remains in service. |
| Release wrapper or post-state gate fails | Stop before any new push; inspect the ledger and A5 table on the exact target. | Preserve the applied schema and data. Use a reviewed forward correction; do not run reverse SQL or seed automatically. |
| New deployment fails while flags remain off | Restore the previous eligible Vercel deployment; keep Neon intact. | Additive A5 schema stays in Neon. Confirm original public routes and admin login. |
| Upload or first publication fails after activation | Disable new A5 activity by promoting a verified feature-off deployment or deploying corrected configuration; inspect reservation and public snapshot state. | A failed DB link can leave a Cloudinary asset and `RESERVED` ledger entry. Do not overwrite or delete either; retry/recovery uses the recorded identity. |
| Production data corruption | Freeze further writes and preserve evidence; compare the pre-migration recovery point with post-migration customer writes. | A Neon restore can discard legitimate writes after its timestamp. A restore or branch switch requires a new, explicit incident decision and owner authorization. Use the snapshot's multi-step separate-branch preview and verify before any production switch. |

After any Vercel rollback, recheck the active deployment's variables and Git auto-assignment state. If any new invitation was published, old A4 code can still render its public route through the shared repository but may not reopen its version-1 `PUBLISH` draft; keep the A5-capable release available for recovery. Keep both Cloudinary accounts and all uploaded assets intact. Do not treat a Vercel rollback as a database rollback.

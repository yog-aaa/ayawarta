# AyaWarta local operations and Neon/Vercel production cutover

This guide describes the local workflow and Neon/Vercel operations. The approved Neon migration and one-time seed completed on 2026-10-30; release state is `seeded`. Vercel deployment remains separate. The bootstrap commands below are historical recovery guidance and must not be repeated on the seeded database. [`docs/deployment.md`](deployment.md) is the short environment overview.

## Data ownership

| Service | Owns | Application boundary |
| --- | --- | --- |
| PostgreSQL through Prisma | Invitations, ordered sections and children, media metadata, administrators | Server-only repository and Auth.js credential service |
| Cloudinary `uhwi7xvb` | Dynamic portraits, heroes, galleries, and audio | Public HTTPS delivery URLs; API credentials stay server-only |
| Firestore | Real-time wishes and attendance | Browser-only wishes adapter at `wishes/{slug}/messages` |
| Vercel | Next.js application deployment | Runtime configuration; no database or media ownership |

Static theme artwork, payment logos, and brand assets remain in `public/`. The old Cloudinary account is retained; no cleanup step deletes its resources.

## Local Laragon procedure

1. Start PostgreSQL in Laragon and confirm the `ayawarta` database exists on port `5432`. Inspect an existing database before changing its schema; do not use a reset.
2. If `.env.local` does not exist, copy `.env.example` to ignored `.env.local`:

   ```powershell
   if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
   ```

   If `.env.local` already exists, preserve it and edit required keys manually; never overwrite existing operator configuration. Keep credentials out of Git, screenshots, chat, and logs.
3. From the repository root, install with the pinned pnpm version and generate the Prisma client:

   ```powershell
   pnpm install --frozen-lockfile
   pnpm prisma:validate
   pnpm prisma:generate
   pnpm exec tsx --conditions=react-server -e "import { config } from 'dotenv'; config({ path: '.env.local' }); import('./src/features/invitations/db-guard.ts').then(({ assertLocalDatabaseTarget }) => assertLocalDatabaseTarget())"
   pnpm exec prisma migrate status
   ```

   Stop if the target check fails or does not show `localhost`, `127.0.0.1`, or `::1` on port `5432` with database `ayawarta`. It reads the effective `DATABASE_URL` and prints only a sanitized target. The migration-status command is read-only; it does not enforce a local target.
4. For a new or reviewed local schema only, run `pnpm prisma:migrate` after that target check. This invokes `prisma migrate dev`; it is **not** a production migration command. The default Prisma configuration also validates the local target before running the command. Recheck the target if the environment changes before running it.
5. Run `pnpm prisma:seed` and `pnpm seed:verify`. The seed is atomic, uses the Git-tracked 31-asset canonical catalog, and does not require `.media-migration/` or removed sample images. Its CLI guard rejects nonlocal hosts, ports other than `5432`, and databases other than `ayawarta`.
6. Start `pnpm dev`; use `pnpm smoke:routes` against port `3000`, or set `PORT` to the port of an already running local server.

The seeded local database has four invitation slugs. `seed:verify` expects 86 rows across nine tables, including one administrator. A fresh database needs valid `ADMIN_EMAIL` and `ADMIN_PASSWORD` to reach that count.

### Administrator bootstrap and password change

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in ignored `.env.local`. Before **each** `pnpm admin:bootstrap` run, execute the read-only target check in local procedure step 3 and stop if it fails; `admin:bootstrap` has **no** automatic local-target guard. The operation upserts the email, hashes the password, activates a `SUPER_ADMIN`, and clears failed-login and lockout state. To change that administrator's password locally, replace `ADMIN_PASSWORD` with a new value, recheck the target, then rerun the command; verify login at `/admin/login`. The password must have at least eight characters and fit within bcrypt's 72-byte UTF-8 limit. Do not paste passwords into commands, tickets, or chat.

`pnpm prisma:seed` also bootstraps or updates the administrator when those two variables are set. A routine seed rerun therefore resets the administrator's password and lockout state.

### Integration tests (`test:db`)

Run the read-only database target check from step 3 **immediately before every** `pnpm test:db` execution, including when running integration tests independently of the setup sequence:

```powershell
pnpm exec tsx --conditions=react-server -e "import { config } from 'dotenv'; config({ path: '.env.local' }); import('./src/features/invitations/db-guard.ts').then(({ assertLocalDatabaseTarget }) => assertLocalDatabaseTarget())"
pnpm test:db
```

Stop immediately if the target check fails or points to a non-local host. Several integration tests (including `src/lib/server/db.integration.test.ts`) connect directly to `DATABASE_URL` without an automated local-target guard; the guard in `src/features/media/canonical-provenance.integration.test.ts` only protects its own database queries, not the entire integration test suite. Never treat `test:db` as safe for remote URLs without this mandatory preflight check. In addition to a running local database, the full `test:db` suite requires the ignored `.media-migration/cloudinary-upload-report.json` artifact for its fail-closed provenance tests. The seed itself does not require that report. See [media management](media-management.md#operational-checks) for the separate report checks.

## Production cutover: separate authorization required

The production target is Vercel plus Neon serverless PostgreSQL.

### Direct vs Pooled Connections

Neon provides two connection strings:
- **Direct connection (`DATABASE_URL`)**: targets `ep-[project-id].[region].aws.neon.tech` (unpooled). Required for Prisma schema migrations (`pnpm prod:migrate`) and database seeding (`pnpm prod:seed`).
- **Pooled connection (`DATABASE_URL_POOLED`)**: targets `ep-[project-id]-pooler.[region].aws.neon.tech` (pooled). Required for the Vercel Next.js serverless runtime to prevent connection exhaustion under parallel traffic. On Vercel Production (`VERCEL_ENV=production`), `DATABASE_URL_POOLED` is mandatory; runtime fails closed if it is missing or empty, prohibiting direct fallback.

Both URLs may use one `sslmode`, optional `channel_binding=require`, and optional `schema=public`. Duplicate query parameters and connection overrides such as `user`, `password`, `host`, and `port` are rejected. If a port is written in the URL authority, it must be `5432`.

**Local runtime connection isolation (NEO-12):** Local runtime uses `DATABASE_URL` on local PostgreSQL by default. For the owner's intentional local-to-Neon workflow, ignored `.env.local` must explicitly set `AYAWARTA_LOCAL_NEON_RUNTIME=enabled`, `DATABASE_URL_POOLED`, and `APPROVED_NEON_TARGET_FINGERPRINT` alongside the matching direct `DATABASE_URL`. The runtime validates the complete Neon target tuple before using the pooled connection. The opt-in does not change local Prisma CLI, seed, or integration-test guards. Restart Next.js after changing `.env.local`.

**The local `prisma:seed` and `seed:verify` CLIs remain strictly local-only.** They deliberately reject Neon before connecting. Production cutover must use the dedicated production entrypoints (`pnpm prod:migrate`, `pnpm prod:seed`, `pnpm prod:verify`), which enforce fail-closed Neon target verification before any connection is opened. All live execution requires an approved Neon target tuple (**endpoint ID + database name + role**, via `APPROVED_NEON_TARGET_FINGERPRINT` or `--approved-target=<endpoint:database:role>`); without owner authorization of the complete tuple, the gate status is strictly `UNPROVEN` and aborts prior to opening a database connection. All production CLIs sanitize error messages to suppress raw error strings, driver error objects, and connection credentials.

Default `prisma.config.ts` is strictly local-only, rejecting all remote database hosts and forged boolean markers. The shell marker `AYAWARTA_EXECUTION_CONTEXT=production_migration_wrapper` is not trusted alone; when present, `prisma.config.ts` performs full on-load validation of direct URL, pooled URL, TLS enforcement, and the approved target tuple. Honestly noted: this prevents accidental execution of repository scripts (such as `npx prisma migrate dev` or `prisma db push`) against remote databases; it does not and cannot prevent an operator with local shell access from executing arbitrary custom scripts or separate Prisma configurations.

The authorized cutover sequence:

1. **Verify Neon targets**: Ensure `.env.production` contains valid direct `DATABASE_URL` and pooled `DATABASE_URL_POOLED` matching the same Neon project, region, database, and role with TLS enforced (`sslmode=require`) and approved target identity verified (gate status transitions from `UNPROVEN` to `verified`).
2. **Inspect database state**: Run `pnpm prod:verify --check-empty --execute` to verify that the target Neon database is uninitialized (0 tables in `public` schema) before initial migration. Note: database emptiness, connection success, and Vercel variables are not assumed in advance and must be verified in this live cutover step.
3. **Apply Prisma migrations**: Run `pnpm prod:migrate --execute`. This sets direct `DATABASE_URL`, marks preflight verification, and applies committed migrations to Neon using `prisma migrate deploy` with piped output capture (`stdio: "pipe"`), ensuring no raw connection strings or passwords leak to the console. Direct Prisma CLI execution without wrapper context is blocked by default configuration.
4. **Run production seed**: Run `pnpm prod:seed --execute`. This flows validated `ADMIN_EMAIL` and `ADMIN_PASSWORD` explicitly into the seed service without mutating global `process.env`, applies the Git-tracked canonical media catalog (`CANONICAL_PRODUCTION_MEDIA`), and bootstraps the production administrator.
5. **Verify production database**: Run `pnpm prod:verify --execute`. Verifies strictly 86 rows across all 9 tables (1 AdminUser, 31 MediaAsset, 4 Invitation, 4 HeroContent/Sections, 8 CoupleProfile/Partner, 6 Event, 21 EventTimeline/GalleryItem, 6 Story/LoveStory, 5 GiftAccount), `galleryVideoUrl` semantics, domain reconstruction of all four slugs, and 1:1 match of all 31 canonical MediaAsset records across all 9 schema columns.
6. **Configure Vercel Production variables**: Configure `DATABASE_URL_POOLED`, `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, Cloudinary keys, and Firebase keys in Vercel. Scope them strictly to Production (Preview deployments must not target production Neon). Keep server-only variables free of `NEXT_PUBLIC_`.
7. **Deploy and smoke-test**: Deploy the reviewed commit on Vercel using the committed `pnpm-lock.yaml`. Smoke-test landing, all four invitations (including `dudi-aini` audio), invite links, unknown-slug 404, admin login/logout, and Firestore wishes.

### Reusable release wrapper (Windows PowerShell)

`scripts/production/release.ps1` checks an explicitly approved full commit, a clean local `main`, the approved GitHub remote, the pinned pnpm version, and project quality gates before touching Neon. Run it only after committing and reviewing the intended release. Its default invocation is a dry run:

```powershell
./scripts/production/release.ps1 -Mode Bootstrap -ApprovedCommit '<40-character-reviewed-commit>'
```

The dry run prints the plan and runs no external commands. Every live invocation also requires the owner's separate production authorization. Before `-Execute`, ensure the reviewed commit contains this wrapper and the verifier, is on a clean local `main`, and is ahead of `origin/main`.

| Read-only release state | `Bootstrap` | `Bootstrap -ResumeBootstrap` | `Update` |
| --- | --- | --- | --- |
| `uninitialized`: no public tables or residual enum/view/sequence | Migrate, seed once, exact baseline verification, push | Stop | Stop |
| `seed-ready`: all committed migrations applied; exactly the twelve current AyaWarta tables plus migration ledger; all application tables empty | Stop | Seed once, exact baseline verification, push | Stop |
| `seeded`: approved invitation slugs, canonical media IDs, admin, sections, and partner roles exist | Stop | Stop | Migrate pending changes, skip seed, push |
| Partial data, missing table, failed/unknown migration, or ambiguous state | Stop | Stop | Stop |

For a new database, the separately authorized live command is:

```powershell
./scripts/production/release.ps1 -Mode Bootstrap -ApprovedCommit '<40-character-reviewed-commit>' -Execute
```

If migration succeeded but seed failed, **stop before push**. Inspect the failure and the read-only release state; do not roll back automatically. After fixing the cause in a reviewed commit, use the recovery dry run and, only when the verifier proves `seed-ready`, the separately authorized live recovery command:

```powershell
./scripts/production/release.ps1 -Mode Bootstrap -ResumeBootstrap -ApprovedCommit '<new-40-character-reviewed-commit>'
./scripts/production/release.ps1 -Mode Bootstrap -ResumeBootstrap -ApprovedCommit '<new-40-character-reviewed-commit>' -Execute
```

Recovery skips migration. Any partial rows, unknown table, or incomplete migration history blocks it and requires a reviewed corrective procedure. If the initial seed and exact verification already succeeded but push failed, do **not** rerun Bootstrap or seed; review the state and use the `Update` path with a new approved commit if appropriate.

For later releases:

```powershell
./scripts/production/release.ps1 -Mode Update -ApprovedCommit '<new-40-character-reviewed-commit>'
./scripts/production/release.ps1 -Mode Update -ApprovedCommit '<new-40-character-reviewed-commit>' -Execute
```

`Update` requires evidence of a prior bootstrap without enforcing exactly 86 rows. New application tables and records are permitted when the migration ledger is coherent. It never repeats the seed: doing so would replace invitation child collections and might overwrite admin-managed content. All three live paths stop before mutation unless the operator verifies that the linked Vercel project's **Production** `DATABASE_URL` is direct Neon and `DATABASE_URL_POOLED` is the matching pooled Neon connection, both matching the approved local target, and confirms the Production Git branch is `main`. The wrapper asks for an exact SHA-bound attestation; it does not read Vercel variable values. If either value is marked Secret and cannot be independently checked against the approved secret source, stop rather than attest. Do not paste either URL into a command, chat, log, or report. Vercel documents that `env ls` lists variable names, while `env pull` writes values to a file and unreadable Secret values become placeholders; the wrapper intentionally uses neither for parity claims ([Vercel CLI environment variables](https://vercel.com/docs/cli/env)).

After push, the wrapper confirms only that `origin/main` points to the reviewed SHA. It reports the Vercel trigger and Ready state as **unverified**. In the linked Vercel project's Production deployments, confirm a deployment with that exact SHA was created and reached Ready; then run the post-deploy smoke checklist. A prior production URL responding successfully proves neither fact. An operator with an already authenticated, linked Vercel CLI may locate a deployment by `githubCommitSha` metadata, but this wrapper does not require new Vercel credentials or claim automated Ready verification ([Vercel deployment list](https://vercel.com/docs/cli/list)). If no deployment appears, or it is not Ready, stop and investigate without rerunning seed or assuming database rollback. If the Git integration does not deploy from `main`, stop and review the release process.

The approved initial Neon migration and seed were performed on 2026-10-30. No Vercel production deployment or Git push was performed in that operation.

## Rollback and Database Recovery

If the production deployment fails:

1. **Application rollback**: Revert to the previous healthy deployment in Vercel. **A Vercel deployment rollback only reverts frontend and serverless code; it does NOT automatically roll back database schema migrations or seed mutations in Neon.**
2. **Database recovery**: Keep Neon data intact for diagnosis. If database recovery is needed, use Neon branching or point-in-time restore, or prepare an authorized, reviewed corrective migration.
3. Keep both Cloudinary accounts intact; never delete resources from the old account.
4. Do not run destructive reverse migrations automatically. Record the failing route, deployment ID, migration state, and logs.

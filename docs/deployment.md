# AyaWarta Environment and Deployment Guide

Neon schema migration and the one-time canonical seed completed on 2026-10-30 for the approved `ep-mute-water-azaf9oyl:ayawarta:neondb_owner` target. That initial verification confirmed 12 application tables, 86 seed rows across the original nine data tables, four invitation slugs, 31 canonical media records, and release state `seeded`. The additive A5 `DraftMediaProvision` migration was applied to the same approved target on 2026-10-31 after the owner verified a manual production snapshot. The postcheck found six finished migrations, zero `DraftMediaProvision` rows, release state `seeded`, and four matching baselines with none missing. A5 feature switches remain off; no upload, seed, customer invitation write, Vercel change, deployment, or Git push occurred in that operation. For current commands and guards, use [the operational guide](deployment-aiven-vercel.md). Do not rerun the initial seed on this populated database.

## Environments

### Local development

- Application: local Next.js process.
- Database: PostgreSQL from Laragon.
- Database name: `ayawarta`.
- Cloudinary: new account, production invitation folders.
- Firestore: existing project.

### Production target

- Application: Vercel.
- Database: Neon PostgreSQL with direct (migrations/seed) and pooled (runtime) connections.
- Cloudinary: new account.
- Firestore: existing project.

## Environment Variables

### Server-only

- `DATABASE_URL` (direct Neon connection, required for migrations and seed)
- `DATABASE_URL_POOLED` (pooled Neon connection, required for Vercel Production runtime)
- `AUTH_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `APPROVED_NEON_TARGET_FINGERPRINT` (approved endpoint/database/role identifier for guarded production tooling)
- `AYAWARTA_A5_MEDIA` and `AYAWARTA_A5_APPROVED_CLOUD` (optional A5 activation switches; absent by default)

### Public client configuration

- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- existing `NEXT_PUBLIC_FIREBASE_*` keys required by the Firebase web client

Do not add `NEXT_PUBLIC_` to database, auth, password, Cloudinary API key, or Cloudinary API secret values.

## Local Workflow

The current local workflow uses the pinned pnpm version: `pnpm install --frozen-lockfile`, `pnpm prisma:generate`, `pnpm prisma:validate`, `pnpm prisma:migrate` for a reviewed local schema, `pnpm prisma:seed`, and `pnpm seed:verify`. Run the [read-only local target check](deployment-aiven-vercel.md#local-laragon-procedure) before database operations. The default Prisma configuration independently guards `prisma:migrate`. `admin:bootstrap` and several integration tests (including `db.integration.test.ts`) have no automatic local-target guard; the guard in provenance tests only covers its own queries. Never run `test:db` against remote databases without the preflight check immediately beforehand; it also requires the ignored Stage 5B upload report. The completed one-time media migration commands are retired. Run tests, lint, build, and local route smoke checks before review.

The existing Laragon database may contain user-created state. Before applying a migration, inspect the target schema and avoid destructive resets.

## Neon Preparation

Neon provides serverless PostgreSQL. Two distinct connection strings are required:

1. **Direct connection (`DATABASE_URL`)**:
   - Host format: `ep-[project-id].[region].aws.neon.tech` (no `-pooler` suffix).
   - Used for schema migrations (`pnpm prod:migrate`) and database seeding (`pnpm prod:seed`).
   - Must include `sslmode=require`.

2. **Pooled connection (`DATABASE_URL_POOLED`)**:
   - Host format: `ep-[project-id]-pooler.[region].aws.neon.tech` (with `-pooler` suffix).
   - Used by the Next.js runtime on Vercel Production to prevent connection exhaustion in serverless executions.
   - Must point to the exact same database name and role as the direct connection.
   - Must include `sslmode=require`.

Both connection strings must be stored securely in `.env.production` (locally, ignored by Git) and in Vercel Production project settings.

On Vercel Production (`VERCEL_ENV=production`), the application runtime strictly requires `DATABASE_URL_POOLED` and fails closed if it is missing or empty; falling back to direct connections is prohibited in production to prevent connection exhaustion under serverless execution.

### Target Isolation, Approval Gate & Boundary Guarantees

- **Connection URL query contract (NEO-17)**: Production commands and Vercel Production runtime validate both URLs. Each may contain one `sslmode`, optional `channel_binding=require`, and optional `schema=public`. Duplicate parameters and all connection overrides (including `user`, `password`, `host`, and `port`) are rejected before connecting. An explicit port, if present, must be `5432`.
- **Local Runtime Connection Isolation (NEO-12)**: By default, local Next.js requires `DATABASE_URL` on an authorized local host (`localhost`, `127.0.0.1`, `::1`). The owner's intentional local-to-Neon workflow requires an explicit `AYAWARTA_LOCAL_NEON_RUNTIME=enabled` opt-in plus matching direct/pooled URLs and `APPROVED_NEON_TARGET_FINGERPRINT` in ignored `.env.local`; runtime then uses the pooled URL. This opt-in does not enable local Prisma migration, seed, or integration-test commands against Neon.
- **Target Approval Gate (NEO-14)**: Live operations (`--execute`) on `prod:migrate`, `prod:seed`, and `prod:verify` fail closed before connection unless an approved Neon target tuple (**endpoint ID + database name + role**) is explicitly supplied (via `APPROVED_NEON_TARGET_FINGERPRINT` or `--approved-target=<endpoint:database:role>`). Prior to owner review and authorization of the exact tuple, the gate status is strictly reported as `UNPROVEN`. Separate mutation checks detect endpoint, database, or role mismatches.
- **Prisma Configuration On-Load Full Validation (NEO-13)**: Default `prisma.config.ts` is strictly local-only (rejects all remote hosts including Neon, Aiven, AWS, Supabase, and rejects forged environment flags). The shell marker `AYAWARTA_EXECUTION_CONTEXT=production_migration_wrapper` is not trusted alone; when present, `prisma.config.ts` performs full on-load validation of direct URL, pooled URL, TLS enforcement, and the complete approved target tuple.
- **Honest Protection Boundary**: The Prisma configuration guard prevents accidental execution of repository scripts (such as `npx prisma migrate dev` or `prisma db push`) against remote databases. It is an internal guardrail for repository tooling, not an absolute sandbox against an operator with local shell access creating external scripts or custom configs.
- **Piped Output Capture**: `pnpm prod:migrate` executes migrations through child processes with `stdio: "pipe"`, suppressing raw command output and driver errors to ensure connection strings, queries, and passwords are never leaked to logs.

## Initial Neon cutover and later releases

The guarded Neon migration, one-time canonical seed, and strict `pnpm prod:verify --execute` check completed on 2026-10-30. Those were **initial bootstrap** operations, not steps to repeat on the populated target. In particular, rerunning the seed could replace ordered invitation children and reset administrator credentials. The local `prisma:seed` and `seed:verify` commands deliberately reject Neon.

For a later release, use the reviewed `Update` path in [the operational guide](deployment-aiven-vercel.md#reusable-release-wrapper-windows-powershell). It validates the approved direct/pooled target and committed migration history, applies pending migrations, and never reruns seed. Keep Vercel Production and Preview variable scopes separate, build from the committed `pnpm-lock.yaml`, and retain the previous healthy deployment. The [A5 activation runbook](runbooks/admin-a5-production-activation.md) records the completed additive schema migration and separates the pending code release from enabling new image uploads and first publication.

The A5 schema step is complete on Neon. The remaining A5 release steps are code/deployment verification and a separately approved feature activation; the mocked-provider browser gate remains open. The 2026-10-31 schema operation did not perform either step.

## Production Cutover Checklist

This checklist records the **initial** Neon bootstrap and the still-unverified Vercel cutover. It is not an A5 activation checklist.

- [x] Direct and pooled connection URLs verified via preflight target guard (`assertNeonDatabaseTargets`) with TLS enforced and approved target identity verified.
- [x] Neon database state inspected and confirmed uninitialized / empty before migration (`pnpm prod:verify --check-empty --execute`).
- [x] Prisma migrations applied successfully via guarded wrapper (`pnpm prod:migrate --execute`) with piped output capture.
- [x] Production seed completed with validated admin credentials (`pnpm prod:seed --execute`). Do not rerun it on a populated database.
- [x] Post-seed verification passed with 86 rows across nine baseline data tables, four slugs, and 31 canonical MediaAsset records (`pnpm prod:verify --execute`). The three new admin tables were empty immediately after seed.
- [ ] New Cloudinary media is verified.
- [ ] Vercel variables configured with correct scopes (`DATABASE_URL_POOLED` for production runtime).
- [ ] Production build passes.
- [ ] Previous Vercel deployment remains available for rollback.
- [ ] Owner explicitly approves cutover.

## Post-Deploy Smoke Tests

- Landing page.
- `default-preview`.
- `rika-fauzi`.
- `shidqi-mita`.
- `dudi-aini`, including audio.
- Invite-link generator.
- Firestore wish read and submit.
- Admin login and logout.
- Protected admin route.
- Unknown slug 404.
- Browser console and server logs for errors without exposing secrets.

## Rollback and Database Recovery

If the new deployment fails:

1. restore the previous Vercel deployment (Note: a Vercel deployment rollback only reverts application code; it does NOT automatically undo database schema migrations or seed mutations in Neon);
2. keep Neon data intact for diagnosis (use Neon branching or point-in-time restore if database recovery is required);
3. keep new and old Cloudinary assets intact;
4. do not run destructive reverse migrations automatically;
5. record the failing request, route, migration state, and deployment ID;
6. prepare a reviewed corrective stage.

## Production Actions Not Authorized by the Implementation Plan Alone

- Creating or deleting Neon projects/databases.
- Editing live Vercel environment variables.
- Applying migrations to Neon.
- Running the production seed.
- Switching the production deployment.
- Deleting Cloudinary resources.

Each requires an explicitly assigned cutover or operations stage.

The local admin bootstrap command is also a database mutator. See [administrator operations](deployment-aiven-vercel.md#administrator-bootstrap-and-password-change) before changing its target.

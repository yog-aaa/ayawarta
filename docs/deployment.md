# AyaWarta Environment and Deployment Guide

For exact current commands, local guard behavior, and the future cutover order, use [the operational guide](deployment-aiven-vercel.md). Production operations remain unexecuted.

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

- **Local Runtime Connection Isolation (NEO-12)**: When running in local mode, the Next.js runtime strictly uses `DATABASE_URL` and validates that it points to an authorized local host (`localhost`, `127.0.0.1`, `::1`). Any remote database URL configured in local mode is rejected. The coexistence of `DATABASE_URL_POOLED` (e.g. from `.env.production`) NEVER switches the local runtime to pooled or remote mode.
- **Target Approval Gate (NEO-14)**: Live operations (`--execute`) on `prod:migrate`, `prod:seed`, and `prod:verify` fail closed before connection unless an approved Neon target tuple (**endpoint ID + database name + role**) is explicitly supplied (via `APPROVED_NEON_TARGET_FINGERPRINT` or `--approved-target=<endpoint:database:role>`). Prior to owner review and authorization of the exact tuple, the gate status is strictly reported as `UNPROVEN`. Separate mutation checks detect endpoint, database, or role mismatches.
- **Prisma Configuration On-Load Full Validation (NEO-13)**: Default `prisma.config.ts` is strictly local-only (rejects all remote hosts including Neon, Aiven, AWS, Supabase, and rejects forged environment flags). The shell marker `AYAWARTA_EXECUTION_CONTEXT=production_migration_wrapper` is not trusted alone; when present, `prisma.config.ts` performs full on-load validation of direct URL, pooled URL, TLS enforcement, and the complete approved target tuple.
- **Honest Protection Boundary**: The Prisma configuration guard prevents accidental execution of repository scripts (such as `npx prisma migrate dev` or `prisma db push`) against remote databases. It is an internal guardrail for repository tooling, not an absolute sandbox against an operator with local shell access creating external scripts or custom configs.
- **Piped Output Capture**: `pnpm prod:migrate` executes migrations through child processes with `stdio: "pipe"`, suppressing raw command output and driver errors to ensure connection strings, queries, and passwords are never leaked to logs.

## Vercel Preparation

Before cutover:

1. Plan Vercel Production and Preview variable scopes; keep preview deployments away from production writes.
2. The current local `prisma:seed` and `seed:verify` commands deliberately reject Neon before connecting. Use the dedicated production tooling (`pnpm prod:migrate`, `pnpm prod:seed`, `pnpm prod:verify`) which validates direct and pooled Neon targets, enforces TLS (`sslmode=require`), and enforces target identity approval.
3. Apply migrations to Neon using `pnpm prod:migrate --execute` after authorization, then run `pnpm prod:seed --execute` and `pnpm prod:verify --execute`. Direct Prisma CLI migration execution targeting Neon is blocked by default `prisma.config.ts`.
4. Configure production variables in Vercel using its secure settings, supplying both `DATABASE_URL` (direct) and `DATABASE_URL_POOLED` (pooled).
5. Build using the committed `pnpm-lock.yaml`; `package-lock.json` must not exist.
6. Deploy without deleting the previous healthy deployment.

## Production Cutover Checklist

- [ ] Direct and pooled connection URLs verified via preflight target guard (`assertNeonDatabaseTargets`) with TLS enforced and approved target identity verified (gate status transitions from `UNPROVEN` to `verified`).
- [ ] Neon database state inspected and confirmed uninitialized / empty (`pnpm prod:verify --check-empty --execute`). Note: emptiness and connection success are verified in this live cutover step, not assumed in advance.
- [ ] Prisma migrations applied successfully via guarded wrapper (`pnpm prod:migrate --execute`) with piped output capture.
- [ ] Production seed completed with validated admin credentials (`pnpm prod:seed --execute`).
- [ ] Post-seed verification passes with strictly 86 rows across 9 tables (1 AdminUser, 31 MediaAsset, 4 Invitation, 4 HeroContent/Sections, 8 CoupleProfile/Partner, 6 Event, 21 EventTimeline/GalleryItem, 6 Story/LoveStory, 5 GiftAccount), 4 slugs, and 31 canonical MediaAsset records verified 1:1 across all 9 schema columns (`pnpm prod:verify --execute`).
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

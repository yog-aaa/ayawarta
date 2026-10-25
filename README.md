# AyaWarta

AyaWarta is a Next.js 16 digital invitation app. PostgreSQL stores invitations, media metadata, and administrator accounts; Cloudinary serves invitation media; Firestore handles real-time wishes and attendance. Public routes read invitations from Prisma and return 404 for unknown slugs.

## Local setup (Windows and Laragon)

The final local QA ran on Node.js **24.15.0** with the pinned **pnpm 10.34.7**. Start Laragon PostgreSQL on `localhost:5432` and create the `ayawarta` database. Do not reset an existing database to follow this guide.

```powershell
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

If `.env.local` already exists, preserve it and edit required keys manually; never overwrite existing operator configuration. If newly created, fill `.env.local` with your own values before continuing; it is ignored by Git. Then run:

```powershell
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm prisma:validate
pnpm exec tsx --conditions=react-server -e "import { config } from 'dotenv'; config({ path: '.env.local' }); import('./src/features/invitations/db-guard.ts').then(({ assertLocalDatabaseTarget }) => assertLocalDatabaseTarget())"
pnpm prisma:migrate
pnpm prisma:seed
pnpm seed:verify
pnpm dev
```

Stop if the target check fails. The preceding command checks the effective `DATABASE_URL` without showing credentials. The default Prisma configuration also enforces the local target before `prisma:migrate`; the local seed and `seed:verify` independently enforce a connection to `localhost`, `127.0.0.1`, or `::1` on port `5432`, database `ayawarta`. The seed uses the Git-tracked [canonical media catalog](src/features/media/canonical-catalog.ts); it does not need the removed sample images or an ignored `.media-migration/` report. It upserts four invitations, 31 media records, and an administrator when `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set. Re-running it updates that administrator's password and resets the login lockout state.

Open <http://localhost:3000>. The seeded invitation routes are `/rika-fauzi`, `/shidqi-mita`, `/dudi-aini`, and `/default-preview`; `/admin/login` is the administrator entry point. Guest wishes use Firestore in the browser.

## Checks

```powershell
pnpm prisma:format
pnpm prisma:validate
pnpm prisma:generate
pnpm typecheck
pnpm test
pnpm exec tsx --conditions=react-server -e "import { config } from 'dotenv'; config({ path: '.env.local' }); import('./src/features/invitations/db-guard.ts').then(({ assertLocalDatabaseTarget }) => assertLocalDatabaseTarget())"
pnpm test:db
pnpm lint
pnpm media:verify-upload
pnpm seed:verify
pnpm build
pnpm smoke:routes
```

The documented database target check is **mandatory right before each** `pnpm test:db` run, including whenever `pnpm test:db` is executed separately from the setup procedure. Several integration tests (such as [`db.integration.test.ts`](src/lib/server/db.integration.test.ts)) connect directly to `DATABASE_URL` without an automated local-target guard; the guard in `src/features/media/canonical-provenance.integration.test.ts` only protects its own database queries, not the rest of the integration suite. Never assume `test:db` is safe for remote URLs without this preflight check. `seed:verify` requires the seeded local Laragon database. The full `test:db` suite requires that database **and** the ignored `.media-migration/cloudinary-upload-report.json` artifact: its provenance integration tests fail closed if the report is absent or its SHA-256 differs from the accepted Stage 5B report. `media:verify-upload` also requires that artifact and checks report consistency offline; it does not prove live Cloudinary state or match all 31 entries to the canonical catalog. These report-dependent checks cannot pass on a fresh checkout until the accepted artifact is supplied. The hermetic `pnpm test` suite validates the portable canonical catalog without it. `smoke:routes` checks the local server on port `PORT` (default `3000`); start a development or production server first.

The one-time media migration commands were retired after the verified upload and repository cleanup. `media:verify-audio` remains for the three ignored operator MP3 inputs, when those files are present. No routine command uploads new media; the server-side image preparation and Cloudinary utilities are building blocks for a future reviewed admin workflow.

## Operations and boundaries

- [Local operations and Neon/Vercel cutover](docs/deployment-aiven-vercel.md)
- [Cloudinary media management](docs/media-management.md)
- [Architecture](docs/architecture.md)
- [Authentication](docs/authentication.md)
- [QA checklist](docs/qa-checklist.md)

Production Neon migration, seed, Vercel configuration, and deployment require a separately approved cutover. The current local `prisma:seed` and `seed:verify` commands deliberately reject remote database targets, while `prod:migrate`, `prod:seed`, and `prod:verify` require explicit `--execute` flags and validate direct and pooled Neon targets before connecting. The default Prisma configuration also guards `prisma:migrate`; run the documented preflight immediately before `admin:bootstrap` and `test:db`, which do not have a suite-wide local-target guard.

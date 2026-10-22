# AyaWarta Environment and Deployment Guide

## Environments

### Local development

- Application: local Next.js process.
- Database: PostgreSQL from Laragon.
- Database name: `ayawarta`.
- Cloudinary: new account, production invitation folders.
- Firestore: existing project.

### Production target

- Application: Vercel.
- Database: Aiven PostgreSQL with TLS.
- Cloudinary: new account.
- Firestore: existing project.

## Environment Variables

### Server-only

- `DATABASE_URL`
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

The programmer agent defines exact commands in `package.json`, but the workflow must cover:

1. dependency installation with the pinned pnpm version and `pnpm install --frozen-lockfile`;
2. Prisma generation;
3. applying the local development migration;
4. media migration dry run;
5. reviewed media upload;
6. invitation and admin seed;
7. tests, lint, and build;
8. local smoke testing.

The existing Laragon database may contain user-created state. Before applying a migration, inspect the target schema and avoid destructive resets.

## Aiven Preparation

The connection string must:

- target the correct Aiven host, port, database, and user;
- include TLS/SSL parameters required by Aiven;
- be stored only in secure environment configuration;
- be tested from a controlled migration environment before Vercel cutover.

Do not assume the local Laragon connection string works in production.

## Vercel Preparation

Before cutover:

1. Add production environment variables in Vercel.
2. Confirm no preview environment unintentionally points to the production database unless explicitly desired.
3. Apply migrations to Aiven from a controlled job or operator environment.
4. Run the production seed once and verify idempotency.
5. Build using the committed `pnpm-lock.yaml`; `package-lock.json` must not exist.
6. Deploy without deleting the previous healthy deployment.

## Production Cutover Checklist

- [ ] Aiven database provisioned and reachable with TLS.
- [ ] Database backup/restore expectations understood.
- [ ] Prisma migrations applied successfully.
- [ ] Production seed completed and verified.
- [ ] All four production invitations query correctly.
- [ ] New Cloudinary media is verified.
- [ ] Vercel variables configured with correct scopes.
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

## Rollback

If the new deployment fails:

1. restore the previous Vercel deployment;
2. keep Aiven data intact for diagnosis;
3. keep new and old Cloudinary assets intact;
4. do not run destructive reverse migrations automatically;
5. record the failing request, route, migration state, and deployment ID;
6. prepare a reviewed corrective stage.

## Production Actions Not Authorized by the Implementation Plan Alone

- Creating or deleting Aiven services.
- Editing live Vercel environment variables.
- Applying migrations to Aiven.
- Running the production seed.
- Switching the production deployment.
- Deleting Cloudinary resources.

Each requires an explicitly assigned cutover or operations stage.

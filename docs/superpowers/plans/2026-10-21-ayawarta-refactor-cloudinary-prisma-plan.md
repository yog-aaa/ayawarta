# AyaWarta Refactor, Cloudinary Migration, and Prisma Implementation Plan

## Objective

Implement the approved design in `docs/superpowers/specs/2026-10-21-ayawarta-refactor-cloudinary-prisma-design.md` while preserving the current UI, protecting production invitation data, and keeping every destructive cleanup step behind verification gates.

## Working Rules

- Use pnpm exclusively because Vercel production is configured around pnpm. Pin the reviewed version in `package.json#packageManager`, keep `pnpm-lock.yaml` as the sole lockfile, and do not recreate `package-lock.json`.
- Keep Firestore behavior unchanged except for isolated cleanup required by the component refactor.
- Never print environment values or Cloudinary credentials.
- Never import server-only Prisma, Cloudinary, or password code into Client Components.
- Upload and verify media before changing live application references.
- Keep old Cloudinary assets untouched.
- Remove repository media only after Cloudinary, database, route, and build verification pass.
- Commit in small, reviewable phases.

## Phase 0 — Baseline and Safety Checks

### Files inspected

- `package.json`
- `.env.local` key names only
- `next.config.ts`
- `src/app/globals.css`
- all landing-page sections
- Classic Rose template components
- `src/lib/invitations.ts`
- `src/lib/dummy-data/wedding/dummy-wedding.ts`
- Firestore setup and wishes component
- dynamic media under `public/images/SAMPLE` and `public/images/dummy-couples`

### Actions

1. Confirm the worktree is clean before implementation.
2. Record the current public routes and invitation slugs.
3. Run the existing build and ESLint command to capture baseline failures.
4. Record exact local dynamic-media file count and size.
5. Generate a source-reference report for local image paths and old Cloudinary URLs.
6. Confirm required environment key names without displaying values.

### Gate

Do not install or modify anything until baseline results are recorded. Existing failures must be distinguished from regressions introduced by this work.

## Phase 1 — Dependencies, Scripts, and Environment Contract

### Dependencies

Add compatible releases for:

- Prisma CLI and Prisma Client;
- PostgreSQL driver and Prisma PostgreSQL adapter;
- Auth.js for Next.js;
- Cloudinary Node SDK;
- Zod validation;
- a deployment-safe password hashing package;
- Vitest and minimal testing utilities.

Use stable versions compatible with the audited runtime Node.js 24.15.0, Next.js 16, React 19, Vercel, PostgreSQL, and the selected Prisma generation model. Select the Prisma major version from current official compatibility guidance and document the generator, driver-adapter, migration, and deployment implications.

### Files

- `package.json`
- `pnpm-lock.yaml`
- `.env.local`
- `.env.example`
- `prisma.config.ts`

### Actions

0. Correct the historical Stage 1 npm assumption before Phase 3: pin the approved pnpm version, regenerate `pnpm-lock.yaml` from `package.json`, remove `package-lock.json`, and prove a frozen pnpm install.
1. Replace the obsolete `next lint` script with an ESLint command compatible with Next.js 16.
2. Add scripts for type checking, tests, Prisma generation, migration, seed, Studio, media migration, media verification, and administrator bootstrap.
3. Add safe placeholder names to `.env.example`.
4. Rename Cloudinary API key and secret variables in `.env.local` to server-only names without exposing their values.
5. Add local `DATABASE_URL`, initially using the approved Laragon database contract.
6. Add an `AUTH_SECRET` value locally using a cryptographically strong generated value.
7. Leave `ADMIN_EMAIL` and `ADMIN_PASSWORD` as required bootstrap inputs if their values are not already supplied.

### Tests

- Environment validation fails with a clear key-name-only message when required values are missing.
- Client-side source contains no reference to `CLOUDINARY_API_SECRET`, `CLOUDINARY_API_KEY`, `DATABASE_URL`, or `ADMIN_PASSWORD`.

## Phase 2 — Prisma Schema and Database Foundation

> Correction history: Stage 2A added the required hero relation through the third forward-only migration. Stage 2B must add nullable `galleryVideoUrl` through a fourth forward-only migration before Phase 3 begins.

### Files

- `prisma/schema.prisma`
- `prisma/migrations/**`
- `src/lib/server/db.ts`
- `src/lib/server/env.ts`
- `src/generated/prisma/**` or the generator output selected for the compatible Prisma release

### Schema

Implement:

- `Invitation`
- `Partner`
- `Event`
- `GalleryItem`
- `LoveStory`
- `GiftAccount`
- `InvitationSections`
- `MediaAsset`
- `User`
- enums for partner role, user role, and media resource type

Add unique keys and indexes required by slug lookup, ordered child records, public IDs, and normalized email lookup.

`Invitation` must have a required indexed `heroAssetId` relation to `MediaAsset` with `onDelete: Restrict`. This relation is the sole source for `couple.heroImage` and is independent from gallery ordering.

`Invitation` must also preserve the optional external `galleryVideoUrl` scalar used by the existing gallery embed. It is not a Cloudinary media relation.

### Actions

1. Initialize Prisma using PostgreSQL without provisioning a hosted Prisma database.
2. Configure direct TCP access to the existing Laragon PostgreSQL service.
3. Create a development-safe singleton Prisma Client.
4. Generate the first named migration.
5. Apply it only to the local `ayawarta` database.
6. Inspect the resulting schema through Prisma validation and a direct query.

### Tests

- `prisma validate` passes.
- `prisma generate` passes.
- Local migration applies cleanly.
- A connection smoke test succeeds against `ayawarta`.

## Phase 3 — Domain Types, Repository, and Mapper

### Files

- `src/features/invitations/types.ts`
- `src/features/invitations/repository.ts`
- `src/features/invitations/mapper.ts`
- `src/features/invitations/mapper.test.ts`
- existing template types updated to import from the domain layer

### Actions

1. Extract the current `InvitationData` shape from the dummy-data module into a stable domain type.
2. Implement one server-only repository query that loads an invitation with ordered relations and media.
3. Map Prisma results to the existing template contract.
4. Map the explicit required hero relation to `couple.heroImage`.
5. Map nullable `galleryVideoUrl` to the gallery contract, using an empty string only at the compatibility boundary when the gallery exists without a video.
6. Preserve optional gallery, love story, gifts, and music semantics.
7. Return `null` for missing slugs.
8. Remove data-access concerns from template components.

### Tests

- Complete invitation maps correctly.
- Required hero media maps independently from gallery order.
- A persisted gallery-video URL is preserved, while null maps to the existing empty-string compatibility value.
- Disabled or absent optional sections map correctly.
- Gallery and event ordering is stable.
- Audio URLs map correctly.
- Missing slug behavior remains distinguishable from the default preview.

## Phase 4 — Admin Authentication

### Files

- `src/auth.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/admin/login/page.tsx`
- `src/app/admin/page.tsx`
- route-protection entry point appropriate for Next.js 16
- `src/features/auth/schema.ts`
- `src/features/auth/password.ts`
- `src/features/auth/service.ts`
- `src/features/auth/types.d.ts`
- `scripts/bootstrap-admin.ts`
- authentication tests

### Actions

1. Configure Auth.js Credentials with JWT sessions.
2. Validate email and password server-side with Zod.
3. Normalize email before lookup.
4. Verify the password hash in server-only code.
5. Reject inactive and locked accounts with a generic failure.
6. Increment and lock repeated failed attempts; reset counters on success.
7. Extend the session/JWT type with user ID and role.
8. Protect `/admin/*` while leaving `/admin/login` public.
9. Build an AyaWarta-styled login page using the approved design tokens.
10. Build a minimal protected admin landing page and logout action.
11. Implement idempotent admin bootstrap from environment values.

### Tests

- Invalid input is rejected.
- Unknown email and wrong password return the same public result.
- Inactive and locked users cannot log in.
- Valid administrator receives the correct role in the session.
- Protected routes redirect unauthenticated visitors.
- Login page remains accessible.
- Bootstrap does not create duplicate administrators.

## Phase 5 — Cloudinary Migration Tooling

### Files

- `src/lib/server/cloudinary.ts`
- `src/features/media/public-id.ts`
- `src/features/media/public-id.test.ts`
- `scripts/data/invitation-media-manifest.ts`
- `scripts/migrate-invitation-media.ts`
- `scripts/verify-invitation-media.ts`
- ignored generated migration report under a dedicated local output directory

### Manifest Coverage

- Local media from `public/images/SAMPLE`.
- Local media from `public/images/dummy-couples`.
- Existing Cloudinary images for `shidqi-mita`.
- Existing Cloudinary images and audio for `dudi-aini`.
- Explicit production media for `default-preview`.
- One explicit hero manifest entry for each production invitation slug.

### Actions

1. Encode a typed manifest with invitation slug, category, source, target public ID, alt text, and order.
2. Validate target public IDs use `ayawarta/production/invitations/{slug}/...`.
3. Upload local sources and remote old-account URLs to the new account.
4. Use safe deterministic behavior so reruns converge instead of creating duplicates.
5. Persist a local report containing public IDs, secure URLs, metadata, checksums where available, and errors.
6. Never include credentials in the report.
7. Verify each delivered URL and resource type.

### Tests

- Public-ID generation rejects traversal and invalid slug/category input.
- Expected manifest count matches source count.
- A dry-run prints only paths, categories, and public IDs.
- Real run reports success or a precise asset-level failure.
- Rerun does not create duplicate public IDs.

### Gate

Do not update invitation records or remove local files unless every required production asset verifies successfully in the new Cloudinary account.

## Phase 6 — Idempotent Production-Data Seed

### Files

- `prisma/seed.ts`
- typed seed-data modules under `prisma/data/`
- shared media migration report reader

### Actions

1. Convert current hard-coded invitations into typed seed records.
2. Resolve every dynamic-media relation from the verified Cloudinary report.
3. Upsert invitations by slug.
4. Upsert media by public ID.
5. Resolve and assign each invitation's required `heroAssetId` from the verified media report.
6. Preserve the `default-preview` gallery-video URL as `galleryVideoUrl`; normalize empty legacy gallery-video strings for other invitations to null.
7. Replace ordered child relations inside a controlled transaction.
8. Seed `rika-fauzi`, `shidqi-mita`, `dudi-aini`, and `default-preview` as production records.
9. Keep owner relations null unless the bootstrap administrator is explicitly assigned.
10. Run the seed twice and compare record counts.

### Tests

- First seed creates the expected records.
- Second seed produces no duplicates.
- Every hero, partner, gallery item, and music reference points to a valid `MediaAsset`.
- Repository queries reconstruct all four invitations.

## Phase 7 — Public Route Cutover

### Files

- `src/app/[slug]/page.tsx`
- `src/app/[slug]/invite/page.tsx`
- `src/app/(templates)/wedding/classic-rose/[variant]/page.tsx`
- data-loading helpers or route handlers required by the invite-link page
- `next.config.ts`

### Actions

1. Replace hard-coded invitation lookup with the Prisma repository.
2. Call Next.js `notFound()` for unknown slugs.
3. Make the default preview an explicit slug-driven record.
4. Keep template props compatible through the mapper.
5. Load invite-link data through a server boundary rather than importing server data into a Client Component.
6. Keep Cloudinary allowed in Next Image configuration.
7. Add image sizing hints where useful without changing composition.

### Tests

- All four production records render.
- Unknown slug returns 404.
- Invite-link generator renders correct couple and event data.
- Client bundles do not contain database or Cloudinary secrets.

## Phase 8 — Tailwind Design System and UI Refactor

### Files

- `src/app/globals.css`
- `src/components/ui/Container.tsx`
- `src/components/ui/Button.tsx`
- `src/components/ui/IconButton.tsx`
- `src/components/ui/SectionHeader.tsx`
- selected invitation image-frame primitive
- `src/lib/cn.ts`
- landing data/config modules
- landing components renamed to PascalCase
- shared motion configuration

### Actions

1. Add Tailwind v4 CSS-first semantic tokens based on the existing palette and measurements.
2. Add a minimal class-composition helper only if component variants require it.
3. Extract the approved shared UI components.
4. Move static landing content to typed config modules.
5. Remove unnecessary page-level and section-level `use client` directives.
6. Keep interactive islands small.
7. Consolidate Framer Motion presets and reduced-motion behavior.
8. Normalize file naming and imports.
9. Improve focus states, `aria-current`, image alternatives, form semantics, and touch targets.
10. Fix only demonstrated responsive or overflow defects.

### Visual Guardrails

- Preserve page section order.
- Preserve AyaWarta blue palette and typography.
- Preserve landing artwork and existing theme imagery.
- Preserve pricing, themes, testimonials, and Classic Rose composition.
- Avoid new visual motifs, generic dashboard styles, or broad layout changes.

### Tests

- Keyboard traversal works on navigation, carousels, forms, and admin login.
- Reduced-motion preference disables nonessential movement.
- No horizontal overflow at representative mobile widths.
- Existing desktop composition remains recognizable.

## Phase 9 — Firestore Isolation and Wishes Hardening

### Files

- `src/lib/firebase.ts`
- `WishesSection.tsx` or extracted wishes client components

### Actions

1. Keep the existing Firestore collection structure.
2. Isolate Firestore logic in the smallest client boundary.
3. Preserve real-time subscription cleanup.
4. Add explicit loading, empty, submit-in-progress, and failure states if absent.
5. Keep attendance values compatible with existing stored records.

### Tests

- Subscription starts and unsubscribes correctly.
- Submission validation prevents empty wishes or missing attendance.
- Existing records render without schema migration.

## Phase 10 — Destructive Repository Cleanup

### Preconditions

All must pass:

- new Cloudinary URLs verified;
- local database migration and seed verified;
- repository queries verified;
- four invitation routes smoke-tested;
- production build passed;
- source scan confirms no remaining dynamic local-media references.

### Actions

1. Remove `public/images/SAMPLE`.
2. Remove `public/images/dummy-couples`.
3. Remove hard-coded invitation data superseded by Prisma.
4. Remove obsolete dummy-data files only after all imports are migrated.
5. Remove unused dependencies and dead comments discovered within touched code.
6. Record repository-size reduction.

### Recovery

The deleted repository files remain recoverable from Git history. Old Cloudinary assets remain untouched.

## Phase 11 — Documentation and Deployment Readiness

### Files

- `README.md`
- `.env.example`
- `docs/deployment-aiven-vercel.md`
- `docs/media-management.md`

### Actions

1. Document architecture and ownership boundaries between PostgreSQL, Cloudinary, and Firestore.
2. Document local Laragon setup and migration commands.
3. Document administrator bootstrap and password-change procedure.
4. Document Cloudinary folder conventions and safe migration reruns.
5. Document Aiven TLS connection requirements without including credentials.
6. Document Vercel variable setup, migration order, seed, deployment, verification, and rollback.

## Final Verification Sequence

Run in this order:

1. Prisma format, validate, and generate.
2. Type checking.
3. Unit and integration tests.
4. ESLint.
5. Cloudinary manifest and URL verification.
6. Seed idempotency check.
7. Next.js production build.
8. Route smoke tests for landing, four invitations, invite-link page, admin login, protected admin page, and 404.
9. Firestore wishes smoke test.
10. Git diff review for credentials, unintended visual changes, and unrelated edits.

## Commit Strategy

Suggested commits:

1. `chore: add prisma and environment foundation`
2. `feat: add invitation database schema and repository`
3. `feat: add admin authentication`
4. `feat: add cloudinary media migration tooling`
5. `data: migrate invitation records to prisma`
6. `refactor: load invitations from postgres`
7. `refactor: organize landing UI and design tokens`
8. `chore: remove migrated dynamic media`
9. `docs: document local and production operations`

Commit boundaries may be combined when a dependency cannot be kept buildable independently, but each commit should remain understandable and reversible.

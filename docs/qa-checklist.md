# AyaWarta QA and Review Checklist

## How to Use

The programmer completes stage-specific items and attaches evidence. The reviewer independently checks the diff and critical outputs before accepting the stage.

## Every Stage

- [ ] Scope matches the assigned stage.
- [ ] Required documents were read.
- [ ] Unrelated files are unchanged.
- [ ] No credential values appear in source, output, fixtures, or reports.
- [ ] Commands and results are reported accurately.
- [ ] New failures are distinguished from baseline failures.
- [ ] The agent stopped before the next stage.

For documentation-only work, compare factual claims with the current source, check local links and command names, mark runtime checks `not_run` when no code changed, and preserve historical review/specification records. Do not use the old stage prompts as current commit authorization.

## Code Quality

- [ ] Server-only modules cannot enter client bundles.
- [ ] Types express domain constraints without broad `any` use.
- [ ] Repeated behavior is centralized only when the abstraction is meaningful.
- [ ] Comments explain intent or constraints, not obsolete implementation history.
- [ ] Errors are handled at the correct boundary.
- [ ] No unrelated dependency or formatting churn.

## Package Manager and Reproducibility

- [ ] `package.json#packageManager` pins the approved pnpm version.
- [ ] `pnpm-lock.yaml` is the sole dependency lockfile.
- [ ] `package-lock.json` does not exist.
- [ ] `pnpm install --frozen-lockfile` succeeds.
- [ ] Dependency and script verification uses pnpm consistently.

## Database

- [ ] Prisma schema matches `docs/database-schema.md`.
- [ ] Unique constraints protect slugs, roles, order, and public IDs.
- [ ] Foreign-key delete behavior is intentional.
- [ ] Every invitation has a required indexed hero `MediaAsset` relation with `Restrict`; hero is not inferred from gallery order.
- [ ] Optional `galleryVideoUrl` persists external embed content; empty legacy values normalize to null and are not converted to `MediaAsset`.
- [ ] Migration is committed and validates locally.
- [ ] Production migration was not run.
- [ ] Seed is idempotent.
- [ ] Four required invitation slugs reconstruct through the repository.
- [ ] Unknown slug returns `null` at repository level.

## Cloudinary

- [ ] Only dynamic invitation media is included.
- [ ] All targets use `ayawarta/production/invitations/{slug}`.
- [ ] Target public IDs are deterministic and unique.
- [ ] New account cloud name is verified without exposing credentials.
- [ ] Expected and actual counts match.
- [ ] Exactly one verified hero manifest entry exists for every production invitation slug.
- [ ] Delivery URLs and resource types are verified.
- [ ] Old-account resources remain untouched.
- [ ] Local assets remain until cleanup approval.

## Authentication

- [ ] No public registration.
- [ ] Email normalized before lookup.
- [ ] Password hashing and comparison are server-only.
- [ ] Generic login failure prevents email enumeration.
- [ ] Lockout behavior is tested.
- [ ] Successful login resets failures.
- [ ] Inactive and unauthorized users are rejected.
- [ ] JWT/session exposes only approved fields.
- [ ] `/admin/*` is protected and `/admin/login` remains accessible.
- [ ] Bootstrap is idempotent and produces safe output.

## Firestore

- [ ] Existing collection path remains unchanged.
- [ ] Existing attendance values remain compatible.
- [ ] Real-time subscription cleanup remains correct.
- [ ] Loading, empty, error, and submission states work.
- [ ] PostgreSQL is not introduced into the real-time wishes path.

## UI and Accessibility

- [ ] AyaWarta visual identity remains recognizable.
- [ ] Section order and principal artwork are preserved.
- [ ] No accidental horizontal overflow.
- [ ] Mobile, tablet, desktop, and wide desktop checked.
- [ ] Keyboard focus is visible.
- [ ] Icon-only controls have accessible labels.
- [ ] Active navigation exposes `aria-current`.
- [ ] Meaningful images have appropriate alt text.
- [ ] Forms associate labels and errors.
- [ ] Reduced-motion behavior is verified.
- [ ] Intentional visual differences are documented.

## Automated Verification

For Stage 11, the one-time media migration scripts are retired. Validate the portable canonical catalog in unit tests and use `pnpm media:verify-upload` only where the ignored Stage 5B report is available. `pnpm seed:verify` is local-only.

- [ ] Prisma format.
- [ ] Prisma validate.
- [ ] Prisma generate.
- [ ] TypeScript check.
- [ ] Unit tests.
- [ ] Database integration tests.
- [ ] ESLint.
- [ ] Next.js production build.
- [ ] Seed idempotency.
- [ ] Cloudinary manifest/URL verification.
- [ ] Secret scan.
- [ ] Stale local-media reference scan.

## Route Smoke Tests

- [ ] `/` landing page.
- [ ] `/default-preview`.
- [ ] `/rika-fauzi`.
- [ ] `/shidqi-mita`.
- [ ] `/dudi-aini`, including audio.
- [ ] `/{slug}/invite` for an active invitation.
- [ ] Unknown invitation route returns 404.
- [ ] Firestore wishes read and submit.
- [ ] `/admin/login`.
- [ ] `/admin` unauthenticated redirect.
- [ ] `/admin` authenticated access.
- [ ] Logout removes access.

## Cleanup Approval

Stage 10C completed the approved deletion of 12 dynamic images and two legacy data modules. The checklist below remains the gate record for any future destructive cleanup; do not interpret it as a request to repeat the deletion.

Local dynamic media and hard-coded invitation sources may be removed only when every item below is checked:

- [ ] All production media verified in the new account.
- [ ] Seed passed twice.
- [ ] Four invitations render from Prisma.
- [ ] Audio verified.
- [ ] Full production build passed.
- [ ] No remaining runtime dependency on local dynamic media.
- [ ] Reviewer explicitly accepted the cleanup stage.

## Final Release-Readiness Report

The final report must include:

- commit range reviewed;
- tests and builds with outcomes;
- external data effects;
- repository-size change;
- known risks;
- deferred work;
- exact Neon/Vercel cutover steps still requiring owner authorization.

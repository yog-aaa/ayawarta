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
- [ ] Any production migration has its own exact target authorization, snapshot evidence, and read-only postcheck; local tests alone do not authorize it.
- [ ] Seed is idempotent.
- [ ] Four required invitation slugs reconstruct through the repository.
- [ ] Unknown slug returns `null` at repository level.

### A2/T2 authored schema gate

The following checks describe the draft/Siger contract. The migration and four version-1 baselines were applied to the separately approved production Neon target on 2026-10-30. Do not connect to the operator's local `DATABASE_URL`, which points to production, to complete integration tests. Use an explicitly verified isolated target.

- [ ] New draft, publication, pin, greeting/prayer, caption, and published-version columns match `prisma/schema.prisma` and the reviewed additive migration.
- [ ] One active draft per existing invitation uses optimistic `draftVersion` and `basePublishedVersion` checks; a new draft does not create a public `Invitation` row.
- [ ] Existing edit is gated on a verified version-1 baseline for each of the four production invitations; the migration itself does not write baselines.
- [ ] Each baseline/publication stores a complete restorable snapshot, digest, and exact media pins; immutable history and restrictive media references prevent accidental update or deletion.
- [ ] Draft media IDs are limited to assets belonging to the same existing invitation; a new draft cannot reuse another customer's media.
- [ ] The public repository's legacy select excludes new columns for Classic Rose compatibility; a published Siger row receives a full reread for authored fields. The four original slugs still reconstruct without reading drafts.
- [ ] Only exact Classic Rose/color and Siger Priangan/ivory theme pairs parse; optional greeting/prayer and gallery alt/caption preserve Classic Rose behavior. Illustrative Siger copy and defaults remain religion-neutral.
- [ ] Admin editor and private preview do not publish automatically; the explicit A4 review and confirmed publish action is separate. The four initial baselines were verified on Neon.

**Isolated database evidence (2026-10-30):** All five migrations were applied to a temporary PostgreSQL 18.2 cluster at `127.0.0.1:55432/ayawarta_a2`. Database tests verified baseline idempotency, compare-and-swap conflict rejection, immutable publication triggers, draft-version `CHECK` constraints, publication-media `Restrict` foreign keys, and baseline/seed lock visibility across two connections. This is local verification only: no Neon migration or customer invitation write occurred. The temporary cluster and database were stopped and removed, with port 55432 closed and the temporary path absent; these results do not authorize production draft editing, publication, or Siger customer activation.

### A3/T3 editor and static template gate

The A3/T3 code gates below have automated and visual evidence, but live admin editing and public-customer smoke remain pending an isolated migrated environment. The isolated A2 database evidence above does not verify the new UI or routes; the later Neon baseline activation verified only snapshots and pins.

- [ ] `/admin/invitations/new` creates only a private draft; existing edit opens only after a verified baseline and published slug stays read-only.
- [ ] Draft save uses the expected version, rejects stale concurrent writes, retains partially complete content, and never mutates the public invitation.
- [ ] Published and new-draft lists remain separate; draft-index failure leaves the published list usable and hides editor actions in that list.
- [ ] Editor media choices are deliverable, resource-type correct, and tied to the same invitation; a shared legacy asset may remain only in its original published slot. New drafts have no selectable customer media until provisioning.
- [ ] Private preview reads the saved draft only, disables caching, shows incomplete-field guidance or missing-photo placeholders, and never mounts a writable Firestore wishes adapter for either theme.
- [ ] `/wedding/siger-priangan/ivory` renders the illustrative read-only sample; invalid variants and unknown invitation slugs return 404 without sample fallback.
- [ ] `/{slug}` dispatches only exact theme/variant pairs; existing Classic Rose slugs retain their behavior, and Siger public rendering uses published records only.
- [ ] Siger static CSS, placeholder media, section visibility, long content, focus, and narrow/wide viewport behavior are reviewed; the T4 motion slice is implemented, while live reduced-motion/keyboard checks and verified runtime artwork remain open gates.
- [ ] No customer invitation write, Cloudinary upload, theme activation, or publish action is inferred from A3/T3 source, the Neon migration, or baseline activation.

**A3/T3 implementation evidence (2026-10-30):** Hermetic Vitest passed 57 files and 772 tests, including admin action/auth/media/preview tests, Siger route and initial-HTML checks, neutral Siger invite-link copy, and read-only preview gateway assertions for both themes. TypeScript, full ESLint, `git diff --check`, and Next.js production build passed with a process-local loopback `DATABASE_URL`. The build generated the new admin editor/preview and Siger routes. Browser inspection of the illustrative Siger route covered cover and all sections at 390 and 1280 px; overflow checks passed at 360, 390, 430, 768, 1280, and 1440 px. The browser also confirmed event details exist before opening the invitation. The local public-customer smoke at `/default-preview` was blocked by the repository's database-host guard because the running dev server targets non-loopback Neon; no guard bypass, Neon migration, seed, or customer-content write was performed. Admin browser save/Back/Forward checks await an isolated migrated database. The pinned pnpm frozen-install gate was not rerun: the sandboxed shim could not create its AppData link and Corepack could not fetch the pinned version; installed local Node binaries ran the code checks. This build is not deployment evidence.

**T4 motion slice evidence (2026-11-12):** The illustrative `/wedding/siger-priangan/ivory` route was inspected on a local process with loopback-only database variables. Browser widths 360, 390, 430, 768, 1280, and 1440 px showed no horizontal overflow. Normal scrolling changed decorative cover, portrait, event, and gallery transforms; the heading, button, and form remained static. Source and focused tests confirm that the CSS animations are gated by View Timeline support and `prefers-reduced-motion: no-preference`, with static base styles. Frozen pnpm install, Prisma format/validate/generate, TypeScript, ESLint, 880 hermetic tests (three skipped), offline media report (31/31), local audio verification (3/3), and Next.js production build passed; the first sandbox build failed only because Google Fonts could not be fetched, then passed with network access. A live reduced-motion browser run, keyboard focus traversal without the development toolbar, cross-browser behavior, low-power device performance, and Cloudinary delivery of Siger art remain unverified. The paper-edge PNG is a local concept only; final cultural review and runtime asset approval are pending. This evidence does not close the full T4 media gate or enable Siger publication.

**T4 visual correction (2026-11-12):** Owner review found the motion too faint and correctly noted that the generated paper-edge image was not rendered. The follow-up keeps that PNG concept outside runtime but gives the CSS sheet visible mobile gutters, side ribs, and section folds, including a cover edge. At 322 px, the local browser showed a 293 px cover and 289 px reading sheet without horizontal overflow. Browser-computed section-fold and portrait transforms changed during normal scrolling; the section fold used the local `--siger-section` View Timeline. At 1280 px, the cover remained 440 px and the reading sheet 760 px, centered without horizontal overflow. Source review and focused tests passed. Live reduced-motion browser and low-power performance checks remain open.

**T4 browser QA follow-up (2026-11-12):** [Local browser evidence](reviews/siger-priangan-t4-browser-qa-2026-11-12.md) closes the previously open live reduced-motion check and confirms keyboard entry plus no horizontal overflow at 360/390/430/768/1280/1440 px. Windows animation effects were restored to their original On state after the test. Cross-browser, low-power performance, and reviewed Cloudinary artwork remain open; T4 is not complete.

**T4 cultural visual concept (2026-11-12):** The owner requested a complete design before practitioner review. The preview now uses a lightweight abstract SVG contour, repeatable edge geometry, and connected paper folds; the two new transparent PNGs remain [source concepts for review](design/siger-priangan-cultural-review.md), not runtime images. Local 390/1280 px visual inspection found no horizontal overflow. Focused Siger tests, TypeScript, scoped ESLint, and `git diff --check` passed. Practitioner review, approved runtime-art delivery, cross-browser, and low-power performance gates remain open; no claim of cultural authenticity or publication is implied.

**T4 section-composition follow-up (2026-11-12):** The illustrative Siger preview now distinguishes profile paper panels, a centered single-event schedule insert, a vertical story timeline, neutral empty gallery mats, a gift note, and a closing seal. Local browser inspection covered the mobile guest flow and desktop event/album composition; widths 360/390/430/768/1280/1440 px had zero horizontal overflow, and the one-event insert remained full width on mobile and centered at a 500 px cap on larger screens. Four focused Siger test files (8 tests), TypeScript, scoped ESLint, and `git diff --check` passed. The existing reduced-motion CSS gate remains; cross-browser, low-power performance, cultural review, and approved Cloudinary artwork are still open.

### T5 Siger local test readiness

The T5 source adds a seventh landing theme card for the illustrative Siger `ivory` route. It labels the card as a premium concept without package or price availability. The admin editor can save and preview Siger drafts, but its publication action is exposed only when the server's Siger switch is enabled on the fixed disposable target. `AYAWARTA_SIGER_PUBLISH=enabled` is necessary but insufficient: both `DATABASE_URL` and `DATABASE_URL_POOLED` must be PostgreSQL URLs for exact `127.0.0.1:55436/ayawarta_siger` without query or fragment, and neither `VERCEL_ENV` nor `AYAWARTA_DEPLOYMENT_TARGET` may equal `production`. The server rechecks the gate during publication. T5 does not activate Siger customer invitations in Production.

- [x] Focused landing tests confirm seven theme cards, Siger's `/wedding/siger-priangan/ivory` link, its illustrative premium label, and search/filter behavior without a package or price change.
- [x] Gate tests reject an unset switch, a different host, port or database, a URL query, and either Production marker; the editor hides publication controls while the gate is off.
- [x] On an empty, fully migrated disposable PostgreSQL target at `127.0.0.1:55436/ayawarta_siger`, the isolated test created a Siger draft, verified private 404 before publication, made four fake Cloudinary uploads, rejected publication while the flag was off, then reviewed and published after enabling it. It verified a version-1 `PUBLISH` snapshot with four media pins.
- [x] The isolated public route returned the authored greeting/prayer, gallery alt text/caption, guest name, and event address after publication; an unknown slug still returned null. The published row contained the authored events and story.
- [ ] Final route/browser review confirms the authored wedding date display, Classic Rose slugs, invite links, and Firestore guest behavior alongside T5.
- [ ] Local browser review covers the seven-card landing, admin save/preview/review, normal and reduced-motion Siger views, keyboard focus, narrow and wide layouts, and no horizontal overflow. Record any cross-browser or low-power gaps separately.
- [ ] Concept PNGs remain source-only outside `public` and Cloudinary; practitioner review and verified runtime artwork are separate gates before a claim of cultural authenticity or Production Siger activation.

**T5 isolated QA evidence (2026-11-12):** PostgreSQL at `127.0.0.1:55436/ayawarta_siger` had six finished migrations and zero users, invitations, drafts, and media assets before the opt-in flow. One end-to-end database test passed with an injected fake Cloudinary client. Seven focused files passed 65 tests; TypeScript, scoped ESLint, and `git diff --check` passed. No Neon or real Cloudinary contact occurred. The broader browser, cultural, cross-browser/low-power, and reviewed runtime-art gates above remain open. These local results do not claim Production Siger publication, customer invitation conversion, package change, concept-art upload, or deployment.

**T5 local browser spot check (2026-11-12):** The in-app browser at `localhost:3000` showed the seventh Siger premium card at about 390 px and centered below the six Classic Rose cards at 1280 px. Its accessible preview link opened `/wedding/siger-priangan/ivory`. The illustrative sample showed its section headings and read-only RSVP/wishes, with the mobile cover and reading content visible at 390 px and the desktop reading sheet visible at 1280 px. This spot check did not cover admin browser save, a new reduced-motion run, cross-browser behavior, or final T4 artwork review; the broader browser checklist remains open.

**T4 invitation-scene revision (2026-11-12):** The owner clarified that the video is inspiration for the experience *inside* a scrolling invitation, not a three-phone promotional layout. The [motion storyboard](design/siger-priangan-motion-storyboard.md) and preview now contain six distinct scenes, including a layered paper horizon, an ink-green event recess, and album backing motion. Two original local SVGs total about 2.7 KB; no customer photo, Cloudinary object, or database record was changed. In the in-app browser, the illustrative preview showed normal scrolling and readable content at 390 and 1280 px, with a 760 px desktop reading sheet. Responsive overflow checks at 360, 390, 430, 768, 1280, and 1440 px found no horizontal overflow. Source tests confirm the `prefers-reduced-motion: no-preference`/View Timeline gate and complete static base styles. Live reduced-motion, cross-browser, low-power performance, owner-photo rendering, and cultural-art review remain open.

**T4 visible-motion correction (2026-11-12):** The first scene implementation felt flat because small pseudo-elements moved slowly over `entry 0% exit 100%`, and section-timed cards settled before they entered the viewport. Large decorative planes now travel roughly 50–80 px during a concentrated section range. Profile, event, story, and gallery cards use their own `view(block)` entry range, starting at no less than 0.88 opacity and settling before they are fully visible. The hero scene follows its lede with a 24 px gap, and the event plane begins after the heading, avoiding the text/contrast overlap found during browser QA. At 390 px, the event card changed from `translateY(42px)` below the viewport to `translateY(11.4px)` when its top reached 644 px, then to identity at 399 px; the lead gallery figure moved from a 0.979 scale and 18.8 px offset at 734 px to identity at 478 px. Main headings and forms stay fixed. The final responsive overflow check again passed at 360, 390, 430, 768, 1280, and 1440 px.

**T4 closed-cover and stronger-motion follow-up (2026-11-12):** The user requested a separate closed invitation before the contents and a busier opening. The hydrated page now hides and locks the inner document until **Buka Undangan** is activated. A 1.7-second paper-leaf/cover/hero sequence opens it, while reduced-motion opens immediately. The server-rendered document remains reachable with JavaScript disabled through a `noscript` style fallback. The first browser reload was observed with `data-gate="ssr"` and the content already hidden, avoiding a pre-hydration flash; the click moved through `opening` to `open`, restored body scrolling, and focused `#siger-content`. Mobile and 1280 px desktop cover views showed no horizontal overflow; the event card remained legible on scroll. Eleven focused Siger tests, TypeScript, scoped ESLint, `git diff --check`, and a local Next production build with dummy localhost database configuration passed. The first build attempt lacked access to existing Google Fonts; the network-enabled repeat passed. The existing `baseline-browser-mapping` age warning remains. Live reduced-motion browser emulation, low-power smoothness, and cultural-art review remain open. No production database, Cloudinary, or Vercel write was made.

The stronger-motion revision passed 894 unit tests (4 skipped) before the final scope cleanup. After cleanup, the 11 focused Siger tests, scoped ESLint, TypeScript, and a local Next production build with dummy local service configuration passed. One earlier Turbopack run hit a transient internal Google Font resolver error; the immediate repeat and final build compiled successfully and generated every route. The existing `baseline-browser-mapping` age warning remains. No production database, Cloudinary, or Vercel write was made. Live reduced-motion emulation and low-power-device smoothness remain separate checks.

The revision passed 893 unit tests (4 skipped), full ESLint, TypeScript, `git diff --check`, and a local Next production build with dummy local service configuration. The first test run used `.env.local` pointing to Neon and correctly failed the local-only Prisma guard; the passing run supplied a non-connecting `127.0.0.1/ayawarta` test URL. The first build could not fetch existing Google Fonts from the sandbox; its repeat with network access compiled and generated all routes. Neither verification wrote to production services.

### A4 explicit publication gate

- [ ] A read-only review verifies the saved draft, current live version, complete baseline/current snapshots, media pins, and a guest-visible change summary.
- [ ] Only one authenticated admin role is needed. Publishing requires the expected draft/live versions and exact slug confirmation; a new invitation draft and Siger Priangan remain unpublishable in this stage.
- [x] The serializable transaction updates live content, ordered children, immutable publication history, pins, and a rebased retained draft atomically. A failed transaction leaves the previous public version and draft intact.
- [ ] Pre-commit failures remain retryable after correction; a post-commit public read failure is marked `committedUnverified` and prevents a blind retry.
- [ ] A synchronized retained draft is labeled separately from a draft with unpublished changes; guest-visible no-op publication is rejected.
- [x] The guarded Neon baseline run was separately authorized for `ep-mute-water-azaf9oyl:ayawarta:neondb_owner`. The 2026-10-30 write reported 4 of 4 matching, and a later read-only check reported **4 matching, 0 missing**. This operation did not edit live invitation content.
- [ ] Customer-content publication has not been exercised on Neon; perform editor and public-route smoke only with a separately authorized customer change or isolated fixture.

The A4 media gate checks invitation ownership, resource type, the original slot for shared assets, and a canonical Cloudinary HTTPS delivery URL. It does not make a fresh network request to Cloudinary before each publish, so this gate cannot detect an asset deleted externally after catalog verification. New media provisioning remains outside A4.

**A4 isolated transaction evidence (2026-10-30):** Five migration SQL files were applied to a separate temporary PostgreSQL 18.2 database at `127.0.0.1:55433/ayawarta_a4`. The opt-in `publish-repository.db.test.ts` injected a failure at publication creation after the live aggregate rewrite and verified that the full snapshot digest, public version, and draft remained unchanged. It then verified a successful version-2 publication with ordered children, immutable snapshot and media pins, a rebased retained draft, and rejection of a repeat no-op publish. This test used an injected Prisma client against the isolated database; it did not connect to Neon. The temporary cluster was stopped and removed afterward; port 55433 is closed.

**A4 final code checks (2026-10-30):** Frozen pnpm install, Prisma format/validate/generate, TypeScript, ESLint, production build, and `git diff --check` passed. Hermetic Vitest passed 61 files and 815 tests; the opt-in isolated PostgreSQL test passed separately (one test). The Cloudinary report verified 31/31 assets and 4/4 hero/audio records. Read-only route smoke on temporary localhost port 3002 passed the four published invitations, invite-link and template routes, and unknown-slug 404 cases. The login page returned HTTP 200 and unauthenticated admin list redirected to login; an authenticated A4 browser publish was not exercised against customer data.

### A5 new-draft media and first-publication gate

- [x] Upload is disabled by default and refuses a mismatched target cloud. A4 existing-invitation editing stays available before the A5 database migration.
- [x] Every image upload checks bounded input bytes, file signature, decoded dimensions/pixels, a slot-sized derivative, and server-only credentials. No submitted URL or media ID is trusted.
- [x] A draft-owned reservation precedes Cloudinary upload. Repeating the same idempotency key and image returns the same verified asset; changing its bytes or slot is a conflict. A remote success followed by database failure remains recoverable without deleting the asset.
- [x] Only a verified asset owned by the exact draft can enter its saved payload, preview, and first publication. Cross-draft and legacy customer media IDs are rejected.
- [x] A new draft stays private on create/save/upload. Confirmed first publication atomically creates the public aggregate, ordered children, version-1 `PUBLISH` snapshot and pins, and a rebased retained draft. Fault injection rolls all database writes back.
- [x] Legacy version-1 `BASELINE` protection, A4 publication, all four public slugs, Siger publication block, Firestore read-only preview, and unknown-slug 404 remain intact.
- [x] Mobile picker, upload/recovery states, keyboard/focus, reduced motion, image payload/dimensions, and sanitized errors were checked on the isolated migrated browser fixture. No Production customer upload or publication is inferred from local evidence.

**A5 source verification (2026-10-31):** Frozen pnpm install, Prisma format/validate/generate, TypeScript, ESLint, production build, and `git diff --check` passed. Hermetic Vitest passed 69 files and 864 tests (two opt-in database files skipped in that run). Three opt-in A4/A5 tests passed on disposable PostgreSQL 18.2 at `127.0.0.1:55434/ayawarta_a5`: provenance constraints, late first-publication rollback/retry/reopen, and legacy A4 publication. The cluster was stopped and removed afterward. Fake Cloudinary tests cover readback, missing remote content, and preflight order; no live image upload occurred. The offline media report passed 31/31. Read-only AyaWarta smoke on localhost port 3001 passed ten public routes, login HTTP 200, and unauthenticated admin redirects. The full first run's two timing failures passed when rerun with two workers; the complete two-worker run passed. At this date the isolated browser gate and Production activation were still open; later results are recorded below.

**A5 Neon schema operation (2026-10-31):** After the owner verified a manual production snapshot from 09:36:15 UTC with no expiry, the approved `20261031060000_add_draft_media_provenance` migration was applied to `ep-mute-water-azaf9oyl:ayawarta:neondb_owner`. Read-only postcheck reported six finished migrations, an empty `DraftMediaProvision` table, release state `seeded`, and four matching baselines with none missing. That operation did not seed, upload, write customer invitation content, change Vercel, deploy, or push Git. A5 switches were default-off at this date; the later activation is recorded below.

**A5 activation (2026-11-11):** The [isolated browser gate](reviews/admin-a5-activation-gate-2026-11-11.md) passed upload, recovery, preview, publication, responsive, keyboard, and reduced-motion checks with a mocked provider. The [Production cutover](reviews/admin-a5-production-activation-2026-11-11.md) then passed staged feature-off and feature-on public/admin read-only smoke plus a non-mutating server-gate probe. No real customer image was uploaded or published during the cutover.

### A6 release-readiness gate

- [x] Current architecture, design, database, authentication, media, deployment, and admin-operation documents describe the A5 code and activation boundary.
- [x] A separate [production activation runbook](runbooks/admin-a5-production-activation.md) identifies the approved target, recovery path, deployment verification, stop points, and distinct media activation.
- [x] The release-state gate recognizes the A2 and A5 migration tables and accepts seeded databases with later legitimate admin rows; its tests include missing-table and additive-row cases.
- [x] Six committed migrations, repeatable seed, and release-state inspection were exercised on a disposable loopback PostgreSQL target. No Neon migration or seed was run during A6.
- [x] The editor's mobile validation links focus their fields; the mobile admin dialog closes and transfers focus on a desktop resize. The isolated browser showed no horizontal overflow from 360 to 1440 px.
- [x] Successful upload, idempotent retry, remote-success/database-failure recovery, draft preview, and first publication were demonstrated end to end with a mocked provider in the isolated browser. The code requires the canonical Cloudinary account identity, so a separate nonproduction account is not a compatible fixture. See the later A5 activation record above.

See the [A6 release-readiness report](reviews/admin-a6-release-readiness.md) for command outcomes, the isolated fixture, and remaining release conditions. A6 source review alone does not authorize Neon, Vercel, Cloudinary, customer-content, or Git writes.

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
- [ ] Existing `ADMIN` and legacy `SUPER_ADMIN` sessions share one product permission for read/edit/publish; server-side draft methods recheck the active admin without a separate super-admin gate.

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
- [ ] `/wedding/siger-priangan/ivory` illustrative, read-only sample; unknown Siger variant returns 404.
- [ ] `/{slug}/invite` for an active invitation.
- [ ] Unknown invitation route returns 404.
- [ ] Firestore wishes read and submit.
- [ ] `/admin/login`.
- [ ] `/admin` unauthenticated redirect.
- [ ] `/admin` authenticated access.
- [ ] `/admin/invitations` published list and separate new-draft list/fallback.
- [ ] `/admin/invitations/new`, saved-draft edit, and private saved preview with incomplete and missing-media states on an isolated migrated target.
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

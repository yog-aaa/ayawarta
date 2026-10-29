# AyaWarta admin panel implementation plan

## Basis and execution rule

Implement the approved [admin design](../specs/2026-10-29-ayawarta-admin-panel-design.md) one reviewed stage at a time. The owner approved one admin permission level, real invitation management, separate drafts, and explicit publication. This plan is reviewable work ordering; it does not authorize a production Neon migration, production content write, Cloudinary upload, deployment, or commit. The current local `DATABASE_URL` points at production Neon, so all development commands must be assessed as production-targeting unless a process-local dummy URL or a separately verified isolated database is used.

Use existing reusable roles under `docs/agent-workflow.md`: root owns contracts/integration, `frontend_engineer` owns admin UI, `backend_engineer` owns actions/validation, `data_engineer` owns schema/repositories, `qa_reviewer` performs independent review, and `documenter` updates existing docs. Give each touched file one owner before starting a stage. `frontend_engineer` may adapt audited MIT TailAdmin patterns, preserving required license notice for substantial copied code. Never import its npm lockfile, global CSS, auth routes, signup, or demo ecommerce pages.

## Shared contract before parallel implementation

Root records the exact list/editor/publish flow, route table, form payload schema version, server action result union (`validation`, `unauthorized`, `not_found`, `conflict`, `dependency_failure`, `unexpected`), and ownership map before frontend and backend implementation. Published slug is immutable in release one. Existing `ADMIN` and legacy `SUPER_ADMIN` sessions have the same admin permission; both can publish. List queries and media choices are server scoped. A draft is never read through a public route.

## Stage A1 — branded shell and real read-only invitation list

**Owner:** `frontend_engineer` for `src/app/admin/**` presentation and `src/components/admin/**`; `backend_engineer` for a bounded read model in `src/features/admin/**`; root resolves cross-domain contracts. No schema change.

1. Inspect the ZIP in memory, record exact TailAdmin source files/patterns chosen and their license/provenance. Rebuild or adapt only sidebar/header, breadcrumb, card, and responsive table patterns using AyaWarta tokens and existing `lucide-react`. Add a license notice when code is substantially copied.
2. Replace `/admin` identity diagnostics with a useful real-data entry point. Add `/admin/invitations` with bounded server pagination, search by slug/couple, event date, variant, update time, public preview link, and honest empty/error states. Do not fabricate sales, orders, RSVP, or revenue.
3. Keep `requireAdminSession` in each server entry point and preserve `/admin/login`, `/admin` protection, and logout. Make mobile navigation keyboard usable with focus return/Escape. No dead links to future modules.
4. Verify query bounds, no customer media/PII leaking to unauthenticated responses, layout at 360/390/430/768/1280/1440 px, no horizontal overflow, focus, and reduced motion.

**Gate:** focused list/auth tests, typecheck, lint, visual screenshots, `git diff --check`, and review of copied TailAdmin license. No database writes. The read-only list must not query production merely to provide implementation evidence; use repository mocks or a verified isolated target.

## Stage A2 — draft and publication persistence contract

**Owner:** `data_engineer` for `prisma/schema.prisma`, migration files, and persistence tests; `backend_engineer` for versioned draft validation and repositories. Frontend does not start editor writes until contract is stable.

1. Add an `InvitationDraft` record for a versioned private payload, optimistic draft version, base published version, and actor/timestamps. Keep one active draft per existing invitation. New drafts have no public `Invitation` row.
2. Add `Invitation.publishedVersion` and immutable `InvitationPublication` snapshots containing the full reconstructable published aggregate, media references, actor, and timestamp. Preserve all current child relations and public read behavior.
3. Design an additive migration and a verified baseline snapshot process for all four existing production invitations. Editing is disabled until those snapshots exist. Keep published slugs immutable; server rejects attempts to change them. No automatic snapshot/media deletion until a separate retention decision.
4. Build server-only draft repository operations and Zod schemas. Partially complete drafts may save; complete validation is required for publish. Reject stale draft versions, unauthorized access, and cross-customer media IDs.

**Gate:** pure unit tests and isolated-database transaction tests for version/constraint behavior, migration review, legacy-row preservation proof, and restore-from-snapshot rehearsal on fixtures. Do not run the migration or baseline writer against production Neon in this stage.

## Stage A3 — editor and private preview

**Owner:** `frontend_engineer` for editor UI; `backend_engineer` for server actions/private loader and validation. `data_engineer` advises only if a persistence contract changes.

1. Build `/admin/invitations/new`, `/admin/invitations/[id]/edit`, and private `/admin/invitations/[id]/preview`. Use stable admin IDs; display a published slug read-only.
2. Group fields by identity/theme, couple, events, gallery, story, gifts, music, and visibility. Support accessible add/remove/reorder for ordered children, field-level errors, unsaved-change notice, save progress, and saved timestamp.
3. Preview the saved draft through the same domain/theme renderer under current admin authorization. Mark it clearly as **Draf**, disable public caching, and never use `default-preview` as a fallback. RSVP/wishes are read-only in draft preview: do not mount a writable Firestore adapter or send submissions.
4. Existing invitation media choices come only from assets already associated with that same invitation. A new draft can be prepared and previewed but remains unpublishable until Stage A5 provisions its own media.

**Gate:** form validation, auth/forged-ID tests, draft and Firestore-write isolation tests, keyboard/dialog/mobile checks, reduced-motion review, and no public-route regression. No production data edits for QA.

## Stage A4 — explicit publication for existing invitations

**Owner:** `backend_engineer` for publish service/actions and tests; `data_engineer` for transaction/query review; `frontend_engineer` for review/confirmation/status UI; `qa_reviewer` independently checks safety.

1. Show target URL, change summary, live version, draft version, and confirmation before **Terbitkan**. The same active administrator permission applies to both existing role values.
2. In one transaction, validate the full draft, unchanged published slug, same-invitation verified media, fresh draft/live versions, and unique constraints; update the published aggregate and ordered children; write the full restorable publication snapshot and actor; advance version. Any failure rolls back all public changes.
3. Revalidate affected public/admin routes only after commit. Verify exact published slug through the repository, and show a sanitized operational error if post-commit rendering fails. Preserve the draft and snapshot for recovery.
4. Do not enable first publication of a new invitation yet. Never publish on save, preview, or media selection.

**Gate:** fault injection for every transaction boundary, stale-version collision, duplicate submit, unauthorized publish, cross-customer media attack, four legacy slug regression, and publication recovery fixture. Browser QA on an isolated environment. Production activation is a separate reviewed operation.

## Stage A5 — verified media provisioning for new invitations

**Owner:** `backend_engineer` for upload protocol; `data_engineer` for provenance/linking; `frontend_engineer` for picker/uploader. External Cloudinary mutation requires exact authorization and target review.

1. Validate file signature, decoded dimensions, size, and format server-side; prepare derivatives using the existing Sharp primitive.
2. Upload under a deterministic invitation-scoped public ID with overwrite disabled, read back metadata, verify delivery URL and content identity, then link the verified `MediaAsset` to its own draft. Credentials remain server-only.
3. Represent unlinked verified uploads as recoverable pending assets; a failed database link must not alter a published invitation. Cleanup is a separate reviewed process.
4. Enable new invitation publication only after required hero/partner media exists and the same atomic publish gate passes. Do not use another customer's canonical media as a shortcut.

**Gate:** failure/retry/orphan tests, identity and ownership verification, payload/performance checks, and exact uploaded-ID report. No deletion of old-account media.

## Stage A6 — release readiness

Update `docs/architecture.md`, `docs/design.md`, `docs/database-schema.md`, `docs/authentication.md`, `docs/media-management.md`, and admin operations to match code. Run typecheck, lint, tests, production build, guarded migration checks on an isolated target, public/admin smoke tests, accessibility review, credential scan, and `git diff --check`. Prepare a separate production migration/activation runbook with target fingerprint, backup/restore path, baseline snapshot verification, and rollback. Owner approval of that exact production operation is required before executing it.

## Sequencing with Siger Priangan

Stages A1–A4 can proceed independently of the new theme. Before Siger Priangan becomes selectable in the admin editor, extend the draft schema and form with optional greeting/prayer, gallery alt/caption, and the typed `siger-priangan`/`ivory` pair described in the [template design](../specs/2026-10-29-siger-priangan-premium-template-design.md). The new theme must not appear as a publishable choice until its route, assets, and full verification gates pass.

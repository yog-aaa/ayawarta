# AyaWarta Admin Panel Design Specification

## Status and decision boundary

**Product direction approved on 2026-10-29; technical design proposed for review.** The owner wants a working administrator panel focused first on invitation and content management. Use selected patterns from the supplied TailAdmin ZIP, described as MIT-licensed, and restyle them for AyaWarta. Editors work in a separate draft and use an explicit **Terbitkan** action. Lists and summaries must come from real data. This document specifies future implementation stages; writing it authorizes no code change, migration, production database connection, Cloudinary mutation, or deployment.

The supplied `free-nextjs-admin-dashboard-main.zip` identifies itself as TailAdmin Free v2.5.0. Its `LICENSE` is MIT, copyright © 2023 TailAdmin, and requires preservation of the copyright and permission notice in substantial copies. Its package declares Next.js 16 and React 19, but its npm lockfile and demo ecommerce/auth modules are not part of AyaWarta's stack or product. The ZIP is a pattern reference, not a replacement design system: inspect the provenance of each selected file or asset, preserve required notices, and adapt only the shell, sidebar, card, or table patterns needed for approved flows. Do not import a whole dashboard template, add a second CSS system, or change the existing AyaWarta landing and Classic Rose visual identity.

## Current baseline and invariants

- `/admin/login` and `/admin` currently provide Auth.js Credentials sign-in, a protected minimal page, and logout. `src/proxy.ts` screens `/admin/:path*`; `src/features/auth/service.ts` rechecks the live administrator record on the server.
- Public `/{slug}` and `/{slug}/invite` routes load the exact slug through `src/features/invitations/repository.ts` and map Prisma records to the Classic Rose contract. Unknown slugs return 404. The theme preview route can explicitly load `default-preview`.
- PostgreSQL/Prisma owns invitation content and media metadata. Firestore continues to own real-time wishes and RSVP at `wishes/{slug}/messages`; this panel must not move or rewrite that data path.
- `Invitation` has a required hero asset, two partner roles, section flags, and ordered children. Four existing production records (`rika-fauzi`, `shidqi-mita`, `dudi-aini`, `default-preview`) must remain published and render identically until an explicitly reviewed edit is published.
- Existing dynamic invitation media is in Cloudinary; the Git-tracked canonical catalog supports the existing seed. Classic Rose runtime artwork uses versioned Cloudinary URLs in `src/config/classic-rose-cloudinary.json`. The admin panel must not turn static theme artwork into per-invitation uploads.
- The application is already deployed on Vercel. The Neon production database cutover remains separately gated by `docs/deployment.md`; a panel implementation stage must not execute it.

Source contracts: [architecture](../../architecture.md), [design system](../../design.md), [database schema](../../database-schema.md), [authentication](../../authentication.md), [media management](../../media-management.md), and [deployment](../../deployment.md).

## Goals and non-goals

### Goals

1. Let an authenticated administrator find real invitations, inspect publication and draft state, and edit invitation content without changing the public page during drafting.
2. Provide a private preview of the exact draft, a clear change summary, validation, and an explicit publish confirmation.
3. Make publish safe for existing production invitations: no partial public content, slug changes, reuse of another customer's media, or silent overwrite by another editor.
4. Keep the admin interface recognizable as AyaWarta, responsive, keyboard usable, and honest about empty/loading/error states.
5. Define a future media upload workflow that preserves Cloudinary identity checks and server-only credentials.

### Non-goals for the first implementation

- Customer registration, customer self-service, checkout, payment processing, or a full customer CRM.
- Editing Firestore wishes/RSVP records, QR check-in, or guest photo upload.
- Pricing-package editor or offer publication. The intent for that later module is in `docs/pricing.md`.
- New invitation themes or a redesign of Classic Rose or the public landing page.
- Live production migration, seed, Cloudinary upload, Vercel/Neon configuration change, or deployment as part of specification authoring.
- Bulk deletion, unpublish, hard delete, or deletion of old Cloudinary assets in the first release.
- Renaming a published invitation slug. This needs a separate design for public URL aliases and the Firestore `wishes/{slug}/messages` path.

## Users, access, and navigation

The user is an AyaWarta team administrator; invitation customers and guests do not sign in. The product has one admin permission level: an active administrator may read, edit drafts, and publish. The first navigation has **Ringkasan**, **Undangan**, and an account/logout control. Media belongs inside the invitation editor until a separate reusable library has a concrete use case. Pricing and extensions may appear only when their own stages ship; do not show dead links or fake navigation.

| View | Route proposal | Primary job | Data source |
| --- | --- | --- | --- |
| Ringkasan | `/admin` | Entry point, recent invitations and counts only when backed by real queries | Prisma |
| Undangan | `/admin/invitations` | Search, filter, sort, paginate, and open real published/draft records | Prisma |
| Draf baru | `/admin/invitations/new` | Create a private draft with a proposed slug | Draft persistence |
| Edit draf | `/admin/invitations/[id]/edit` | Edit content, save, validate, inspect unsaved changes | Draft persistence |
| Pratinjau draf | `/admin/invitations/[id]/preview` | Render the draft privately through the same domain mapper/theme view | Server-authorized draft reader |
| Riwayat terbit | Within invitation detail | Show publication version, actor, time, and change summary | Publication record |

Use an internal stable ID for admin routes. A proposed slug may change while a **new** invitation is still a draft. Once published, its slug is immutable in the first release because it is both a public URL key and the Firestore wishes path segment. The editor displays that slug read-only and the server rejects a changed slug on save or publish. The list displays at least couple names, proposed/current slug, theme variant, public status, draft status, last update, and actions. Distinguish an existing published invitation with an unpublished draft from an unpublished new invitation. Search and filters operate on persisted results; no hard-coded rows, fabricated counters, or placeholder success data.

## Product flow

1. **Open list:** Server verifies the current admin and loads a bounded page of real records. A blank database shows an actionable empty state. A read failure shows a retry path without exposing connection details.
2. **Start new or edit:** The administrator creates a draft or opens a draft linked to a published invitation. Opening an existing published invitation without a draft creates a private draft snapshot; it does not modify live tables.
3. **Edit:** Organize the form around identity and theme, couple, events, gallery and video, story, gifts, music, and visibility flags. Reflect the current `InvitationData` contract and its required/optional fields. Ordered items support accessible add, remove, and reorder controls. Saving a valid or partially complete draft persists only to draft storage. Unsaved changes are signaled before navigation.
4. **Preview:** Preview renders the current saved draft behind admin authorization, clearly marked **Draf**. It never uses the public slug route or silently substitutes `default-preview`. RSVP and wishes appear only as read-only/disabled presentation with a visible explanation that preview submissions are unavailable; the preview must not mount a Firestore submit adapter or expose an operable submit control. A malformed draft shows field-level errors rather than a broken public page.
5. **Review and publish:** Show the target public URL, the current published version if any, and a concise change summary. The **Terbitkan** action asks for confirmation. Server validation checks all required relations and media before any live write. Stage 1–4 publication is limited to edits of existing invitations using their own verified media; new invitation publication waits for the Stage 5 media provisioning flow.
6. **Publish:** For an existing invitation, one database transaction checks the draft version and current published version, updates the `Invitation` aggregate and its ordered children, records who published it, and advances the publication version. A version conflict leaves the public record untouched and asks the editor to reload and reconcile. The draft remains available for correction if publication fails. First publication of a new invitation uses this guarded flow only after Stage 5 provisions its own verified media.
7. **Verify:** After success, show the newly published version and link to the public route. Verify the exact slug through the repository. If post-write rendering fails, surface an operational error and preserve publication history for diagnosis; never fall back to preview data.

The initial release should not silently publish on save or upload. A draft is private even when it describes one of the four existing production slugs. New invitations may be drafted and previewed in Stages 1–4, but cannot be published until their own required hero and partner media have been provisioned and verified in Stage 5.

## UX and visual contract

The admin shell uses AyaWarta blue, typography, semantic tokens, focus ring, and shared primitives from `src/app/globals.css` and `src/components/ui/`. Adapt TailAdmin patterns only where they help navigation, dense lists, forms, or confirmation dialogs. Avoid a second generic dashboard palette. Preserve the current `/admin/login` experience and the public site.

| State | Required behavior |
| --- | --- |
| Initial loading | A stable page skeleton or progress label with no fake metrics. |
| Empty list | Explain that no invitation matches the filter; provide **Buat draf** when appropriate. |
| Save in progress | Disable duplicate submit, retain form data, and announce progress. |
| Saved draft | Show a persistent saved timestamp and a private preview action. |
| RSVP/wishes in draft preview | Display the section without an active submit path and explain visibly that no response or wish can be sent from preview. |
| Validation error | Associate each message with its field and offer a summary that links to the first invalid field. |
| Data or network failure | Show a generic message, keep unsaved input, and offer retry. |
| Publish in progress | Prevent duplicate publication and show target slug/version. |
| Conflict | Explain that the live record or draft changed elsewhere; preserve local work and require reconciliation. |
| Publish success | Show the resulting version and exact public URL; never claim success before transaction commit. |

Use semantic tables on wide screens and a readable card/list adaptation on mobile. Provide a visible label for every control, keyboard operation for dialogs and item reordering, visible focus, reasonable touch targets, and an escape path from dialogs. Respect `prefers-reduced-motion`; motion must not hide state changes. Meaningful media needs alt text. Destructive or public-facing actions require explicit, distinguishable controls and clear consequences. Check representative widths of 360, 390–430, 768, 1280, and 1440 CSS pixels.

## Technical boundaries and contracts

- Keep the list, editor bootstrap, draft preview loader, and publish operation on the server. Use Client Components only for form interaction, sortable controls, and local state. Do not import Prisma, Cloudinary admin APIs, password helpers, or server environment modules into client code.
- Use typed domain input/output objects between forms and server actions or route handlers. Validate on the server with Zod; client validation may improve feedback but cannot replace server validation. Reuse the existing invitation mapper where possible, with an explicit draft-to-domain conversion instead of passing Prisma models to UI components.
- Each read or mutation checks `requireAdminSession` against the current database user. The proxy's session-presence check is only the first boundary. The existing `ADMIN` and `SUPER_ADMIN` enum values both map to the same single admin permission level for this panel; a valid active legacy `SUPER_ADMIN` session remains usable without a role-removal migration. Do not build distinct screens or publish privileges for those enum values. Never expose draft content or media metadata through unauthenticated public routes.
- Return stable, sanitized outcomes: validation errors by field, unauthorized/forbidden, not found, version conflict, dependency/media failure, and generic unexpected failure. Do not include SQL, URL credentials, Cloudinary secrets, hashes, or raw provider errors in responses or logs.
- Use bounded pagination and server-side filters for real lists. Do not make one unbounded query for a dashboard count plus all rows. Cache/revalidate only affected admin and public routes after a successful publish; preview responses must be private and uncached.
- Public routes keep reading only the published `Invitation` aggregate. Draft persistence must not change `/{slug}` or invite-link output until publish commits. Unknown slugs keep returning 404.
- Draft preview uses a presentation-only mode for RSVP/wishes. Do not mount the production Firestore gateway, subscription, or submit adapter in that mode; do not infer the draft's Firestore collection from a proposed slug. Public published invitations keep their existing real-time behavior.

### Draft and publication data model proposal

This is a migration proposal for a later, separately reviewed data stage. The existing `Invitation` and child tables remain the **published projection** used by current public routes and seed. Do not add a `DRAFT` status to those live rows and then filter them out: that would risk hiding the four production invitations.

| Record | Proposed fields and constraints | Purpose |
| --- | --- | --- |
| `InvitationDraft` | Stable `id`, nullable `invitationId`, proposed `slug` for new invitations, typed versioned content payload, `draftVersion`, `basePublishedVersion`, `createdById`, `updatedById`, timestamps; index on proposed slug and a unique constraint on non-null `invitationId` | Private mutable working copy. One active draft per published invitation in the first release; published slugs are read-only. |
| `Invitation.publishedVersion` | Non-null integer with safe default/backfill for existing rows | Optimistic concurrency token; never reset on draft save. |
| `InvitationPublication` | `id`, invitation ID, version unique per invitation, nullable actor ID for system baseline, timestamp, complete versioned content snapshot, content digest, optional change summary, source (`baseline` or `publish`) | Immutable, restorable audit record for the initial state and every successful publish. |

The draft payload must have a versioned Zod schema matching the editable domain fields, including stable IDs for ordered rows. Server validation permits incomplete drafts at save time but requires a complete publishable aggregate: valid unique slug for a new invitation, unchanged slug for an existing one, supported theme/variant, two distinct partner roles with verified photos, required hero, sections, valid event and gallery ordering, valid URLs where applicable, and referenced media records belonging to that invitation. Publication compares the submitted `draftVersion` and `basePublishedVersion` inside the same transaction, uses a conditional version update for an existing invitation, and relies on the unique `Invitation.slug` constraint as the final collision guard for a new one. Any conflict rolls back the full transaction. A newly created draft has no public `Invitation` until first publish. An existing invitation retains its current slug and content if any precondition fails.

The migration must be additive and preserve the four production rows' existing content and relations at rollout. Review foreign keys, indexes, and unique constraints; use a forward-only migration and a non-destructive backfill of publication versions. Before editing is enabled, create and verify a **complete baseline publication snapshot** for each of the four existing invitations. Each snapshot must reconstruct the published theme, content, sections, ordered children, and every hero/partner/gallery/music media reference; a digest alone is insufficient. Compare reconstructed output with the current repository/mapper contract and fail closed on missing relations. Retain snapshots and referenced media; no automatic deletion is allowed until a separate retention and recovery policy is approved. The operator's current local `DATABASE_URL` points to production Neon: implementation tests must use an isolated, explicitly checked non-production target. Do not run the migration or baseline write against Neon without exact production authorization.

### Media in the future editor

The first editor can select only existing verified `MediaAsset` records already associated with the **same invitation**. The server must scope available choices and validate every submitted media ID; a crafted request cannot reuse a hero, portrait, gallery image, or music asset from another customer's invitation. Reuse within the same invitation (for example, one hero also shown in its gallery) remains valid. The current `MediaAsset` table has no ownership column, so Stage 1 must define a server-side association query for legacy records and Stage 5 must design explicit provenance/ownership for new uploads. If an existing published relation is shared across invitations, preserve the live page, block new cross-invitation selection, and report it for review. A new invitation needs its own verified required media; merely having other customers' assets in the database does not make it publishable.

Stage 5 adds the upload/provisioning flow after review of the Cloudinary and database contract. Keep `prepareImage` server-only, validate signature/decoded dimensions and limits, use conflict-safe public IDs, upload and read back metadata, and link the new asset to a draft only after verification. Do not overwrite a live asset, delete old-account resources, or make a failed upload alter the published invitation.

Cloudinary and PostgreSQL cannot share one transaction. The upload workflow therefore records an unreferenced verified asset as pending until a database write links it; a failed database step leaves a recoverable orphan for a reviewed cleanup process. Publication must confirm every draft media reference is verified and accessible before changing the live aggregate. Existing canonical catalog data remains the bootstrap source for the four seeded invitations; future user uploads need a reviewed database-backed provenance and recovery path rather than manual edits to the Git catalog on every save.

## Implementation stages and review gates

Each stage needs a separate assignment, an owned file list, targeted tests, diff review, and owner acceptance before the next stage. No stage below grants permission for live production mutation.

| Stage | Scope | Exit evidence |
| --- | --- | --- |
| 1. Reference and contract audit | Record exact TailAdmin files chosen from the MIT-licensed ZIP and retain the required notice; check component compatibility with AyaWarta's pinned Next/React versions; map existing auth, domain, data, design tokens, and routes. Set exact form/API error contract. | Approved component inventory, ownership map, UI flow, and no unreviewed dependencies or npm lockfile. |
| 2. Draft persistence | Add additive Prisma model/version/audit migrations and server repository; keep live `Invitation` reads unchanged. Create complete baseline publication snapshots before enabling production editing. | Migration review, legacy-row preservation proof, four restorable baseline snapshots, draft save/version/conflict tests, database target guard. |
| 3. Real list and editor | Build branded shell, paginated list, and content forms using real server data; save drafts only. | Responsive/accessibility review, validation and auth tests, no public-route regression. |
| 4. Private preview and publish | Render draft privately with RSVP/wishes presentation-only, implement complete validation, transaction, full restorable snapshot, conflicts, and success verification for existing invitations only. | Atomicity/fault-injection tests on an isolated target; preview test proves no Firestore adapter/subscription/submit is mounted and no wish/RSVP write occurs; four production slugs unchanged before publish; one test publish changes only its intended fixture record; new-draft publish is blocked. |
| 5. New-invitation media provisioning | Add verified server-side upload and draft-media linking; only then enable first publication of a new invitation. | Conflict and failure tests, identity and same-invitation provenance proof, no live overwrite; exact external mutation review before execution. |
| 6. Release readiness | Run full project gates, migration plan, production target review, rollback rehearsal, and smoke plan. | Evidence for lint, typecheck, tests, guarded DB tests, build, accessibility, route and auth smoke; explicit deployment approval remains separate. |

The first usable panel may ship Stages 1–4 for editing and publishing **existing** invitations with their own media. New invitations may be drafted and previewed, but Stage 5 is required before they can be published. Keep pricing management and other extensions in separate future specifications. The [Siger Priangan template specification](2026-10-29-siger-priangan-premium-template-design.md) introduces optional editable greeting/prayer text and gallery alt text/captions; reserve clean editor/domain extension points for those fields when that theme is implemented, without adding them to the Classic Rose first release or inserting religious defaults.

## Acceptance criteria

1. An active authorized administrator sees a real invitation list and can find each of the four existing production slugs; a database failure never becomes a fabricated empty list.
2. Draft create/edit/save and private preview work without changing public `/{slug}` or `/{slug}/invite` output.
3. Any active authorized administrator can publish an existing invitation after confirmation. Publishing validates the complete aggregate and same-invitation media, commits atomically, records actor/version with a full restorable snapshot, and rejects stale draft or published versions without partial writes; `ADMIN` and legacy `SUPER_ADMIN` sessions receive the same panel permissions.
4. A new draft does not create a public route and cannot publish before Stage 5 verifies its own media. Unknown slugs still return 404. Existing production invitations remain available with immutable slugs and unchanged content until intentionally published.
5. Forms and lists provide the states, keyboard access, focus, labels, responsive layout, and reduced-motion behavior above.
6. Client bundles contain no database, Cloudinary admin, auth secret, or password utility. Firestore wishes/RSVP behavior and Classic Rose presentation remain unchanged.
7. Draft preview displays RSVP/wishes as disabled/read-only with an explanation, mounts no Firestore submit adapter, and cannot write a wish or RSVP even through keyboard or crafted form interaction.
8. The implementation uses AyaWarta tokens and only audited TailAdmin patterns with required license handling; no fake cards, metrics, or records appear.
9. Complete baseline snapshots for all four existing invitations are verified before editing is enabled, and no snapshot or referenced media is automatically deleted without a separately approved retention policy.
10. Every implementation stage reports its exact checks and external effects; production Neon/Vercel/Cloudinary operations remain gated by separate explicit authorization.

## Decisions to settle before implementation

- **Draft cardinality:** This specification proposes one active draft per published invitation to simplify conflict handling. Multiple simultaneous branches need a separate collaboration design.
- **Publication recovery:** Restoring an older version should create a new draft rather than directly replacing live data. Define a retention policy in a separate review before any automated cleanup; until then, keep all snapshots and referenced media.
- **TailAdmin asset provenance:** The supplied ZIP is TailAdmin Free v2.5.0 with a root MIT `LICENSE`. Record the exact files and any additional asset licenses selected during Stage 1. No copied code or artwork is approved by the ZIP's root license alone.

## Verification for this document

Review this specification against the existing Prisma schema, invitation repository/mapper, Auth.js server guard, Cloudinary media rules, design tokens, and deployment runbook. Check local Markdown links and `git diff --check`. Runtime tests and database/cloud operations are outside this documentation-only stage.

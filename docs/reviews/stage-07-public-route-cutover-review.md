# Stage 7 — Public Route Cutover Review

## Status

`ACCEPTED — READY FOR FINALIZATION COMMIT`

The public invitation, invite-link, and Classic Rose template routes now read through the server-only Prisma repository. Unknown invitation slugs and invalid variants terminate with Next.js `notFound()` and no route retains a hidden dummy/default fallback.

## Accepted Implementation

- `/[slug]` resolves the exact database record, uses its persisted variant, and returns 404 when absent.
- `/[slug]/invite` is an async Server Component; browser interaction is isolated in `InviteClientView` without Prisma, repository, server-only, or credential imports.
- `/wedding/classic-rose/[variant]` validates the variant, explicitly uses `default-preview` when no slug is supplied, accepts an explicit query slug, and returns 404 for unknown/ambiguous input.
- Existing Classic Rose props, visible layout, invitation copy, guest-link behavior, and WhatsApp message behavior are preserved.
- Dynamic hero/gallery/music data comes from the seeded Cloudinary-backed domain model. Static theme and payment assets remain local as intended.
- Legacy hard-coded invitation sources remain present but are no longer referenced by active public route code; deletion remains deferred to Stage 10.
- Above-the-fold and decorative `next/image` instances now provide sizing hints; no visual redesign was introduced.

## Boundary Review

- All three route entry points remain Server Components.
- No Client Component imports the invitation repository, generated Prisma client, database singleton, `server-only`, or server credentials.
- Repository lookup performs one eager-loaded query and returns `null` for missing or non-string slugs.
- The template route's repeated `slug` query input was independently exercised against the production server and returned 404 rather than a 500 or fallback.
- Next.js build classifies the public invitation, invite-link, and template routes as dynamic server-rendered routes.

## Independent Verification

- `pnpm test`: PASS — 395/395 across 21 files.
- `pnpm test:db`: PASS — 22/22 across 3 integration files against local PostgreSQL.
- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS — 0 errors and the single pre-existing `themeSection.tsx` warning reserved for Stage 8.
- `pnpm build`: PASS — Next.js 16 production build and route generation completed.
- `pnpm smoke:routes`: PASS against a locally started production server on port 3334.
- Additional live HTTP checks: explicit template slug returned 200; missing and repeated/ambiguous slug queries returned 404.
- `git diff --check`: PASS.
- No database write, Cloudinary mutation, Firestore access, Aiven/Vercel change, or file deletion occurred during review.

## Deferred Work

- UI/design-system refinement and the remaining React hook warning belong to Stage 8.
- Firestore wishes/RSVP isolation belongs to Stage 9.
- Removal of hard-coded invitation sources and local migrated media remains gated until Stage 10.

## Decision

Stage 7 is accepted. Finalize and commit the reviewed scope with message `feat: cut over public invitation routes`. Do not begin Stage 8 or include unrelated UI refactors in the finalization handoff.

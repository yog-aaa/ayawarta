# AyaWarta Architecture

## Purpose

This document records the implemented architecture and the remaining production activation boundaries.

The approved refactor specification and implementation plan in `docs/superpowers/` record why the architecture was chosen. This page describes the current source tree; [deployment operations](deployment.md) records the completed Neon database setup and the remaining Vercel/runtime cutover checks.

## Current Architecture

### Application

- Next.js 16 App Router with React 19 and TypeScript.
- Tailwind CSS 4 through the PostCSS plugin.
- Framer Motion for landing-page and invitation animation.
- Next Image for local and remote image delivery.

### Data

- Invitation records, media metadata, and administrators are stored in PostgreSQL and loaded through Prisma.
- Public invitation pages use a server-only repository and return 404 for an unknown slug.
- Wishes and attendance remain in Firestore through a client-only gateway and adapter.

### Media

- All 31 dynamic invitation assets are in Cloudinary cloud `uhwi7xvb`, with metadata in a Git-tracked canonical catalog and PostgreSQL.
- The legacy `public/images/SAMPLE` and `public/images/dummy-couples` directories were removed after verification.
- The old Cloudinary account remains untouched as a recovery source.
- Optimized Classic Rose runtime artwork is delivered from Cloudinary through versioned URLs in `src/config/classic-rose-cloudinary.json`. Its local PNG/WebP sources are under `assets/themes/classic-rose/`, outside the served `public` tree. Other static UI artwork remains under `public/images`.

### Media Ingestion and Image Preparation

The server-only image preparation primitive served the completed media migration. A5 now adds an admin image upload control and server route for saved **new** drafts. Its schema migration was applied to Neon on 2026-10-31, but upload and first publication remain default-disabled pending separate feature activation. There is no routine customer-media upload CLI. The separate `scripts/upload-classic-rose-assets.mjs` handles only the fixed, Git-tracked static theme asset set. Browser code never receives Cloudinary API credentials.

The preparation pipeline must:

- validate the actual image signature and decoded metadata instead of trusting the filename or browser MIME type;
- enforce input-byte and decoded-pixel limits to reject unsupported or decompression-bomb inputs;
- normalize EXIF orientation and strip unnecessary metadata;
- preserve aspect ratio and avoid upscaling;
- deterministically compress oversized images to a configured safety target below the active Cloudinary account limit;
- return output bytes, format, dimensions, byte size, and content digest for upload verification;
- fail without creating a database media record when preparation, upload, or post-upload verification fails.

Stage 5B used the primitive to remediate an oversized JPEG. A5 reuses it, then creates slot-sized WebP derivatives capped at 3 MiB from bounded JPEG, PNG, or WebP inputs. The standalone preparation primitive still fails closed for oversized PNG and WebP without the A5 derivative step.

### Authentication

Auth.js Credentials provides admin-only login. `/admin` is protected; `/admin/login` remains accessible for recovery from stale sessions.

The admin workspace has a real invitation summary and searchable, paginated published list. A3 adds a separate list of new private drafts, `/admin/invitations/new`, `/admin/invitations/[id]/edit`, and a saved-draft-only `/admin/invitations/[id]/preview`; `[id]` is a draft ID on the edit and preview routes. Server actions create and save drafts with version checks. A4 adds a separate review and confirmed publish action for existing invitations. Opening a published invitation requires verified version-1 provenance: `BASELINE` for the four seeded legacy slugs, or actor-attributed `PUBLISH` plus retained draft-owned media for an A5 first publication. The four legacy Neon baselines were written and verified on 2026-10-30.

### Pricing configuration

The public landing page currently reads the three fixed offers from `src/config/landing.ts`; no pricing administration or checkout flow is implemented. Stable plan IDs and numeric IDR amounts keep the display contract explicit. A future admin panel is intended to manage package prices, inclusions, and customization options, with guest photo gallery and QR check-in maintained as independent extensions. The planned behavior and present limits are recorded in [the pricing product contract](pricing.md).

## Implemented Architecture

```text
Browser
  ├─ Public landing page
  ├─ Invitation pages
  │    ├─ Server Component loads invitation through repository
  │    └─ Client islands handle opening, motion, audio, and Firestore wishes ── Firestore
  ├─ Cloudinary delivery URLs for invitation media and Classic Rose artwork ── Cloudinary
  └─ Admin login / protected workspace, draft editor, saved preview, and gated media upload
          │
          ▼
Next.js server (local development or existing Vercel deployment)
  ├─ Invitation repository and mapper
  ├─ Auth.js Credentials authorization
  ├─ Prisma Client
  └─ Cloudinary server utilities, canonical catalog, and gated draft media service
          │
          ├──────── PostgreSQL
          │          ├─ invitations and child content
          │          ├─ media metadata
          │          └─ admin users
          │
          └──────── Cloudinary administrative utilities (server-only)
```

## Runtime Boundaries

### Server-only

- Prisma Client and repository queries.
- PostgreSQL connection details.
- Cloudinary API key and secret.
- Cloudinary uploads and administrative operations.
- Password hashing and verification.
- Admin lookup, lockout updates, and authorization decisions.
- Seed and migration scripts.

### Client-capable

- Cloudinary delivery URLs returned as ordinary invitation data.
- Firestore public configuration already required by the client SDK.
- Framer Motion and interactive invitation state.
- Guest-name query-string behavior.
- Clipboard and WhatsApp sharing actions.

### Static

- Landing content that requires no browser state.
- AyaWarta logo and social/payment icons.
- Theme artwork and decorative assets.
- CSS design tokens and base styles.

## Module Boundaries

Current source organization:

```text
src/
├── app/
│   ├── admin/
│   ├── api/auth/[...nextauth]/
│   ├── [slug]/
│   ├── (templates)/wedding/classic-rose/
│   ├── (templates)/wedding/siger-priangan/
│   └── components/landing/
├── components/ui/
├── features/
│   ├── auth/
│   ├── admin/
│   ├── invitations/
│   ├── media/
│   └── wishes/
├── generated/prisma/
└── lib/
    ├── server/
    ├── firebase.ts
    └── theme-config/
```

The generated Prisma client is under `src/generated/prisma`; generated code must not be hand-edited.

| Boundary | Entry points | Responsibility |
| --- | --- | --- |
| Public routes | `src/app/page.tsx`, `src/app/[slug]/page.tsx`, `src/app/[slug]/invite/page.tsx` | Render landing content or load one exact invitation slug. |
| Theme previews | `src/app/(templates)/wedding/classic-rose/[variant]/page.tsx`, `siger-priangan/[variant]/page.tsx` | Classic Rose loads the explicit `slug` query parameter, defaulting to `default-preview`; Siger accepts only `ivory` and renders an illustrative read-only sample. |
| Invitation domain | `src/features/invitations/repository.ts`, `query.ts`, `mapper.ts`, `types.ts` | Keep Prisma payloads on the server and map them to template data. |
| Authentication | `src/auth.ts`, `src/proxy.ts`, `src/features/auth/` | Credentials sign-in, route protection, current-admin validation, and lockout state. |
| Admin workspace | `src/app/admin/(workspace)/`, `src/app/admin/(preview)/`, `src/app/admin/actions.ts`, `src/app/admin/api/drafts/[id]/media/route.ts`, `src/features/admin/` | Published list, private draft editor and saved preview, scoped media choices, versioned saves, confirmed publication, and default-disabled new-draft image provisioning. |
| Real-time wishes | `src/features/wishes/` and `src/lib/firebase.ts` | Browser-only Firestore subscription, validation, and submission. |
| Media | `src/features/media/` | Canonical catalog, preparation and verification primitives, and server-only Cloudinary access. |
| Database | `prisma/schema.prisma`, `prisma/migrations/`, `src/lib/server/db.ts` | Relational schema, migrations, and Prisma Client through `@prisma/adapter-pg`. |

## Public Invitation Data Flow

1. `[slug]/page.tsx` receives the slug.
2. A server-only repository queries the invitation and ordered relations. `publicInvitationSelect` in `src/features/invitations/query.ts` keeps the public projection compact and compatible with the seeded Neon rows.
3. The query includes the required hero `MediaAsset` separately from gallery items, partner photos, and optional music.
4. A mapper converts the persistence result to the stable invitation domain contract, including the hero URL as `couple.heroImage` and nullable `galleryVideoUrl` as `gallery.videoUrl`.
5. Missing data triggers `notFound()`.
6. The exact theme/variant pair dispatches to Classic Rose or Siger Priangan. An unsupported pair is rejected, not replaced with sample data.
7. Client components handle only behavior that needs browser APIs or client-side subscriptions.

The domain and draft schemas recognize two exact theme/variant pairs: Classic Rose with `red`, `green`, `blue`, `orange`, `black`, or `white`; Siger Priangan with `ivory` only. The mapper rejects unsupported pairs. It exposes optional greeting/prayer and ordered gallery items with alt text/caption while retaining `gallery.images` for Classic Rose. `/{slug}` has Siger dispatch for a valid published record, but no production invitation has been converted to that theme. `/wedding/siger-priangan/ivory` renders typed illustrative sample data in read-only preview mode; it is never a fallback for an unknown slug and never mounts the writable Firestore wishes adapter.

## Draft and publication boundary

`src/features/admin/draft-schema.ts` validates versioned private payloads. `draft-repository.ts` stores one draft per published invitation, checks optimistic versions, and verifies its version-1 publication provenance before editing: a `BASELINE` for the four legacy slugs, or an actor-attributed `PUBLISH` with retained draft-owned media for a newly first-published invitation. `publication-snapshot.ts` captures the complete published aggregate and media identities, hashes it, and derives media pins. A4 `publish-repository.ts` rechecks the saved draft, live version, scoped media, and current snapshot inside a serializable transaction, then updates the public aggregate, writes an immutable versioned snapshot with media pins, and synchronizes the retained draft to the newly published version. A post-commit route verification failure is reported distinctly so an operator does not retry blindly. A5 adds a guarded first-publication branch for new Classic Rose drafts with their own verified images.

The A3 editor saves partially complete drafts through authenticated server actions. The private preview reloads the **saved** draft, has `force-dynamic`/zero revalidation, and either shows field-level incompleteness or renders the matching theme with a draft banner. Missing required photos may appear as placeholders for preview, but they remain publish blockers. Classic Rose omits its wishes component in draft mode; Siger shows a read-only wishes notice without loading its live Firestore adapter. Media choices for existing invitations are limited to deliverable assets already associated with that same invitation, with resource-type checks; an asset also shared with another invitation can only remain in its original published slot. New drafts have no selectable customer media before A5 activation. A draft is never returned by the public invitation repository. The four initial published invitations now have verified baselines; customer edits still require an explicit admin save and publish action.

Stage A5 adds a separate, default-disabled path for **new** drafts. The upload route checks the current admin, same-origin request, saved draft version, bounded image bytes, signature, and decoded dimensions. `DraftMediaProvision` reserves a draft-owned deterministic public ID before a Cloudinary write. After a metadata and content readback, its verified receipt links a `MediaAsset`; a failed link remains recoverable through the reservation. The editor may select only verified images owned by that exact draft, and selection still requires an explicit draft save. No public invitation row is written by an upload or save. The A5 table is present on production Neon following the 2026-10-31 schema migration; existing A4 pages avoid querying it while the feature gate is off.

First publication of a new Classic Rose invitation preflights every referenced Cloudinary image, then uses one serializable transaction to create the invitation, ordered children, version-1 `PUBLISH` snapshot and media pins, and to link/rebase the retained draft. A failed transaction leaves the public aggregate absent and the draft unchanged. The four seeded invitations retain their version-1 `BASELINE` provenance; a newly created invitation requires version-1 `PUBLISH` with an actor and verified draft-owned media. This branch rejects Siger and new-draft music; after first publication, the editor follows the associated-media rules of other published invitations. The schema migration is complete; production upload and first-publication activation still require separate review and authorization.

## Wishes and RSVP Data Flow

1. The validated invitation slug identifies `wishes/{slug}/messages` in Firestore.
2. The client adapter subscribes in real time, ordered by `timestamp` descending, and filters malformed documents.
3. Submission validates nonempty name and message plus `Hadir` or `Tidak Hadir`, then writes those fields and a timestamp.
4. The component unsubscribes on cleanup. Existing records may also read `Belum Konfirmasi`.

PostgreSQL must not be introduced into this real-time path during the refactor.

## Admin Authentication Flow

1. Admin submits email and password to the credentials sign-in flow.
2. Server validates and normalizes input.
3. Prisma loads the user.
4. Server checks activity, role, and lockout.
5. Password hash is verified.
6. Failure state is updated or cleared.
7. Auth.js creates a JWT session containing the minimal user identity and role.
8. Protected admin routes verify the session and role.

## Deployment Topology

### Development

- Next.js runs locally.
- The owner's local runtime explicitly opts into the approved pooled Neon target. Local migration, seed, and integration-test commands remain local-only and must not be used against that URL.
- Dynamic production media uses the new Cloudinary account.
- Firestore remains connected to the existing project.

### Production database and runtime target

- The application is already deployed on Vercel.
- The approved PostgreSQL migration and seed are on Neon with TLS. Migrations and seed use the direct `DATABASE_URL`; a Neon-backed Vercel Production runtime requires `DATABASE_URL_POOLED`. Vercel environment parity and application cutover remain separately unverified.
- Cloudinary serves production invitation media and Classic Rose runtime artwork.
- Firestore serves real-time wishes and RSVP.

The approved Neon schema migration and one-time canonical seed completed on 2026-10-30 and passed exact seed verification. Local seed and seed verification still reject remote targets. Future Neon changes must use guarded production entry points under a new explicit authorization. Vercel deployment was not part of this database operation. See [deployment operations](deployment.md).

## Tooling and Dependency Decisions

### Prisma 7 and `@prisma/adapter-pg`
- **Rationale:** The project uses Prisma 7 (`^7.10.1`) with the configured Next.js and native ESM toolchain. It decouples connection configuration into `prisma.config.ts`, keeping `prisma/schema.prisma` focused on data models and explicit output locations (`src/generated/prisma`).
- **Driver Adapter:** `@prisma/adapter-pg` paired with `pg` (`8.23.1`) provides the PostgreSQL connection layer for local Laragon and the guarded Neon target. Runtime URL selection is in `src/lib/server/env.ts`; production requires the pooled URL.

### Auth.js v5 Prerelease (`next-auth@5.0.0-beta.32`)
- **Rationale:** Auth.js v5 is specifically architected for Next.js App Router and React 19 Server Components/Actions. Its official peer dependencies explicitly support Next.js `^16.0.0` and React `^19.0.0`. NextAuth v4 is tied to legacy Pages Router middleware architectures and does not natively support React 19 Server Components.
- **Prerelease Risk & Policy:** `5.0.0-beta.32` is a prerelease and is not stable. Breaking API changes can occur between beta releases. To protect against unexpected upstream changes, the dependency is pinned exactly to `"next-auth": "5.0.0-beta.32"` (no caret range). Any future upgrade requires explicit review and regression verification of the authentication flow.

### Password Hashing (`bcryptjs`)
- **Rationale:** `bcryptjs` (`3.0.3`) is a pure JavaScript implementation of bcrypt with built-in TypeScript declarations. It avoids native C++ compilation (node-gyp), ensuring seamless portability across Windows local development and Vercel Amazon Linux serverless environments without binary mismatch or cold-start compilation failures.

### Test Runner (`Vitest`)
- **Rationale:** Vitest 5 (`5.0.5`) natively supports Node 24 and ESM. It provides lightweight, fast unit and integration testing without Jest/Babel polyfill overhead, using project path aliases and isolating server-only module checks.

## Architectural Invariants

- One invitation slug identifies one invitation.
- Ordered child records use explicit `position` fields.
- Dynamic media is referenced through `MediaAsset`.
- Every invitation has one explicit required hero-media relation; hero media is never inferred from gallery order.
- The optional gallery-video URL is stored as invitation content, not treated as a Cloudinary-managed upload.
- Static payment logos remain local paths.
- Unknown slugs do not show another invitation.
- Server secrets never cross the server/client boundary.
- The local seed is idempotent; the completed media migration used deterministic public IDs and conflict checks.
- Old Cloudinary data remains untouched as a rollback source.

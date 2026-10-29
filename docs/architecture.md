# AyaWarta Architecture

## Purpose

This document records the implemented architecture and the separately planned production topology.

The approved refactor specification and implementation plan in `docs/superpowers/` record why the architecture was chosen. This page describes the current source tree; [deployment operations](deployment.md) describes the still separate production cutover.

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
- Static UI and theme artwork is stored under `public/images`.

### Media Ingestion and Image Preparation

The server-only image preparation primitive was built for the completed migration and a future admin workflow. No admin upload screen or routine upload CLI exists yet. Browser code never receives Cloudinary API credentials.

The preparation pipeline must:

- validate the actual image signature and decoded metadata instead of trusting the filename or browser MIME type;
- enforce input-byte and decoded-pixel limits to reject unsupported or decompression-bomb inputs;
- normalize EXIF orientation and strip unnecessary metadata;
- preserve aspect ratio and avoid upscaling;
- deterministically compress oversized images to a configured safety target below the active Cloudinary account limit;
- return output bytes, format, dimensions, byte size, and content digest for upload verification;
- fail without creating a database media record when preparation, upload, or post-upload verification fails.

Stage 5B used the primitive to remediate an oversized JPEG. Oversized PNG and WebP inputs currently fail closed. A future admin upload and persistence workflow should reuse the primitive rather than implement a second compressor.

### Authentication

Auth.js Credentials provides admin-only login. `/admin` is protected; `/admin/login` remains accessible for recovery from stale sessions.

## Implemented Architecture

```text
Browser
  ├─ Public landing page
  ├─ Invitation pages
  │    ├─ Server Component loads invitation through repository
  │    └─ Client islands handle opening, motion, audio, and Firestore wishes ── Firestore
  ├─ Cloudinary delivery URLs for invitation media ── Cloudinary
  └─ Admin login / protected admin page
          │
          ▼
Next.js server (local development or existing Vercel deployment)
  ├─ Invitation repository and mapper
  ├─ Auth.js Credentials authorization
  ├─ Prisma Client
  └─ Cloudinary server utilities and canonical media catalog
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
│   └── components/landing/
├── components/ui/
├── features/
│   ├── auth/
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
| Theme preview | `src/app/(templates)/wedding/classic-rose/[variant]/page.tsx` | Validate the requested variant and load the explicit `slug` query parameter, defaulting to the `default-preview` record. |
| Invitation domain | `src/features/invitations/repository.ts`, `query.ts`, `mapper.ts`, `types.ts` | Keep Prisma payloads on the server and map them to template data. |
| Authentication | `src/auth.ts`, `src/proxy.ts`, `src/features/auth/` | Credentials sign-in, route protection, current-admin validation, and lockout state. |
| Real-time wishes | `src/features/wishes/` and `src/lib/firebase.ts` | Browser-only Firestore subscription, validation, and submission. |
| Media | `src/features/media/` | Canonical catalog, preparation and verification primitives, and server-only Cloudinary access. |
| Database | `prisma/schema.prisma`, `prisma/migrations/`, `src/lib/server/db.ts` | Relational schema, migrations, and Prisma Client through `@prisma/adapter-pg`. |

## Public Invitation Data Flow

1. `[slug]/page.tsx` receives the slug.
2. A server-only repository queries the invitation and ordered relations.
3. The query includes the required hero `MediaAsset` separately from gallery items, partner photos, and optional music.
4. A mapper converts the persistence result to the stable invitation domain contract, including the hero URL as `couple.heroImage` and nullable `galleryVideoUrl` as `gallery.videoUrl`.
5. Missing data triggers `notFound()`.
6. The selected theme configuration and invitation domain object are passed to the Classic Rose view.
7. Client components handle only behavior that needs browser APIs or client-side subscriptions.

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
- PostgreSQL is provided by Laragon at the connection configured in `DATABASE_URL`.
- The database name is `ayawarta`.
- Dynamic production media uses the new Cloudinary account.
- Firestore remains connected to the existing project.

### Production database target

- The application is already deployed on Vercel.
- The planned PostgreSQL cutover uses Neon with TLS. Migrations and seed use the direct `DATABASE_URL`; the Neon-backed Vercel Production runtime requires `DATABASE_URL_POOLED`.
- Cloudinary serves production invitation media.
- Firestore serves real-time wishes and RSVP.

The Neon database cutover has not been performed. Local seed and seed verification reject remote targets. Separate `prod:migrate`, `prod:seed`, and `prod:verify` entry points have Neon target guards and require an explicitly approved target plus `--execute`; these scripts are preparation, not evidence of a completed cutover. See [deployment operations](deployment.md).

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

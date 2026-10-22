# AyaWarta Refactor, Cloudinary Migration, and Prisma Design

## Status

Approved in conversation on 2026-10-21. Implementation must not begin until this written specification is reviewed and approved.

## Context

AyaWarta is a Next.js 16 application for digital invitations. It currently contains a public landing page, a Classic Rose wedding template, hard-coded invitation records, dynamic invitation media stored partly in the repository and partly in an older Cloudinary account, and a Firestore-backed guest book with real-time attendance confirmations.

The immediate goal is to prepare the project for continued development without redesigning the product. The existing visual identity and page composition remain the source of truth. The refactor should make the code easier to extend, reduce repository size, centralize invitation data in PostgreSQL, migrate dynamic media to a new Cloudinary account, and add an admin-only authentication foundation.

Three active invitations and the default preview are production data. The application is currently deployed to Vercel. Local development uses PostgreSQL from Laragon; production PostgreSQL will use Aiven.

## Goals

1. Preserve the current UI and brand while improving code organization, consistency, responsiveness, and accessibility.
2. Move all dynamic invitation media to the new Cloudinary account under a predictable folder hierarchy.
3. Remove dynamic invitation media from the repository after the migration is verified.
4. Replace hard-coded invitation records with a relational PostgreSQL schema accessed through Prisma.
5. Keep Firestore as the real-time store for guest wishes and attendance confirmations.
6. Add an admin-only email-and-password login foundation with no public registration.
7. Provide repeatable, idempotent migration and seed tooling for local PostgreSQL and the future Aiven database.
8. Document local setup and the Vercel/Aiven production cutover.

## Non-Goals

- Replacing Firestore or implementing WebSockets.
- Building a complete invitation management dashboard.
- Adding customer registration or customer-facing authentication.
- Redesigning the landing page or Classic Rose template.
- Deleting media from the old Cloudinary account.
- Provisioning the Aiven database or changing the live Vercel deployment during this implementation.
- Moving static presentation assets such as logos, payment marks, social icons, theme ornaments, and landing-page backgrounds out of `public`.

## System Boundaries

### PostgreSQL and Prisma

PostgreSQL stores invitation content, media metadata, section visibility, ownership, and administrator records. Prisma is the only application data-access layer for these records.

Local development connects to the Laragon database named `ayawarta`. Production will connect to Aiven using a TLS-enabled `DATABASE_URL` configured in Vercel.

### Cloudinary

Cloudinary stores dynamic invitation media:

- partner portraits;
- invitation hero photos;
- gallery images;
- invitation-specific audio, video, or other uploaded media.

The database stores Cloudinary identifiers and metadata. Application code must not scatter raw Cloudinary URLs across components or seed files.

### Firestore

Firestore remains responsible only for real-time wishes and attendance confirmations. The existing logical path per invitation remains intact so the current live behavior can be preserved.

### Repository Assets

Static product assets stay under `public`, including:

- AyaWarta branding;
- landing-page artwork and backgrounds;
- social icons;
- payment logos;
- Classic Rose frames, dividers, flowers, bismillah images, and backgrounds.

The directories `public/images/SAMPLE` and `public/images/dummy-couples` are removed only after their Cloudinary replacements and database references pass verification.

## Prisma Data Model

### Invitation

Represents one published or preview invitation.

- `id`: stable generated identifier.
- `slug`: unique public route identifier.
- `theme`: template family, initially `classic-rose`.
- `variant`: theme variant such as `red`, `green`, `blue`, `orange`, `black`, or `white`.
- `weddingDate`: canonical event date used by countdowns.
- `heroAssetId`: required Cloudinary media relation mapped to `couple.heroImage`.
- `galleryVideoUrl`: optional external gallery-video embed URL mapped to `gallery.videoUrl`.
- `musicAssetId`: optional Cloudinary media relation.
- `ownerId`: optional administrator relation during initial migration.
- `createdAt` and `updatedAt`.

### Partner

Stores bride and groom details.

- Unique composite key on `invitationId` and `role`.
- `role`: `GROOM` or `BRIDE`.
- `name`, `parents`, and optional `instagram`.
- `photoAssetId`: required Cloudinary image relation.

### Event

Stores ordered invitation events.

- `name`, `displayDate`, `displayTime`, `location`, `address`, and `mapUrl`.
- `position` controls presentation order.
- Unique composite key on `invitationId` and `position`.

### GalleryItem

Stores ordered gallery entries.

- Required `assetId` relation.
- `altText` for accessibility.
- `position` controls presentation order.
- Unique composite key on `invitationId` and `position`.

### LoveStory

Stores ordered story entries.

- `title`, `content`, and `position`.
- Unique composite key on `invitationId` and `position`.

### GiftAccount

Stores gift and transfer details.

- `platform`, `accountHolder`, and `accountNumber`.
- `logoPath` references a static local payment logo.
- `position` controls presentation order.

### InvitationSections

One-to-one relation containing visibility flags for:

- couple;
- events;
- gallery;
- love story;
- gifts;
- wishes.

### MediaAsset

Stores media metadata returned by Cloudinary.

- `publicId`: unique Cloudinary public identifier.
- `secureUrl`: verified HTTPS delivery URL.
- `folder`, `format`, `bytes`, `width`, and `height` where applicable.
- `resourceType`: `IMAGE`, `VIDEO`, or `AUDIO`.
- `originalName` for traceability.
- `createdAt` and `updatedAt`.

### User

Represents an administrator.

- `id`, `name`, and unique normalized `email`.
- `passwordHash`.
- `role`: `ADMIN` or `SUPER_ADMIN`.
- `isActive`.
- `failedLoginCount` and optional `lockedUntil`.
- `createdAt` and `updatedAt`.
- One-to-many relation to owned invitations.

The initial invitation records may have a null owner so production data can be migrated before ownership is assigned.

## Data Access and Compatibility

Public invitation routes query Prisma from Server Components. A repository function returns a domain-level invitation object and a mapper converts the database result to the existing `InvitationData` contract. This compatibility boundary prevents database work from forcing a broad rewrite of the Classic Rose components.

The repository loads the required hero asset explicitly and the mapper assigns its verified delivery URL to `couple.heroImage`. It must not derive the hero from gallery position because current production records can use a hero image that is not present in the gallery.

The repository also returns nullable `galleryVideoUrl` as invitation content. The mapper preserves it as `gallery.videoUrl`, falling back to the existing empty-string representation only when a gallery exists without a video. External embed URLs are not uploaded to or represented as Cloudinary `MediaAsset` records.

Unknown slugs return a real 404 response. They must not silently display default preview data. The default preview receives its own explicit production slug and database record.

The client-side invitation-link generator must no longer import hard-coded invitation data. It receives invitation data through a server boundary or a narrowly scoped server endpoint.

## Authentication Design

Authentication uses Auth.js with the Credentials provider and JWT sessions.

- Login is available only at `/admin/login`.
- There is no public registration.
- The initial administrator is created by an idempotent seed command using `ADMIN_EMAIL` and `ADMIN_PASSWORD` from the environment.
- Plaintext passwords are never stored or logged.
- Login fields are validated server-side.
- Only active users with the `ADMIN` or `SUPER_ADMIN` role may receive a session.
- All `/admin/*` routes except `/admin/login` are protected.
- Failed login messages do not reveal whether an email exists.
- Repeated failures increment `failedLoginCount`; the account receives a temporary `lockedUntil` value after the configured threshold.
- A successful login clears failure state.
- Password reset, email verification, OAuth, and public account management are deferred.

The admin page included in this scope is a minimal protected landing page proving login, session enforcement, and logout. A full dashboard is not included.

## Cloudinary Organization

All existing invitation data is production data, including the customer-facing default preview.

```text
ayawarta/
└── production/
    └── invitations/
        ├── rika-fauzi/
        │   ├── couple/
        │   └── gallery/
        ├── shidqi-mita/
        │   ├── couple/
        │   └── gallery/
        ├── dudi-aini/
        │   ├── couple/
        │   ├── gallery/
        │   └── audio/
        └── default-preview/
            ├── couple/
            └── gallery/
```

Public identifiers are deterministic and descriptive, for example:

```text
ayawarta/production/invitations/rika-fauzi/couple/groom
ayawarta/production/invitations/rika-fauzi/couple/bride
ayawarta/production/invitations/rika-fauzi/couple/hero
ayawarta/production/invitations/rika-fauzi/gallery/gallery-01
```

The same structure applies to media downloaded from the old Cloudinary account and then uploaded to the new account. Existing old-account assets are not renamed or deleted.

## Migration Workflow

The migration is designed to be repeatable and fail-safe.

1. Validate required environment keys without printing secret values.
2. Rename the Cloudinary secret variables to server-only names:
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` may remain public for delivery use.
   - `CLOUDINARY_API_KEY` is server-only.
   - `CLOUDINARY_API_SECRET` is server-only.
3. Add `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.
4. Generate a manifest for local files and old-account URLs.
5. Upload every manifest entry to the new Cloudinary account using deterministic public IDs and safe overwrite behavior.
6. Record upload results and errors without recording credentials.
7. Verify each returned URL and compare expected versus uploaded asset counts.
8. Apply the Prisma migration to the local `ayawarta` database.
9. Seed `MediaAsset`, explicit hero/partner/gallery/music relations, `galleryVideoUrl`, invitations, and the initial administrator inside controlled transactions and upserts.
10. Query all invitations back through the repository and mapper.
11. Smoke-test every public invitation and the default preview.
12. Remove the dynamic local media directories and hard-coded invitation records only after verification succeeds.

If any upload or database step fails, local files and existing application references remain intact. The old Cloudinary account remains a rollback source.

The seed and migration commands must be safe to run more than once. Stable slugs, public IDs, and unique database keys prevent duplicate production records.

## UI Refactor

The current visual treatment remains the reference. Refactoring prioritizes clarity and consistency over visual novelty.

### Tailwind Design Tokens

Tailwind CSS v4 tokens are defined in the CSS-first theme for:

- AyaWarta brand blue and semantic foreground/background colors;
- borders, muted text, success, error, and focus ring colors;
- radii and shadows already represented in the interface;
- container widths and section spacing;
- reusable animation durations and easing.

Arbitrary values remain only where they are required to align image artwork precisely.

### Shared UI Components

Extract only patterns that repeat or establish a meaningful contract:

- `Container`;
- `SectionHeader`;
- `Button` and `IconButton` variants;
- reusable framed-image primitives used by invitation sections.

These components accept focused variant props and preserve escape hatches through `className`.

### Component Boundaries

- Static landing sections become Server Components.
- State, browser APIs, Framer Motion, and Firestore stay in small Client Components.
- Landing-page content arrays move to typed configuration modules.
- Component files use PascalCase consistently.
- Shared motion presets replace repeated duration and easing definitions.
- Motion respects `prefers-reduced-motion`.

### Accessibility and Responsive Behavior

The refactor may make small visual corrections when required to:

- expose clear keyboard focus states;
- set `aria-current` for active navigation;
- improve button labels and mobile touch targets;
- provide meaningful image alt text;
- fix responsive overflow, layout, or contrast defects;
- preserve semantic headings and form labels.

The blue AyaWarta palette, fonts, section order, artwork, pricing cards, Classic Rose template, and overall motion character must remain recognizable.

The admin login page uses the AyaWarta visual identity and the same design tokens. It must not look like an unrelated dashboard template.

## Environment Configuration

Local `.env.local` contains ignored secrets and connection strings. Documentation and `.env.example` contain names and safe examples only.

Required variables:

```text
DATABASE_URL
AUTH_SECRET
ADMIN_EMAIL
ADMIN_PASSWORD
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

For Aiven, `DATABASE_URL` must include the required TLS parameters. Vercel receives production variables through project settings; secrets must never be committed or passed to client components.

## Error Handling

- Missing invitation slugs produce a 404.
- Database failures produce a controlled server error without exposing connection details.
- Cloudinary migration failures identify the asset and step, then stop destructive cleanup.
- Seed failures roll back their transaction.
- Firestore wishes retain explicit loading, empty, submit-in-progress, and failure states.
- Authentication failures use a generic response and enforce temporary lockout.
- Image components define appropriate sizing behavior to prevent avoidable layout shift.

## Testing and Verification

### Automated Checks

- TypeScript type checking.
- ESLint using a script compatible with Next.js 16.
- Next.js production build.
- Unit tests for Prisma-to-domain mapping.
- Unit tests for login validation and authorization decisions.
- Unit tests for deterministic Cloudinary public-ID generation.
- Repository integration tests against the local PostgreSQL database.
- Seed idempotency check.

### Migration Checks

- Manifest count matches attempted upload count.
- Every required asset has a verified new-account URL.
- Every `MediaAsset.publicId` is unique.
- Every invitation has a verified required hero-media relation.
- No invitation relation references a missing media record.
- No dynamic path under `public/images/SAMPLE` or `public/images/dummy-couples` remains in source code before those directories are removed.
- No Cloudinary API secret is exposed through a `NEXT_PUBLIC_` variable.

### Smoke Tests

- Landing page at desktop and mobile breakpoints.
- Explicit default preview.
- `rika-fauzi` invitation.
- `shidqi-mita` invitation.
- `dudi-aini` invitation, including audio.
- Invitation-link generator.
- Firestore guest-book read and submit behavior.
- Admin login, protected route, account lockout, and logout.
- Unknown invitation slug returns 404.

## Production Cutover

This implementation prepares the production path but does not provision Aiven or mutate Vercel settings.

When Aiven is ready:

1. Add its TLS-enabled `DATABASE_URL` to a controlled migration environment.
2. Apply committed Prisma migrations.
3. Run the idempotent production seed.
4. Verify production invitation queries against Aiven.
5. Configure Vercel environment variables.
6. Deploy and smoke-test all production slugs.
7. Retain old Cloudinary assets and the previous deployment until the new deployment is confirmed healthy.

## Documentation Deliverables

- Updated project README with architecture and local setup.
- `.env.example` without secrets.
- Commands for Prisma migration, generation, seed, and administrator bootstrap.
- Cloudinary folder convention and migration instructions.
- Aiven/Vercel deployment checklist.
- Notes explaining why Firestore remains in use for real-time wishes and RSVP.

## Acceptance Criteria

The work is complete when:

1. Existing public pages retain their intended visual identity and behavior.
2. Invitation data is read from PostgreSQL through Prisma rather than hard-coded records.
3. Firestore wishes and RSVP remain functional and real-time.
4. All dynamic media is accessible from the new Cloudinary account under the approved production folder hierarchy.
5. Dynamic media files are removed from the repository only after successful verification.
6. The repository no longer exposes a Cloudinary API secret through a public environment variable.
7. An administrator can log in, access a protected page, and log out; non-admin users cannot access protected routes.
8. Migrations and seeds are repeatable without duplicate records.
9. Type checking, linting, tests, and the production build pass.
10. Setup, migration, and future Aiven/Vercel cutover steps are documented.

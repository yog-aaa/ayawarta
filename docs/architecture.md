# AyaWarta Architecture

## Purpose

This document explains the current system and the approved target architecture. It is written for agents implementing or reviewing the refactor.

## Current Architecture

### Application

- Next.js 16 App Router with React 19 and TypeScript.
- Tailwind CSS 4 through the PostCSS plugin.
- Framer Motion for landing-page and invitation animation.
- Next Image for local and remote image delivery.

### Data

- Invitation records are hard-coded in `src/lib/invitations.ts`.
- Default preview data is hard-coded in `src/lib/dummy-data/wedding/dummy-wedding.ts`.
- Wishes and RSVP are stored in Firestore and subscribed to directly from a Client Component.

### Media

- Some production media is stored in `public/images/SAMPLE`.
- Default-preview media is stored in `public/images/dummy-couples`.
- Other production media points at an older Cloudinary account with unstructured public IDs.
- Static UI and theme artwork is stored under `public/images`.

### Authentication

There is no admin authentication or protected admin area.

## Target Architecture

```text
Browser
  ├─ Public landing page
  ├─ Invitation pages
  │    ├─ Server Component loads invitation through repository
  │    └─ Client islands handle opening, motion, audio, and Firestore wishes
  └─ Admin login / protected admin page
          │
          ▼
Next.js server on Vercel
  ├─ Invitation repository and mapper
  ├─ Auth.js Credentials authorization
  ├─ Prisma Client
  └─ Cloudinary server utilities and migration scripts
          │
          ├──────── PostgreSQL
          │          ├─ invitations and child content
          │          ├─ media metadata
          │          └─ admin users
          │
          ├──────── Cloudinary
          │          └─ dynamic invitation media
          │
          └──────── Firestore
                     └─ wishes and RSVP only
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

Target source organization:

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
│   └── media/
├── generated/prisma/
└── lib/
    ├── server/
    ├── firebase.ts
    └── theme-config/
```

The exact generated Prisma location may follow the compatible Prisma release, but generated code must not be hand-edited.

## Public Invitation Data Flow

1. `[slug]/page.tsx` receives the slug.
2. A server-only repository queries the invitation and ordered relations.
3. A mapper converts the persistence result to the stable invitation domain contract.
4. Missing data triggers `notFound()`.
5. The selected theme configuration and invitation domain object are passed to the Classic Rose view.
6. Client components handle only behavior that needs browser APIs or client-side subscriptions.

## Wishes and RSVP Data Flow

1. The invitation slug identifies the Firestore message collection.
2. The wishes client subscribes in real time.
3. Submission writes name, message, attendance, and timestamp.
4. Unsubscription occurs on cleanup.

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

### Production target

- Next.js runs on Vercel.
- PostgreSQL runs on Aiven with TLS.
- Cloudinary serves production invitation media.
- Firestore serves real-time wishes and RSVP.

The initial implementation prepares Aiven/Vercel configuration but does not perform production cutover.

## Architectural Invariants

- One invitation slug identifies one invitation.
- Ordered child records use explicit `position` fields.
- Dynamic media is referenced through `MediaAsset`.
- Static payment logos remain local paths.
- Unknown slugs do not show another invitation.
- Server secrets never cross the server/client boundary.
- Production seed and media migration are idempotent.
- Old Cloudinary data remains untouched as a rollback source.


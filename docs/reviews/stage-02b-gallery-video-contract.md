# Stage 2B — Gallery Video Persistence Contract

## Status

`ACCEPTED — AWAITING IMPLEMENTATION COMMIT`

## Gap

The stable UI contract includes `InvitationData.gallery.videoUrl`, and the production `default-preview` record currently has a non-empty YouTube watch URL. The committed Prisma schema stores ordered gallery images but has no persistence field for that video URL.

Proceeding directly to Stage 3 would either lose approved production content or force the mapper to retain a hard-coded fallback.

## Approved Correction

- Add nullable `Invitation.galleryVideoUrl String?`.
- Treat it as external invitation content, not a Cloudinary `MediaAsset`.
- Create a fourth forward-only local migration without editing the first three migrations.
- The migration adds only the nullable scalar column and performs no backfill or data mutation.
- Preserve the current `default-preview` URL during Stage 6 seed.
- Normalize legacy empty strings to `null` during seed.
- Map `null` to the existing empty-string compatibility value only when an enabled gallery is mapped.

## Gate

Stage 3 is not authorized until Stage 2B is implemented, reviewed, and committed.

## Implementation Review

Reviewed scope:

- `prisma/schema.prisma`;
- `prisma/migrations/20261022022800_add_gallery_video_url/migration.sql`;
- regenerated Prisma Client files under `src/generated/prisma/`;
- `src/lib/server/db.integration.test.ts`.

No blocking or non-blocking implementation findings were found.

The implementation satisfies the approved contract:

- `galleryVideoUrl` is nullable, unindexed, non-unique, and has no foreign key;
- hero and music relations are unchanged;
- the fourth migration contains only the nullable `ADD COLUMN` statement;
- the first three migrations are unchanged;
- integration coverage queries the field through a read-only select;
- the hard-coded `default-preview` video URL remains unchanged;
- no seed or external-service operation is present.

Reviewer verification passed:

- Prisma schema validation and client generation;
- 5/5 hermetic unit tests;
- 5/5 live local-database integration tests;
- TypeScript validation;
- ESLint with zero errors and only the two approved pre-existing warnings;
- production build;
- four migrations found with the local schema up to date.

The programmer may commit exactly the reviewed Stage 2B implementation files. Stage 3 remains blocked until that commit is reported and the worktree is clean.

# Stage 2B — Gallery Video Persistence Contract

## Status

`APPROVED — AWAITING IMPLEMENTATION`

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

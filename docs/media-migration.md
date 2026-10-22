# Cloudinary Media Migration Runbook

## Objective

Move all dynamic invitation media to the new Cloudinary account, organize it under stable production paths, verify every resource, and only then remove repository copies and hard-coded source URLs.

## In Scope

- Partner portraits.
- Invitation hero images.
- Gallery images.
- Invitation-specific audio or video.
- Local media from `public/images/SAMPLE`.
- Local preview media from `public/images/dummy-couples`.
- Existing resources delivered from the old Cloudinary account.

## Out of Scope

- AyaWarta logo.
- Landing artwork and backgrounds.
- Social icons.
- Payment logos.
- Classic Rose backgrounds, frames, flowers, dividers, and bismillah artwork.
- External embed/content pointers such as `Invitation.galleryVideoUrl`; these are persisted in PostgreSQL and are not uploaded to Cloudinary.
- Deleting or renaming assets in the old Cloudinary account.

## Target Hierarchy

```text
ayawarta/production/invitations/{slug}/
├── couple/
│   ├── groom
│   ├── bride
│   └── hero
├── gallery/
│   ├── gallery-01
│   └── ...
├── audio/
└── video/
```

All four current records use production paths:

- `rika-fauzi`
- `shidqi-mita`
- `dudi-aini`
- `default-preview`

## Manifest Contract

Each entry contains:

| Field | Meaning |
| --- | --- |
| `invitationSlug` | One approved production slug. |
| `category` | `couple`, `gallery`, `audio`, or `video`. |
| `role` | Optional semantic role such as `groom`, `bride`, or `hero`. |
| `source` | Local path or old delivery URL. |
| `targetPublicId` | Deterministic new-account public ID. |
| `resourceType` | Upload resource type. |
| `altText` | Required for meaningful images. |
| `position` | Required for ordered galleries. |

Manifest entries must be typed, unique by target public ID, and reviewable without credentials.

## Migration Sequence

### 1. Preflight

- Confirm all required environment keys exist by name.
- Confirm the configured cloud name is the new account.
- Confirm source local files exist.
- Confirm old URLs are reachable.
- Validate every target public ID.
- Run dry-run mode and review the complete manifest.

### 2. Upload

- Upload local files directly.
- Re-upload old-account resources by remote URL or a controlled temporary stream.
- Use deterministic public IDs.
- Avoid creating random duplicate resources on retry.
- Record returned resource metadata.
- Never log credential values.

### 3. Verify

- Verify resource count equals required manifest count.
- Verify every returned URL uses HTTPS and the new cloud name.
- Verify type and format are compatible with the consumer.
- Verify nonzero byte size.
- Fetch delivery URLs or use the provider API to confirm availability.
- Check image dimensions where expected.
- Check audio is registered with the correct Cloudinary resource type.

### 4. Database Seed

- Upsert `MediaAsset` rows by `publicId`.
- Resolve one required hero row per invitation and assign it through `Invitation.heroAssetId`.
- Seed partner, gallery, and optional music relations using verified media rows.
- Persist external `galleryVideoUrl` content separately from `MediaAsset`, preserving the approved `default-preview` URL and normalizing legacy empty strings to null.
- Query every invitation through the application repository.

### 5. Application Cutover

- Change public routes to use Prisma data.
- Smoke-test all production slugs.
- Confirm Firestore wishes still use the same invitation slugs.

### 6. Repository Cleanup

Only after every gate below passes:

- remove `public/images/SAMPLE`;
- remove `public/images/dummy-couples`;
- remove hard-coded local paths and old Cloudinary URLs;
- verify no stale reference remains.

## Mandatory Cleanup Gates

- [ ] Manifest reviewed.
- [ ] All uploads successful.
- [ ] All new URLs verified.
- [ ] Expected and actual media counts match.
- [ ] Prisma migration successful locally.
- [ ] Seed successful twice without duplicates.
- [ ] Four invitations render from Prisma.
- [ ] Audio works for `dudi-aini`.
- [ ] Production build passes.
- [ ] Source scan finds no dynamic local-media references.
- [ ] Reviewer explicitly approves the cleanup stage.

## Failure Behavior

- One failed required upload fails the stage.
- A failed stage does not remove local files or change application references.
- Partial successful uploads remain safe because public IDs are deterministic and reruns converge.
- Database seed must fail if a required verified media record is missing.
- The generated report identifies failures by source and target public ID, not by secret-bearing request data.

## Rollback

Before production cutover:

- continue using the existing application data and URLs;
- rerun failed uploads after correction;
- restore repository files from Git if cleanup was approved and later reversed.

After a future production cutover:

- redeploy the previous Vercel build if necessary;
- keep old Cloudinary resources available;
- do not destroy Aiven data during application rollback.

## Review Evidence

The programmer must provide:

- dry-run manifest summary;
- count by invitation and category;
- upload success/failure summary;
- verification result without credential values;
- generated report path;
- exact files proposed for cleanup;
- repository-size comparison after approved cleanup.

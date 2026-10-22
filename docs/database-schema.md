# AyaWarta Database Schema Contract

## Scope

PostgreSQL stores invitation content, media metadata, and administrators. Firestore wishes and RSVP are outside this schema.

## Relationship Overview

```text
User 1 ─────── 0..* Invitation
                     │
                     ├── 1 InvitationSections
                     ├── 2 Partner
                     ├── 0..* Event
                     ├── 0..* GalleryItem ─── 1 MediaAsset
                     ├── 0..* LoveStory
                     ├── 0..* GiftAccount
                     ├── 1 hero ───────────── 1 MediaAsset
                     └── 0..1 music ───────── 1 MediaAsset

Partner 0..* ──────── 1 MediaAsset
```

Each invitation references exactly one hero asset. `heroAssetId` is indexed but not unique, so a `MediaAsset` may be deliberately reused by multiple invitations or also appear in a gallery.

Because `Invitation` has both hero and music relations to `MediaAsset`, both Prisma relation pairs must use distinct explicit relation names. Naming the existing music relation must remain a Prisma metadata-only change and must not recreate its existing database column or foreign key.

## Models

### Invitation

| Field | Contract |
| --- | --- |
| `id` | Generated stable primary key. |
| `slug` | Unique, normalized public route key. |
| `theme` | Initially `classic-rose`; keep extensible. |
| `variant` | Classic Rose variant key. |
| `weddingDate` | Canonical timestamp used by countdowns. |
| `heroAssetId` | Required Cloudinary media relation for `couple.heroImage`. |
| `galleryVideoUrl` | Optional external gallery-video embed URL; empty legacy values normalize to `null`. |
| `musicAssetId` | Optional media relation. |
| `ownerId` | Optional admin relation during initial migration. |
| timestamps | Created and updated timestamps. |

Index `slug` and `heroAssetId`; use explicit foreign-key delete policies. Deleting an owner must not delete production invitations. A hero asset referenced by an invitation must use `RESTRICT` and must not be inferred from the first gallery item.

`galleryVideoUrl` preserves the existing `InvitationData.gallery.videoUrl` contract. It is an external content pointer, currently a YouTube watch URL for `default-preview`, not a managed Cloudinary asset. The mapper returns an empty string when the nullable database field is absent but an enabled gallery is mapped.

### Partner

| Field | Contract |
| --- | --- |
| `invitationId` | Parent invitation. |
| `role` | `GROOM` or `BRIDE`. |
| `name` | Display name. |
| `parents` | Existing freeform parents description. |
| `instagram` | Optional username without URL. |
| `photoAssetId` | Required image asset. |

Unique constraint: `(invitationId, role)`.

### Event

| Field | Contract |
| --- | --- |
| `name` | Event title. |
| `displayDate` | Human-written Indonesian date string. |
| `displayTime` | Human-written time string. |
| `location` | Venue label; may be empty for migrated data. |
| `address` | Venue address. |
| `mapUrl` | External map URL. |
| `position` | Zero- or one-based ordering, used consistently. |

Unique constraint: `(invitationId, position)`.

The current data uses display strings that do not always match `weddingDate`. Preserve them during migration; do not silently rewrite customer content.

### GalleryItem

| Field | Contract |
| --- | --- |
| `assetId` | Required media relation. |
| `altText` | Meaningful accessible text. |
| `position` | Stable display ordering. |

Unique constraint: `(invitationId, position)`.

### LoveStory

Stores `title`, `content`, and `position`. Preserve current punctuation and wording unless the owner explicitly requests editorial changes.

### GiftAccount

Stores `platform`, `accountHolder`, `accountNumber`, `logoPath`, and `position`.

`logoPath` remains a local static-asset path. Account numbers must remain strings to preserve leading zeroes.

### InvitationSections

One record per invitation with boolean fields:

- `couple`
- `events`
- `gallery`
- `loveStory`
- `gifts`
- `wishes`

Unique constraint on `invitationId`.

### MediaAsset

| Field | Contract |
| --- | --- |
| `publicId` | Unique Cloudinary public ID. |
| `secureUrl` | Verified HTTPS delivery URL. |
| `folder` | Expected production folder. |
| `resourceType` | `IMAGE`, `VIDEO`, or `AUDIO`. |
| `format` | Cloudinary format when available. |
| `bytes` | Size returned by Cloudinary. |
| `width`, `height` | Nullable for resources without dimensions. |
| `originalName` | Traceability only; not a local runtime path. |
| timestamps | Created and updated timestamps. |

Do not infer resource type only from a URL extension.

Hero media is a first-class required invitation relation. Gallery membership and ordering are independent from the hero relation, even when the same Cloudinary asset is intentionally reused in both places.

### User

| Field | Contract |
| --- | --- |
| `email` | Unique, lower-case normalized email. |
| `name` | Administrator display name. |
| `passwordHash` | Hash only. |
| `role` | `ADMIN` or `SUPER_ADMIN`. |
| `isActive` | Authorization switch. |
| `failedLoginCount` | Consecutive failure count. |
| `lockedUntil` | Nullable temporary lock timestamp. |
| timestamps | Created and updated timestamps. |

No public user model or registration flow is required.

## Seed Contract

Required invitation slugs:

- `rika-fauzi`
- `shidqi-mita`
- `dudi-aini`
- `default-preview`

The seed must:

1. use upserts on stable unique keys;
2. run inside controlled transactions;
3. replace ordered child collections deterministically;
4. resolve media by verified public ID;
5. resolve every required partner photo and hero relation explicitly and fail if required media is missing;
6. preserve optional sections and current customer content;
7. produce identical record counts on a second run.

## Query Contract

The invitation repository returns:

- both partners;
- the required hero media URL;
- ordered events;
- optional ordered gallery;
- the optional external gallery-video URL without deriving it from a media asset;
- optional ordered love story;
- optional ordered gift accounts;
- section flags;
- media URLs required by the existing template contract.

The repository returns `null` for a missing slug. It does not substitute `default-preview`.

## Migration Discipline

- Create committed Prisma migrations for schema changes.
- Use the local Laragon database for development validation.
- Do not run `db push` against production.
- Do not run an Aiven migration until the production-cutover stage is explicitly assigned.
- Backward-incompatible schema changes require a new reviewed plan.

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
                     └── 0..1 music ───────── 1 MediaAsset

Partner 0..* ──────── 1 MediaAsset
```

## Models

### Invitation

| Field | Contract |
| --- | --- |
| `id` | Generated stable primary key. |
| `slug` | Unique, normalized public route key. |
| `theme` | Initially `classic-rose`; keep extensible. |
| `variant` | Classic Rose variant key. |
| `weddingDate` | Canonical timestamp used by countdowns. |
| `musicAssetId` | Optional media relation. |
| `ownerId` | Optional admin relation during initial migration. |
| timestamps | Created and updated timestamps. |

Index `slug`; use an explicit foreign-key delete policy. Deleting an owner must not delete production invitations.

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
5. fail if required media is missing;
6. preserve optional sections and current customer content;
7. produce identical record counts on a second run.

## Query Contract

The invitation repository returns:

- both partners;
- ordered events;
- optional ordered gallery;
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


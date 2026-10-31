# AyaWarta Database Schema Contract

## Scope

PostgreSQL stores invitation content, media metadata, and administrators. Firestore wishes and RSVP are outside this schema.

The authored schema is `prisma/schema.prisma`. Four historical migrations precede `prisma/migrations/20261030060000_add_admin_drafts_and_siger_fields/`, an additive A2/T2 migration applied to the approved production Neon target on 2026-10-30. The three admin tables and new columns now exist. All four version-1 publication baselines and their media pins were written and verified on 2026-10-30.

The additive A5 `20261031060000_add_draft_media_provenance` migration is authored and tested only on an isolated local PostgreSQL database. It has **not** been applied to Neon. A5 upload and first publication remain disabled by default until a separate reviewed activation.

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

Invitation 1 ──────── 0..1 InvitationDraft
Invitation 1 ──────── 0..* InvitationPublication
InvitationPublication 1 ─── 0..* InvitationPublicationMedia ─── 1 MediaAsset
InvitationDraft 1 ─────── 0..* DraftMediaProvision ─── 0..1 MediaAsset
```

Each invitation references exactly one hero asset. `heroAssetId` is indexed but not unique, so the database can represent reuse; the implemented admin editor restricts existing-invitation choices to associated assets and new-draft choices to verified assets owned by that draft. A hero may also appear in that invitation's gallery.

Because `Invitation` has both hero and music relations to `MediaAsset`, both Prisma relation pairs must use distinct explicit relation names. Naming the existing music relation must remain a Prisma metadata-only change and must not recreate its existing database column or foreign key.

## Models

### Invitation

| Field | Contract |
| --- | --- |
| `id` | Generated stable primary key. |
| `slug` | Unique, normalized public route key. |
| `theme`, `variant` | Persisted pair. The typed domain and public route accept Classic Rose with its six color variants or Siger Priangan with `ivory`; no production invitation has been converted to Siger. First publication of a new draft is gated to Classic Rose. |
| `weddingDate` | Canonical timestamp used by countdowns. |
| `heroAssetId` | Required Cloudinary media relation for `couple.heroImage`. |
| `galleryVideoUrl` | Optional external gallery-video embed URL; empty legacy values normalize to `null`. |
| `greeting`, `prayer` | New nullable content fields; map to empty strings for legacy public reads. No religious default. |
| `publishedVersion` | Non-null publication version with default `1`; the applied A2/T2 migration did not rewrite invitation content. |
| `musicAssetId` | Optional media relation. |
| `ownerId` | Optional admin relation during initial migration. |
| timestamps | Created and updated timestamps. |

Index `slug` and `heroAssetId`; use explicit foreign-key delete policies. Deleting an owner must not delete production invitations. A hero asset referenced by an invitation must use `RESTRICT` and must not be inferred from the first gallery item.

In the implemented schema, `slug` is unique; `heroAssetId`, `musicAssetId`, and `ownerId` are indexed. Deleting an owner sets `ownerId` to null. Deleting a referenced hero or music asset is restricted. Deleting an invitation cascades to its sections, partners, events, gallery items, stories, and gift accounts; deleting media used by a partner or gallery item is restricted.

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
| `caption` | New nullable editorial caption; an absent value maps to an empty string in the additive domain view. |
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

### InvitationDraft

`InvitationDraft` has a stable ID, nullable unique `invitationId`, `proposedSlug`, JSON `payload`, `schemaVersion`, optimistic `draftVersion`, nullable `basePublishedVersion`, creator/updater references, and timestamps. A new draft has no published invitation row and no base published version. An existing invitation may have one active draft and must reference a positive base version. The SQL migration checks those version/state invariants; `invitationId`, creator, and updater use restrictive foreign keys. The service validates a version-1 payload with Zod, permits incomplete content on save, and rejects theme/variant mismatches and duplicate row keys. Existing-draft media must be associated with that invitation; new-draft media must have a verified `DraftMediaProvision` owned by the same draft. The authenticated admin editor invokes these writes.

### DraftMediaProvision (A5, pending Neon migration)

`DraftMediaProvision` records a draft-owned image upload before Cloudinary receives it. Its immutable draft ID, slot, idempotency key, prepared SHA-256, size, dimensions, format, and deterministic public ID form a retry and recovery receipt. A `RESERVED` row has no `MediaAsset`; a `VERIFIED` row requires the Cloudinary asset identity, a unique `MediaAsset` relation, and verification time. The database enforces status consistency, positive dimensions/bytes, unique `(draftId, idempotencyKey)` and public ID, restrictive foreign keys, and a trigger that permits only the one-way reservation-to-verification transition. There is no automatic deletion. Existing canonical `MediaAsset` records are unchanged; new uploads use this database-backed provenance rather than editing the Git catalog per image.

### InvitationPublication and media pins

`InvitationPublication` records a unique `(invitationId, version)`, `BASELINE` or `PUBLISH` source, complete JSON snapshot, schema version, SHA-256 content digest, optional change summary/actor, and timestamp. The snapshot captures the invitation's content, visibility flags, ordered child rows, and full referenced media identities. `InvitationPublicationMedia` pins each referenced `MediaAsset` with a composite primary key. Restrictive foreign keys prevent deletion of a referenced publication, actor, invitation, or media asset. SQL triggers reject update or delete of publication and pin rows; history is append-only.

Before a published invitation can be opened for drafting, `draft-repository.ts` verifies its version-1 publication and the exact match between snapshot, media pins, and current published content. The four seeded legacy slugs require `BASELINE`; a newly first-published invitation requires actor-attributed `PUBLISH` and retained verified media owned by its original draft. The 2026-10-30 read-only preflight found 0 matching and 4 missing legacy baselines; the separately approved `prod:baseline --execute` activation then wrote those four baselines, and a subsequent read-only check found **4 matching and 0 missing**. The migration itself did **not** create baseline records. No snapshot or pinned media should be automatically deleted before a separate retention and recovery policy is approved.

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

The public repository still uses the compact `publicInvitationSelect` projection; the mapper defaults optional Siger content to empty strings and derives `Gallery.images` from ordered gallery items for Classic Rose. The full include is used by admin draft/snapshot operations; all four initial baselines are verified. New-draft media queries require the separate A5 migration and feature gate, which are not active on Neon.

## Migration Discipline

- Create committed Prisma migrations for schema changes.
- Use only an explicitly verified isolated non-production database for new integration tests; the operator's current local `DATABASE_URL` points to production Neon.
- Do not run `db push` against production.
- Do not run any further Neon migration without an explicitly assigned operation and target approval; the A5 migration remains pending.
- Published-invitation edits require verified version-1 provenance (`BASELINE` for legacy slugs, `PUBLISH` with actor and retained draft-owned media for newly created invitations), scoped media, and a separate explicit publish action; do not rerun the canonical seed on this populated database.
- Backward-incompatible schema changes require a new reviewed plan.

# A5 media provisioning contract

This implements Stage A5 of the approved admin specification and plan. It does not authorize a production Neon migration, a Cloudinary upload, customer publication, deployment, or commit. The A4 worktree is an accepted, uncommitted input; preserve it.

## Scope and ownership

- New private invitation drafts can upload images for the cover, groom, bride, and gallery. Music is optional and new audio uploads are outside A5. Existing published invitation editing keeps its A4 media rules.
- `data_engineer` owns the additive Prisma model/migration, provenance repository, and persistence tests.
- `backend_engineer` owns bounded upload route, image preparation, Cloudinary adapter, authenticated service, draft/preview media scope, and first-publication transaction/tests. Coordinate exact repository types with data.
- `frontend_engineer` owns uploader, editor picker/status integration, first-publication review UI, and component tests. Root owns this contract, documentation, integration, and QA assignment.
- The feature is disabled by default. Server configuration must require an explicit enabled setting bound to the existing approved Cloudinary cloud `uhwi7xvb` before any upload or new-invitation publication. Missing A5 tables must leave the existing A4 editor usable.

## Provenance and retry

Add one `DraftMediaProvision` ledger. A row belongs to a stable `InvitationDraft.id`, records its original upload slot, idempotency key, prepared content SHA-256, exact public ID, dimensions/bytes/format, creator, state, optional Cloudinary `asset_id`, and optional unique `MediaAsset.id`. A unique `(draftId, idempotencyKey)` and unique public ID prevent duplicate reservations. `RESERVED` can have no media link; `VERIFIED` requires Cloudinary identity and a media link. Restrictive foreign keys and checks protect the ledger. No automated asset or ledger deletion.

The public ID is based on the immutable draft ID, not the editable proposed slug: `ayawarta/production/invitations/draft-{draftId}/images/{provisionId}-{sha16}`. Changing a proposed slug does not strand verified media. The client submits a UUID idempotency key and stable slot identity. The server rejects reuse of a key with different prepared bytes or slot. A retry of a reserved row first reads the exact remote public ID and verifies it; it uploads only when absent. A verified row returns the same media ID. A separate authenticated recovery action can inspect a reserved row without the original file. An uploaded but unlinked asset remains visible as pending and cannot be selected or published.

## Upload boundary

`POST /admin/api/drafts/[id]/media` accepts raw image bytes with a strict streamed byte cap and same-origin check. Each request rechecks the current admin and saved new draft. The server verifies declared type against file signature and Sharp decoding, dimensions/pixel limits, then makes one slot-sized optimized derivative. Only that prepared buffer is uploaded through a server-only Cloudinary client with `overwrite: false` and deterministic public ID. It then reads the asset back and verifies `asset_id`, public ID, resource type, versioned delivery URL binding, format, bytes, dimensions, and content identity before a transaction creates `MediaAsset` and marks the provision `VERIFIED`. Never trust a client URL or media ID. Return sanitized validation/conflict/dependency errors; a remote success followed by database failure includes a safe recovery ID.

The editor keeps its current native media selects and preview. Upload controls sit by each image slot and become available only after the draft is saved and clean. Pending/verified/retry status is explicit and accessible on narrow screens. Uploading does not silently publish. The editor selects a newly verified media ID and saves the draft with the existing version check; on conflict it reloads instead of merging stale state. Draft media choices and preview include only verified rows owned by that exact draft. No other draft's or customer's media is selectable.

## First publication

Review shows the proposed public URL, complete saved content, guest-visible changes, and `Belum terbit` instead of a live version. Confirming the exact slug starts a serializable transaction. It locks the draft, rechecks its version, unique slug, complete Classic Rose payload, every referenced verified draft-owned media ID, and the recorded remote verification receipt. It creates the public `Invitation` and ordered children, writes a complete version-1 `PUBLISH` snapshot plus media pins and actor, then links and rebases the retained draft. Any database failure rolls back the public aggregate, history, and draft link. External Cloudinary checks happen before the transaction and are rechecked against persisted receipts inside it. After commit, revalidate exact routes and read the exact slug; distinguish a committed-but-unverified response.

Existing A4 publication remains unchanged for the four legacy invitations. Version-1 `BASELINE` is still required for those records; a version-1 `PUBLISH` is valid only for a newly created invitation with actor and verified draft-media provenance. Both paths verify full snapshot digest and media pins. The application does not enable Siger Priangan publication in A5.

## Evidence and activation

Use fake Cloudinary clients and an explicitly isolated PostgreSQL target for upload failure/retry, ownership, first-publication rollback/recovery, and legacy A4 regression. Verify byte limits, resulting dimensions, mobile picker behavior, no public write on upload/save, and no secrets in client code or errors. Report exact Cloudinary IDs if a separately approved live upload ever occurs. A5 source completion alone does not activate production uploads or migrate Neon.

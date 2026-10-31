# Administrator invitation operations

AyaWarta has one active administrator permission level. Sign in at `/admin/login`; the private workspace is `/admin`. Public guests do not have accounts. The list at `/admin/invitations` comes from Prisma, and a blank list or read failure is shown explicitly rather than filled with sample invitations.

## Draft, preview, and publication

1. Open an existing invitation or choose **Buat draf**. A new draft has a proposed slug and no public invitation until the first successful publication. The four existing production slugs cannot be renamed in this editor.
2. Enter content by section and save. An incomplete draft may be saved. **Simpan** changes only the private draft; the public invitation remains at its last published version. The editor shows unsaved changes, save progress, timestamp, and version. If another editor changed the draft, reload and reconcile instead of forcing a stale save.
3. Use the saved-draft **Pratinjau**. It is administrator-only, visibly marked as a draft, and never uses `default-preview` as a fallback. Wishes and RSVP cannot be submitted from preview.
4. After the content and required media are complete, use **Tinjau penerbitan**. Check the exact public path, current version or **Belum terbit**, draft version, and guest-visible change summary. Type the exact slug in the confirmation dialog before **Terbitkan**. Publication runs separately from save and upload.
5. On success, follow **Lihat undangan publik**, confirm the exact slug and version, and reopen the editor from the list before another edit. If the panel says the publication status is uncertain, inspect the list and public route first; do not repeat the action blindly. A version conflict requires reload and review.

The four seeded invitations require their sealed version-1 `BASELINE` plus media pins before editing. First publication of a new Classic Rose invitation writes a version-1 `PUBLISH` snapshot with actor and pins in one transaction. Publishing the Siger Priangan theme, renaming a published slug, unpublishing, deleting, and modifying Firestore wishes/RSVP are outside this panel's current operation.

## Image upload for a new invitation

The A5 upload controls are disabled by default until the reviewed Neon migration and Vercel activation in the [production runbook](runbooks/admin-a5-production-activation.md). While enabled, they appear only on a saved, unchanged **new** draft for cover, groom, bride, and gallery slots. Save a gallery row before uploading its image. New audio uploads are not available; music is optional.

- Select a JPEG, PNG, or WebP of at most 15 MiB. The server validates the file and prepares a slot-sized WebP of at most 3 MiB before upload. Uploading may take time; the form prevents another save or publication until it finishes.
- A successful upload verifies Cloudinary metadata and delivered content, then selects the media locally. Press **Simpan** to persist that choice in the draft. The guest page is unchanged until **Terbitkan** succeeds. The Cloudinary delivery URL itself is an unlisted public URL, so do not upload access-controlled content.
- If the remote upload succeeds but the database link fails, the editor shows a pending reservation. Use **Pulihkan unggahan** to inspect the recorded remote resource; if it is absent, select the **same file** for **Unggah berkas yang sama**. The original idempotency key must match the same prepared bytes and slot. A mismatch is a conflict, not a reason to overwrite a Cloudinary public ID.
- Once the new invitation is published, the editor follows the same associated-media rules as other published invitations. Unused draft upload receipts remain in the ledger for operator review and are not presented as published-media choices. No automated Cloudinary or ledger deletion occurs.

The only upload route is `POST /admin/api/drafts/[id]/media`. It checks the current admin session, same origin, explicit A5/Cloudinary gates, saved draft version, and streamed byte limit before provider access. Do not call it from a public guest page or supply a media URL as proof of ownership.

## Operator triage

| Symptom | Check | Safe next step |
| --- | --- | --- |
| Login rejected or admin route redirects | Confirm the active admin and session; inspect sanitized server logs. | Resolve account/session issue without re-running the canonical seed. |
| Draft save conflict | Compare the editor's draft version with the latest list/editor view. | Reload and reconcile; do not force an old payload over newer content. |
| Image remains pending | Record draft ID, provision ID, slot, and whether Cloudinary has the exact public ID. | Use the recovery action; preserve the reservation and remote asset. |
| Upload rejects a file | Check type/signature, 15 MiB input ceiling, decoded dimensions, and whether the gallery row is saved. | Prepare a valid image and use a new upload key if its content changes. |
| Publication is uncertain after a network error | Check the exact public slug, version, and publication history. | Do not repeat until the committed state is established. |
| New invitation cannot publish | Check A5 activation, saved complete content, required verified cover and partner photos, and remote readback. | Correct the draft or deployment gate. Do not borrow another customer's media. |

Never paste credentials, customer photos, Cloudinary delivery bytes, or raw database URLs into support notes. Record IDs and sanitized outcomes only. Production data edits, uploads, migrations, and Vercel changes require their own reviewed operation.

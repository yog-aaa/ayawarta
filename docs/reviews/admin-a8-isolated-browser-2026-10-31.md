# Admin A8 isolated browser review

**Status:** the synthetic upload, same-key retry, recovery, preview, and first-publication browser flow passed. The A5 production activation browser gate remains **OPEN** because Classic Rose still fades content during reduced motion. No production release or feature activation occurred.

## Isolation and fixture

On 2026-10-31, a disposable PostgreSQL 18 cluster served `ayawarta_browser` at `127.0.0.1:55438`. Its identity was checked before schema and fixture writes. All six committed migration SQL files were applied to the empty database; because they were applied with `psql` for this fixture, this is not evidence of a populated Prisma migration ledger. One synthetic admin and synthetic invitation content were used. A disposable copy of Next.js ran on port 3108 without `.env` files. Its DB module accepted only that exact loopback database, and its fake Cloudinary provider stored prepared WebP bytes locally. The original application on port 3001 and Neon were not used for test transactions.

The browser was the Codex in-app browser. Three synthetic 640 × 960 PNGs and a text file were selected through the actual file inputs. One synthetic file of 15,728,641 bytes was used for the size limit. The harness injected a one-time database finalization failure on the groom image after fake provider success. A harness-only exception allowed browser origin `127.0.0.1:3108` when Next represented the internal request URL as `localhost:3108`; the repository route was not changed.

## Browser results

| Check | Observation |
| --- | --- |
| Login and create | Synthetic admin logged in; a private draft was saved and then opened through `/edit`. |
| Type and size rejection | `.txt` produced “Pilih berkas JPG, PNG, atau WebP.” A file one byte over 15 MiB produced “Foto kosong atau melebihi 15 MB.” |
| Successful upload | Hero and bride were verified, previewed, selected, and saved. The local fake provider and image route returned success. |
| Failure and recovery | Groom upload returned 503 after fake remote success and appeared under “Unggahan menunggu pemulihan”. “Pulihkan foto” linked it without a second provider upload; the selected image was saved. |
| Same-key retry | A second synthetic draft's cover upload returned a planned 503. The pending row's “Pilih kembali berkas foto yang sama” and “Unggah berkas yang sama” reused the stored idempotency key. Readback found one `VERIFIED` provision, one linked media asset, and one fake provider record for that public ID. |
| Private versus public | The complete private preview rendered the three synthetic images and disabled guest confirmation and wishes. `/a8-browser-sintetis` returned 404 before publication. |
| Review and publication | The review showed the exact slug and draft version 6. The final dialog required typing that slug. After confirmation, the public route rendered and the editor reported the latest version published. |
| Database readback | One invitation with published version 1, one linked draft, one complete version-1 `PUBLISH` snapshot, three media pins, three `MediaAsset` rows, and three `VERIFIED` provisions. No `RESERVED` provision remained. The fake provider had exactly three records; groom had one provider record and one public ID. |
| Responsive layout | The opened private invitation was inspected at actual browser widths 360, 390, 430, 768, 1280, and 1440 px. Document scroll width did not exceed client width at any size; no completed image had a zero natural width. The synthetic hero, groom, and bride URLs returned local HTTP 200 and had positive natural dimensions. Mobile and desktop screenshots were visually inspected in the browser session. |
| Keyboard | The public “Buka undangan” button accepted keyboard focus and matched `:focus-visible` with a visible outline. |
| Reduced motion | Windows Accessibility → Visual effects → Animation effects was initially **On**, changed temporarily to **Off**, and the browser reported `prefers-reduced-motion: reduce = true`. The public invitation opened without overflow, and the document's computed scroll behavior was `auto`. On scrolling to the event section, its content still faded in before settling. The Windows setting was restored to **On**, and the browser again reported `reduce = false`. |

## Remaining gate work and findings

1. **Reduced motion, blocking:** Classic Rose still animates opacity when the browser has the reduced-motion preference. The global CSS changes scroll behavior but does not suppress the Framer Motion section entrances. Make these sections appear in their final state immediately in reduced-motion mode, then repeat the browser check before closing the A5 gate.
2. **New-draft transition, fixed locally:** the `/new` page now passes the A5 flag to the editor. In the updated isolated browser copy, the first save immediately showed the active upload guidance, before the `/edit` transition completed. The targeted route test passed.
3. **Recovery copy, fixed locally:** the uploader now treats a previously pending outcome as verified when its parent clears the slot's pending provision. In the updated isolated browser copy, the previously stale status changed to “Foto terverifikasi dan dipilih.” The targeted component test passed.
4. **Host normalization:** the original strict origin comparison returned 403 when this harness used browser host `127.0.0.1` and Next supplied `request.url` with `localhost`. The exception used to complete this isolated test exists only in the disposable copy. Verify the effective origin and forwarded host on the actual release target before enabling uploads; do not generalize an untrusted forwarded header.
5. **Image quality warning:** Next logged a quality-78 image warning because the configured quality list contains only the default 75. The three local synthetic images nevertheless loaded. Review the production image configuration separately.

No Neon write, Cloudinary upload/admin API call, Vercel mutation, or Git commit/push occurred. The browser screenshot observations were displayed during the session and were not saved as durable artifacts. The disposable server, cluster, and fixtures are removed after this review.

# A5 Production upload check — 2026-11-11

**Status: the initial Production upload failed; the same QA reservation was verified after the Cloudinary 404 fix deployed. The draft remains private.** This record concerns the owner-requested test of the optimized admin photo path on AyaWarta Production. A single successful upload does not establish stable function latency.

## Preflight

- Vercel Production deployment `dpl_5h9csxA4tX7fJpXQMKKjFd5bkyJd` was Ready, served `ayawarta.my.id`, and identified source commit `235b929d02b54ade9b5396f5f2b5f8ac7686bca6` (`perf(admin): percepat pemrosesan foto undangan A5`).
- Authenticated admin listed four published invitations and zero private new drafts. The upload UI requires a saved new draft and does not upload into an already published invitation.
- The owner authorized a dedicated private QA draft. Admin created `qa-a5-upload-20261111`, draft ID `cmwcay4oi000008jt45rdu0i5`, with synthetic partner names. Editor reported saved draft version 1. No publication was requested or performed.
- Automatic permission review initially rejected transmission because the owner had authorized the QA draft but not the specific photo's Cloudinary upload. The owner then explicitly authorized uploading `gallery-01.jpg` to Production Cloudinary as this draft's hero. No other photo or draft was used.

## Live result

- The first browser upload reached the A5 route. The editor returned to an actionable state after about 20 seconds and displayed **Unggahan menunggu pemulihan**. This is browser-observed end-to-end elapsed time, not isolated Sharp or Cloudinary function time.
- A guarded, read-only query on the approved Neon target found exactly one `DraftMediaProvision`: ID `c13a6dd7-33f4-46b7-bc74-f7a9ca319c06`, slot `cover`, state `RESERVED`, WebP dimensions 1600 × 1066, 297,592 bytes, and no linked media or Cloudinary asset ID. The resize/encoding stage therefore completed in Production.
- The editor's **Pulihkan foto** action could not link the media. A read-only Cloudinary Admin API lookup using the approved local Production credentials found no remote resource for the reserved public ID. No URL or credential was recorded.
- The same supplied JPEG was selected again using **Unggah berkas yang sama**, preserving the existing idempotency key and provision ID. The editor returned to pending after about 26 seconds. A second read-only Neon and Cloudinary check showed the same single `RESERVED` row and no remote resource. No new reservation, media asset, or published invitation was created.
- Browser console and recent Vercel error/warning logs showed no recorded error. The service maps unexpected provider failures to a generic pending response without logging the failing phase, so these empty logs do not establish a healthy upload path. The public `/qa-a5-upload-20261111` route returned 404 as expected.

## Initial boundary and follow-up

The Production photo preparation succeeded, but the initial Cloudinary lookup did not progress to storage on either attempt. The sanitized UI/runtime evidence alone did not reveal why; the read-only Cloudinary probe below identified a 404 response shape that the client mishandled. The retry needed to keep the existing idempotency key and reservation. Vercel Production Cloudinary Secret values were non-readable, so credential parity would require separate attestation only if the corrected retry failed.

## Root-cause investigation and fix

The approved local Cloudinary Admin API returned the missing-resource status as `{ error: { http_code: 404 } }`. `RealAdminMediaCloudClient.read` only checked a top-level `http_code`, so it threw during the initial remote lookup instead of returning `null` and proceeding to `upload_stream`. This explains why both Production attempts left the same reservation without a remote asset. A new test reproduced the nested-404 failure against the old implementation, then passed after the client accepted both top-level and nested 404. Tests still require 401 and 500 to propagate.

The fix also records a sanitized `A5_MEDIA_UPLOAD` outcome, elapsed service time, and failure phase/status/category. It never logs provider messages, public IDs, URLs, credentials, or customer content. Frozen pnpm install, Prisma format/validate/generate, TypeScript, ESLint, full Vitest (70 passed/3 skipped files; 878 passed/3 skipped tests), and a Next.js production build passed before deployment.

## Post-fix Production retest

- Vercel Production deployment `dpl_DZ6o2tHovhDirRs6RaQ9z9xhNkLm` was Ready and aliased to `ayawarta.my.id` at commit `7fc11d73e53a22fd50ab7e2f69c653a802e75453` (`fix(admin): tangani 404 Cloudinary saat unggah media A5`).
- The authenticated editor still showed the single pending cover reservation. The same owner-approved `gallery-01.jpg` was selected through **Unggah berkas yang sama**, retaining its idempotency key. The pending warning disappeared and the editor showed the verified 1600 × 1066 cover image. The cover selection was saved to the private draft, advancing it from version 1 to version 2.
- Vercel runtime logged `A5_MEDIA_UPLOAD { outcome: 'verified', durationMs: 6204 }` for the Production media POST. No error-level logs appeared for this deployment in the queried 15:43–16:33 UTC window. This is one service invocation, not a latency percentile or a browser/network timing measurement.
- A guarded, read-only Neon check found exactly one reservation for the QA draft: the original provision is `VERIFIED`, slot `cover`, WebP 1600 × 1066, 297,592 bytes, linked to one `MediaAsset` and selected by the saved draft. A separate Cloudinary Admin API readback matched the asset ID, public ID, versioned secure URL, format, byte count, and dimensions. No new reservation was created.
- The draft has no published invitation ID, and the public `/qa-a5-upload-20261111` route returned 404. Its private preview reported missing wedding date and event fields because the minimal QA fixture is intentionally incomplete; this does not affect the upload result.

The original missing-resource failure is fixed in the live upload path. Keep the QA draft private; additional latency samples belong to a separate performance assessment.

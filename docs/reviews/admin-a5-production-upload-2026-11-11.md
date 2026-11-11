# A5 Production upload check — 2026-11-11

**Status: Production upload failed before Cloudinary storage; draft remains private.** This record concerns the owner-requested test of the optimized admin photo path on the AyaWarta Production deployment. It does not attest to a successful upload or stable function latency.

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

## Boundary and follow-up

The Production photo preparation succeeded, but the initial Cloudinary lookup did not progress to storage on either attempt. The sanitized UI/runtime evidence alone did not reveal why; the read-only Cloudinary probe below identified a 404 response shape that the client mishandled. Do not create another idempotency key, publish the QA draft, or delete its reservation while the fix is reviewed. Vercel Production Cloudinary Secret values are non-readable; if a retry still fails after deployment, attest their parity with the approved source without printing them.

## Root-cause investigation and code candidate

The approved local Cloudinary Admin API returned the missing-resource status as `{ error: { http_code: 404 } }`. `RealAdminMediaCloudClient.read` only checked a top-level `http_code`, so it threw during the initial remote lookup instead of returning `null` and proceeding to `upload_stream`. This explains why both Production attempts left the same reservation without a remote asset. A new test reproduced the nested-404 failure against the old implementation, then passed after the client accepted both top-level and nested 404. Tests still require 401 and 500 to propagate.

The local code candidate also records a sanitized `A5_MEDIA_UPLOAD` outcome, elapsed service time, and failure phase/status/category. It never logs provider messages, public IDs, URLs, credentials, or customer content. Frozen pnpm install, Prisma format/validate/generate, TypeScript, ESLint, full Vitest (70 passed/3 skipped files; 878 passed/3 skipped tests), and a Next.js production build passed. The change is **not yet deployed**, so the live upload remains unverified. Once the owner reviews, commits, and deploys this candidate, retry only the saved QA provision with the same original file and idempotency key, inspect the new phase/timing log, verify Cloudinary readback and Neon `VERIFIED` state, and confirm the draft remains private.

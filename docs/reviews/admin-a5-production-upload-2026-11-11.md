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

The Production photo preparation succeeded, but the path from the reserved row to Cloudinary storage failed on both attempts. The exact failing call or provider error is not observable from the current sanitized UI/runtime evidence. Stop further upload retries until the A5 service records safe phase-specific timings and error class/status for its Cloudinary read/upload/readback steps, then deploy the diagnostic change and retry **the same** provision. Do not create another idempotency key, publish the QA draft, or delete its reservation while diagnosing. Confirm Vercel Production Cloudinary Secret parity with the approved source without printing secret values.

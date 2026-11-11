# Admin A9 production smoke review

**Status:** public-route recovery verified; A5 activation remains blocked by separate gates. The owner-supplied Vercel screenshot showed commit `ed5e92f1d7bb1d0b431929f9934ae5999e03d858` on `main` as **Ready** in **Production**. The first public smoke check on 2026-11-01 (Asia/Jakarta) found HTTP 500 on every tested invitation route. After the owner added the three missing Cloudinary variables and redeployed, the repeated read-only checks passed. A Ready build alone was not an application-health pass.

## Evidence

- The local worktree was clean at `ed5e92f1d7bb1d0b431929f9934ae5999e03d858`. Read-only `git ls-remote origin refs/heads/main` returned the same SHA. GitHub's Vercel commit status was `success` and linked to deployment `3GvPSYZHWLzY7v1KTgbkQBdWMR3N`; the owner's screenshot independently showed Production, Ready, and the same short SHA.
- The guarded `Update` release script dry run passed without external commands. Its executable path requires a fresh Git push and rejects a remote already pointing at the approved SHA, so it was not executed.
- The guarded Neon release-state verifier returned `seeded`; the read-only baseline check returned **4 matching, 0 missing**. These checks used the existing approved target fingerprint and did not write to Neon.
- The three focused A8 test files passed **14 tests**; TypeScript `--noEmit` passed. The repository's `pnpm.cmd` wrapper tried to reinstall `node_modules` in a noninteractive session, so these local checks used the already installed binaries and an explicit Node executable. No dependency install was allowed.

| Public request | HTTP status |
| --- | ---: |
| `/` | 200 |
| `/rika-fauzi` | 500 |
| `/shidqi-mita` | 500 |
| `/dudi-aini` | 500 |
| `/default-preview` | 500 |
| `/rika-fauzi/invite` | 500 |
| `/slug-yang-tidak-ada-a8` | 500; expected 404 |
| `/admin/login` | 200 |
| `/admin` without a session | 307; expected redirect |

The `rika-fauzi` response included public Next.js error digest `3128543183`. Its headers identified Vercel and an uncached 500 response. The owner then supplied Vercel Production Function Logs for deployment `dpl_3GvPSYZHWLzY7v1KTgbkQBdWMR3N`, branch `main`, domain `ayawarta.my.id`, which correlate that exact digest with `Environment validation failed. Missing or invalid keys: CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`. The accompanying Project Environment Variables screenshot listed the database and authentication keys in Production but did not list those three Cloudinary keys. The missing Cloudinary configuration was the confirmed immediate cause of the tested 500 responses. These logs do not independently prove the values or parity of the listed database keys.

## Recovery verification

The owner reported adding the three missing variables and redeploying. GitHub's Vercel status for the same commit changed to `success` with a new deployment URL ending in `uVPDDEuRCpg7NFcz3DYjMqVqdzzb`. The exact active Production deployment ID was not independently read from the Vercel dashboard. The public domain now returns:

| Read-only request | HTTP status after redeploy |
| --- | ---: |
| `/` | 200 |
| `/rika-fauzi`, `/shidqi-mita`, `/dudi-aini`, `/default-preview` | 200 each |
| `/rika-fauzi/invite` | 200 |
| `/slug-yang-tidak-ada-a8` | 404 |
| `/admin/login` | 200 |
| `/admin` without a session | 307 |

In an isolated in-app browser tab, `/rika-fauzi` opened and rendered its cover and content. Its 14 DOM images had zero completed broken images and the document had no horizontal overflow at the observed viewport. The guest-wishes list loaded from Firestore; no wish was submitted. Guarded read-only Neon checks after redeploy again returned `seeded` and **4 matching, 0 missing** baselines. No customer content was edited. The authenticated admin list and private draft preview were not tested in this Production smoke pass.

The owner then supplied a full Project Environment Variables screenshot taken after the correction. It lists the three Cloudinary variables in Production and does not list `AYAWARTA_A5_MEDIA` or `AYAWARTA_A5_APPROVED_CLOUD` in the Project tab. A second screenshot of the Shared tab states **No shared variables linked**. Both A5 switches are therefore absent from the project's listed Project and Shared variables. The feature gate requires both exact values, so A5 media remains disabled on the redeployed application; no upload smoke test was attempted.

## Open gates

1. Record the exact new active Production deployment ID. The Project and Shared variable screenshots establish that both A5 media switches are absent; the public route recovery does not authorize new image upload.
2. Independently verify Production `DATABASE_URL` and `DATABASE_URL_POOLED` values against the approved secret source, as required by the [activation runbook](../runbooks/admin-a5-production-activation.md). The earlier screenshot proves only that keys with these names exist.
3. Complete a read-only authenticated admin list/private-preview smoke check using an explicitly approved operator session, if this is required to close the application-release gate. Do not save or publish a customer draft for smoke testing.
4. The A8 isolated-browser record still lacks a passing post-fix reduced-motion browser check. The owner stated A8 was verified, and additional evidence was requested to establish whether that verification included reduced motion. Keep that gate open until the result is recorded.

The owner changed Vercel Production configuration and redeployed between the two smoke passes. This reviewer made no Git push, Vercel configuration change, Neon write, Cloudinary upload, Firestore write, or customer-content mutation.

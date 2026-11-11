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

## Follow-up verification — 2026-11-11

The worktree was clean at `8fadb997ad8dc33213ef9f3e42e99bb48d02dad2`, matching `origin/main`. That commit changes only this review and the A5 runbook; application code is still from A8. GitHub reported a successful Vercel status for the new commit with deployment-page token `6UpfQdHAPFfmiXMr9QaMMLWRVosF`. This is not independent evidence of the currently assigned Production deployment ID: the isolated Vercel browser tab reached a login page, and the newly configured Vercel MCP was not exposed to this already running Codex chat.

Read-only HEAD requests to the public domain returned 200 for `/`, all four invitation slugs, `/rika-fauzi/invite`, and `/admin/login`; 404 for `/slug-yang-tidak-ada-a9`; and 307 for anonymous `/admin`. Guarded read-only Neon checks again returned release state `seeded` and **4 matching, 0 missing** version-1 baselines. The guard confirmed that the operator's local direct and pooled URLs point to the approved Neon target with TLS, but it did not read or compare the Vercel Production secret values.

Playwright used a fresh isolated Microsoft Edge 157.0.4341.42 profile against the public `/rika-fauzi` invitation. With `prefers-reduced-motion: reduce` emulated and confirmed by `matchMedia`, the event heading's container had computed opacity `1`, transform `none`, and zero running animations both before and immediately after scrolling into view. The document had no horizontal overflow and no completed broken images at 360, 390, 430, 768, 1280, and 1440 px. With ordinary motion, the same heading started hidden and animated into view after scrolling; no page errors were observed. The first ordinary-motion attempt clicked before page load completed and timed out waiting for the event heading; repeating after the load event opened on the first click and passed. This is a passing post-fix check of the public Classic Rose motion behavior, not a rerun of the disposable A8 upload/preview fixture.

Three targeted source test files passed **14/14** tests. The sandboxed `pnpm` wrapper failed while trying to create its store symlink, so the already installed Vitest binary was run directly without dependency changes. Playwright's bundled Chromium was unavailable, and sandboxed Edge exited at launch; the successful run used the installed Edge with an isolated profile outside that sandbox. The temporary browser script was removed after testing.

Vercel MCP then gained owner-approved access to the project. Project and alias metadata independently identify `dpl_6UpfQdHAPFfmiXMr9QaMMLWRVosF` as the deployment currently serving `ayawarta.my.id`: Production, Ready, `main`, commit `8fadb997ad8dc33213ef9f3e42e99bb48d02dad2`, created 2026-11-11 11:30:13 UTC. The previous Production deployment `dpl_uVPDDEuRCpg7NFcz3DYjMqVqdzzb` is marked Ready and rollback-eligible by Vercel, but its admin-list health has not been established. Project environment metadata lists the three Cloudinary keys and both Neon URL keys in Production. Neither `AYAWARTA_A5_MEDIA` nor `AYAWARTA_A5_APPROVED_CLOUD` appears in the project variable listing, consistent with the earlier owner-supplied empty Shared tab. The Vercel tool did not reveal the encrypted Neon URL values, so direct/pooled Production secret parity with the approved target remains unverified.

With the owner's explicit approval, an isolated Edge session used the previously supplied admin account for read-only Production smoke. Login POST returned 200 and redirected to `/admin`; the authenticated dashboard returned 200. Authenticated GET `/admin/invitations` repeatedly returned **500**, preventing the private draft-preview check. Vercel Runtime Logs for that request, current deployment, and `main` report that Sharp cannot load on `linux-x64`: `ERR_DLOPEN_FAILED`, missing `libvips-cpp.so.8.18.7`. Source imports provide a plausible entry path on the list page: `AdminInvitationList` → `AdminOpenDraftButton` → `admin/actions` → `media-service` → `media-image`, whose top-level import loads `sharp`. The runtime log proves the module failure; it does not by itself prove why the libvips binary was omitted from the deployment. The login POST also emitted an SSL-mode warning, which did not prevent authentication. No password or token value was recorded.

**Application-release status: blocked by the authenticated admin-list 500.** Public invitations and the current public reduced-motion behavior pass, but the previous Ready deployment must not be assumed healthy for admin rollback. The next reviewed stage should address Sharp packaging or defer its import until media processing, then repeat authenticated list and private-preview smoke on the deployed revision. The A5 runbook's stricter isolated-fixture reduced-motion requirement remains open. The Production Neon secret-value parity check remains open. Both A5 media switches remain absent; no activation was attempted. The approved admin login may have updated authentication/session records; no customer draft was edited, uploaded, or published, and this reviewer made no Cloudinary, Firestore, Neon schema/data, Vercel configuration, or deployment change.

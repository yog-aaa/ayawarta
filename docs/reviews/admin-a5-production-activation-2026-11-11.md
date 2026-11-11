# Admin A5 Production activation — 2026-11-11

**Status: passed for configuration activation and read-only smoke.** The first approved customer image upload and publication remain separate content operations. Operator: Codex, after the owner's approval of the staged cutover in this conversation. Project `prj_ID7BsIbGJehiwcBAV9Pfdob45519` on team `team_DSkDAya7bcVsyH4sk1Hn2eIY`; Production branch `main`; reviewed source SHA `d3684c85997562d2fcdc775b0ea8d7ed0dcde58f`. Target identifiers only: Neon `ep-mute-water-azaf9oyl:ayawarta:neondb_owner`, Cloudinary `uhwi7xvb`.

## Preflight

- Vercel served Ready Production deployment `dpl_FTWuxMBiBt7AzWz272j47YkGidXK` for the reviewed SHA. The owner had already committed and deployed the 15 MiB proxy fix. Its build log reported ignored pnpm dependency build scripts and an old `baseline-browser-mapping` data notice, but compilation, TypeScript, tracing, and deployment completed. Read-only public routes and authenticated admin list returned the expected statuses.
- Vercel's direct/pooled Neon and Cloudinary variables existed only in Production, but their Secret values were intentionally non-readable. The local ignored `.env.production` passed the approved-target guard. Both its direct and pooled URLs were separately tested read-only with `sslmode=verify-full`: database and role matched, and the Node client TLS socket was encrypted and authorized. The local Cloudinary credentials returned HTTP 200 from the `uhwi7xvb` Admin API ping.
- Guarded read-only Neon checks returned release state `seeded` and four matching, zero missing version-1 publication baselines. The existing Windows-user-encrypted local backup from 2026-10-31 was present with its recorded SHA-256. The earlier Neon snapshot remains the 2026-10-31 manual snapshot; no restore or new database snapshot was performed for this configuration-only cutover.
- The isolated A5 migrated browser gate, including a valid 12 MB upload and reduced motion, passed in the [fixture review](admin-a5-activation-gate-2026-11-11.md). No Production customer media was used for that gate.

## Staged Production operations

1. Replaced only these four existing **Production Secret** values through the Vercel connection from the approved local source: `DATABASE_URL`, `DATABASE_URL_POOLED`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. The two Neon URLs were set to `sslmode=verify-full` after the read-only TLS test. The ignored local source was updated to the same mode. No value was printed in user-facing output or written to the repository or review record. The Vercel variable IDs and Production-only scope were checked after the update. Both A5 switches remained absent.
2. Redeployed the reviewed SHA with A5 still off as `dpl_A9bxSBJxC7jEKiXRrQFNRPfanjmR`. It became Ready and held the `ayawarta.my.id` alias. `/`, all four legacy invitations, `/rika-fauzi/invite`, and `/admin/login` returned 200; an unknown slug returned 404. An authenticated read-only Edge session saw dashboard and invitation list 200 with no page error. Vercel reported no error/warning runtime logs for the observed window. Read-only Neon release state remained `seeded` and baselines remained 4/4.
3. Created the Production-only server variables `AYAWARTA_A5_MEDIA=enabled` and `AYAWARTA_A5_APPROVED_CLOUD=uhwi7xvb`. Individual Vercel lookups confirmed both values and scope. The database and Cloudinary variables remained Production-only; no Preview variable with those keys was found.
4. Redeployed the same SHA as `dpl_4eDYHYnoTB9ZdPCLucV9yX1BMnvS`. Vercel reported Ready and the `ayawarta.my.id` alias pointed to this exact deployment at the final check (2026-11-11 14:53 UTC). The preceding feature-off deployment `dpl_A9bxSBJxC7jEKiXRrQFNRPfanjmR` remained Ready and rollback-eligible.

## Activation verification

| Check on active deployment | Observation |
| --- | --- |
| Public routes | `/`, `rika-fauzi`, `shidqi-mita`, `dudi-aini`, `default-preview`, invite link, and admin login: HTTP 200. Unknown slug: HTTP 404. |
| Authenticated admin | Login, dashboard, invitation list, and unsaved new-draft editor: HTTP 200; upload input visible; no browser page error. |
| Server flag | An authenticated POST to the media route with an intentionally invalid slot returned HTTP 400 `validation`. The route validates this slot immediately after the A5 gate, before draft lookup, media processing, reservation, or Cloudinary access. With A5 disabled it would have returned 503. |
| Data | Guarded read-only Neon verification: `seeded`, baselines 4 matching/0 missing. `InvitationDraft` and `DraftMediaProvision` counts both 0 after the negative probe. No new invitation, upload, or publication was created. |
| Runtime | No error or warning function logs for the activated deployment in the observed 30-minute window after smoke. The earlier `pg-connection-string` SSL-mode warning disappeared with `verify-full`. |

## Warning decision and remaining boundary

The pnpm install warning lists ignored lifecycle scripts for `@firebase/util`, `@prisma/engines`, `@tailwindcss/oxide`, `esbuild`, `prisma`, `protobufjs`, a transitive `sharp@0.34.5`, and `unrs-resolver`. This is pnpm 10's install-script policy, not a failed build. We did **not** approve every script: that would expand install-time code execution without evidence that each is needed. The separate `baseline-browser-mapping` notice concerns stale browser capability data; it did not fail the build. Audit and allowlist an individual package only if a reproducible build/runtime failure requires its script. The real Cloudinary upload path and Sharp native processing inside that Production function have not been exercised with customer media; the isolated fake-provider browser gate is the current success evidence.

There is no existing Production private draft to preview, so no disposable customer invitation was created for smoke. The first real draft, image upload, private preview, and publication require the normal reviewed admin content flow. Each upload creates an unlisted but publicly deliverable Cloudinary URL. The feature-off deployment above is the immediate application rollback candidate; rollback does not reverse Neon data or Cloudinary objects.

External effects of this cutover were limited to four Vercel Production Secret replacements, two Production-only A5 variables, two Production redeployments, and an ignored local `.env.production` TLS-mode update. Admin logins may update authentication/session records. No Neon migration, seed, customer-content write, Cloudinary upload, Firestore write, Git commit, or Git push was performed by this operator.

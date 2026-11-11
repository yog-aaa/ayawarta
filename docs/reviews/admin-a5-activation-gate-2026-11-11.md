# Admin A5 activation gate review — 2026-11-11

**Status:** isolated browser gate passed against a disposable local fixture with the proposed 15 MiB proxy fix. **Production activation remains blocked.** The fix is uncommitted and undeployed, and Vercel's sensitive Neon URL values cannot be compared with the approved target through the available MCP read path. Neither A5 Production switch was changed.

## Identity and isolation

- Tester: Codex, 2026-11-11 (Asia/Jakarta). Source checkout: `c3cea47acb312e883447500f3d52ec3161083aa4` plus the proposed `next.config.ts` edit. Microsoft Edge and Playwright exercised the fixture at `http://localhost:3108`.
- A disposable PostgreSQL 18.2 cluster used `ayawarta_browser` at `127.0.0.1:55438`. Its loopback/database identity was checked before each of six committed SQL migrations and synthetic fixture writes. SQL was applied with `psql`; this fixture does not establish a Prisma migration ledger.
- The fixture used a synthetic administrator, synthetic invitation and images, dummy provider credentials, and a fake Cloudinary client that stored WebP bytes only on local disk. It did not use the running local AyaWarta app, Neon, or the real Cloudinary upload API. Remote theme artwork was served from the tracked Classic Rose WebPs through a browser-only route intercept so network availability would not affect layout evidence.

## Browser and data results

| Check | Result |
| --- | --- |
| Draft isolation | Synthetic public slug returned 404 before publication; a new private draft was saved and edited. |
| File size rejection | A 15 MiB + 1 byte input returned 413 with the 15 MB guidance. |
| Valid larger input | A 12,021,354-byte PNG initially returned 400 because Next's proxy truncated it at the 10 MiB default. After setting `experimental.proxyClientMaxBodySize` to 15 MiB, the same browser upload returned 200 with one verified WebP asset. |
| Upload and recovery | Hero/bride uploads verified. A planned post-upload database failure left the groom provision pending; “Pulihkan foto” linked it without another provider upload. |
| Same-key retry | A second draft's planned failure was recovered through “Unggah berkas yang sama”; one verified provision and one fake provider object remained for that retry. |
| Preview and publication | The private preview rendered the full invitation after “Buka Undangan”, showed its private banner, and disabled guest confirmation/wishes. Slug confirmation published version 1; the public route then returned 200. |
| Database readback | The published invitation has one version-1 snapshot and three media pins. Its three provisions are `VERIFIED`; the second draft has two `VERIFIED` provisions. Five media assets correspond to five fake local WebP objects, with no `RESERVED` provision. |
| Layout and access | At 360, 390, 430, 768, 1280, and 1440 px, no horizontal overflow or completed broken image was found. Keyboard focus had a visible outline. In reduced-motion mode, the event wrapper stayed at opacity 1, transform `none`, and zero animations before and after scroll. No page errors were observed. |

Screenshots from the synthetic fixture: [private mobile preview](assets/admin-a5-2026-11-11/private-preview-390-complete.webp), [public mobile reduced motion](assets/admin-a5-2026-11-11/public-390-reduced.webp), and [public desktop reduced motion](assets/admin-a5-2026-11-11/public-1280-reduced.webp). The solid-color circles are intentionally synthetic photo placeholders.

The local TypeScript check, focused ESLint check, four media-image tests, and production-mode Next build passed. The build ran in the disposable fixture with dummy local environment variables. The pinned `pnpm` verification/install gate could not run here: the sandbox denied pnpm's store symlink, and the available global wrapper then attempted a noninteractive modules purge. Already-installed local tool binaries were used for these checks; dependency reproducibility for the next deployment remains to be verified through the normal release process.

## Production read-only checks and remaining gates

- Vercel MCP currently maps `ayawarta.my.id` to Ready Production deployment `dpl_PAGTxC4RYb45uFVWLvPST2m7rLdA` on `main` at `c3cea47acb312e883447500f3d52ec3161083aa4`. The earlier healthy admin-list deployment `dpl_3q9dsEL6tc1Xt2rTo3gLtaJ9rK1j` remains a Ready rollback candidate. The proposed proxy fix is **not** in either deployment.
- Read-only requests through the Vercel connection returned 200 for `/`, `/rika-fauzi`, and `/admin/login`, and 404 for an unknown slug. These do not exercise authenticated editing or uploads on the active deployment.
- Project Production metadata contains the three Cloudinary keys and both Neon URL keys. `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` decrypts to the expected `uhwi7xvb`; both A5 switches remain absent. A read-only Cloudinary Admin API ping using the approved local credentials returned HTTP 200 for `uhwi7xvb`. This proves those **local** credentials reach that account, not that the Vercel sensitive keys match them.
- Vercel MCP returns neither direct nor pooled Neon sensitive value, even by individual variable lookup. The approved local direct/pooled URLs passed the repository target guard and a read-only `seeded` release-state check, but they do not prove Vercel URL-value parity. The runbook requires an independent secret-capable comparison or an explicitly reviewed re-entry of approved values before activation.
- A read-only query on the approved local pooled Neon target found zero existing private drafts. No Production draft was created merely for a preview smoke test. Production private-preview rendering remains deferred until an approved real draft exists, as allowed by the runbook.
- Review and deploy the proposed 15 MiB config fix first, confirm the exact Ready Production SHA and route/admin smoke, inspect the recovery point, establish direct/pooled Vercel Neon parity and Vercel Cloudinary account identity, then activate the two Production-only A5 switches in a separately reviewed configuration deployment. The first real customer upload/publication remains a separate content operation.

No Production Neon write, Cloudinary upload, Vercel mutation, Git commit, or Git push occurred during this review. The only remote Cloudinary call was a read-only account ping.

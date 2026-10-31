# Admin A6 release-readiness review

**Status:** ready for source review; production activation blocked by the isolated browser upload/recovery gate and a separately approved cutover. Reviewed base: `91256208611caf71ea45731d529af2c6f2ecb0c0` through the uncommitted A6 worktree diff. No A6 commit or deployment exists yet.

## Scope and result

A6 synchronizes the architecture, design, database, authentication, media, deployment, and administrator-operation documentation with the A5 implementation. The release-state check now accounts for the draft-media migration and later legitimate admin data. The release wrapper checks the seeded state after migration before pushing the reviewed commit. Editor validation focus and responsive navigation were corrected during accessibility review. The [activation runbook](../runbooks/admin-a5-production-activation.md) separates additive schema/code release from enabling media upload and names the approved target, backup/restore rehearsal, rollback, and stop points.

The worktree began clean at the base commit. This review covers its A6 diff only; historical stage reports and production invitation content were not edited. No Git commit, push, Neon write, Cloudinary upload/delete, or Vercel configuration/deployment occurred.

## Isolated verification

| Gate | Outcome |
| --- | --- |
| Frozen pnpm 10.34.7 install with Node 22 | Passed offline. |
| Prisma format, validate, generate | Passed with process-local loopback database URLs. Generated-file whitespace was normalized; no generated source diff remains. |
| Six migrations | Applied to disposable PostgreSQL 18.2 at `127.0.0.1:5432/ayawarta`; no production target used. |
| Seed idempotency | Seed ran twice against that database; second run updated the synthetic admin and kept the four canonical invitations and 31 canonical media records. `seed:verify` passed. |
| Local release state | Read-only `seeded` state and `has_data` inventory passed after migration and seed. |
| Database integration | Four files, 25 tests passed; one opt-in A5 test remained skipped in this invocation. |
| Production build | Passed with Next.js 16 and the isolated loopback target. |
| Media verification | Offline report passed 31/31, including four hero and four audio records. Cloudinary manifest comparison passed read-only for 35 versioned WebP resources. |
| Release wrapper | Hermetic release-state tests and PowerShell dry-run/scenario tests passed; no `-Execute` operation ran. |
| Local route smoke | Isolated production build served `/`, `/rika-fauzi`, and `/admin/login` with 200; anonymous `/admin` redirected and an unknown slug returned 404. |
| Browser layout and accessibility | Synthetic local admin created a private draft. At 360, 390, 430, 768, 1280, and 1440 px, editor document width did not exceed viewport. At 390 px, incomplete publication review displayed linked field errors; selecting the wedding-date error focused its input. The mobile navigation dialog closed and focused the desktop nav when resized to 1280 px. |
| Full unit suite | `vitest run --maxWorkers=2` passed: 69 files and 869 tests; two opt-in database suites skipped. The first invocation inherited `.env.local` and the local-target guard rejected its remote host before any database operation; the successful rerun set process-only loopback URLs. |
| TypeScript and ESLint | `pnpm typecheck` and `pnpm lint` passed. |
| Diff, credential, stale-media, and link scan | `git diff --check` passed. Added A6 lines had zero credential-pattern matches; the only Squidward reference in the searched runtime tree is a negative test assertion. All local links in 13 changed/new Markdown files resolved. |

The browser used synthetic local content and dummy upload credentials. It did not test successful provider upload, retry, recovery, preview, or publication as a complete browser flow. That gate is **OPEN**; the runbook forbids either live release operation until an isolated mocked-provider browser exercise passes. The current code requires the canonical Cloudinary identity, so a separate nonproduction account cannot serve as that fixture without a reviewed code/configuration change. File rejection, reduced-motion, and full image composition need to be recorded in that exercise.

## Repository and external effects

The A6 source diff is limited to documentation, release guards/tests, and admin accessibility fixes. Compared with the base commit, the 25 changed/new files add approximately 46 KB of working-tree file content. The only data writes were six migrations, two seed runs, and a synthetic private draft in the disposable PostgreSQL cluster. That cluster was stopped, `127.0.0.1:5432` stopped responding, and its verified `.a6-local-pg` path was removed. Cloudinary access was read-only metadata verification. No real customer image or invitation was uploaded or published.

## Production decision still required

After the open isolated browser gate passes, review the exact clean commit SHA, Neon fingerprint `ep-mute-water-azaf9oyl:ayawarta:neondb_owner`, linked Vercel project, recovery snapshot, and maintenance window. Obtain distinct owner approval for the [runbook](../runbooks/admin-a5-production-activation.md) **Operation 1** guarded `Update -Execute`. Verify the exact deployment and legacy routes with media flags off. Obtain another approval for **Operation 2** Production media activation and its deployment. First customer content publication is separately reviewed. A Vercel rollback does not reverse the Neon migration; a database restore may discard later writes.

## Final command capture

Checks ran under pinned pnpm 10.34.7 and Node 22 with process-local loopback database URLs where needed. `pnpm prisma:migrate:deploy` applied six migrations locally; `pnpm prisma:seed` twice and `pnpm seed:verify` passed; `pnpm test:db` passed 25 tests with one opt-in test skipped. `pnpm prisma:format`, `pnpm prisma:validate`, `pnpm prisma:generate`, `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm media:verify-upload`, and `git diff --check` passed. The hermetic PowerShell release tests passed 13 scenarios and the release dry run was non-mutating. The isolated local route and browser checks are detailed above. This source evidence does not close the browser upload/recovery gate.

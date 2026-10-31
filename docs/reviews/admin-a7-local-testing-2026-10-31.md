# Admin A7 local testing review

**Status:** source and isolated server integration ready for review; the A5 isolated browser gate remains **OPEN**. Tested against the owner's running `http://localhost:3001` and a separately created disposable PostgreSQL 18.2 cluster. No application deployment or media activation occurred.

## Read-only localhost review

The running application uses the owner's production-backed Neon configuration, so this review made GET and visual checks only. `/`, `/rika-fauzi`, `/shidqi-mita`, `/dudi-aini`, `/default-preview`, and `/admin/login` returned 200. Anonymous `/admin` returned 307; an unknown invitation slug returned 404. In the in-app browser, the landing page, a public invitation cover and opened sections, and the mobile admin login were inspected. At 360, 390, 430, 768, 1280, and 1440 px, measured document width did not exceed the viewport; inspected images had no completed-load failures. No login, form submission, guest action, content edit, or upload was sent to this server.

## Disposable database and automated checks

The disposable cluster used `.a7-local-pg` under the repository. Before writes, its `data_directory`, loopback address, port, and database were checked. All six committed migrations were applied to `ayawarta_a7` on port 55435; an empty cloned schema `ayawarta_a5` was used on port 55434 for existing opt-in tests. The cluster was stopped, verified nonresponsive, and removed after testing.

| Check | Result |
| --- | --- |
| Focused A5 unit checks | 11 files, 57 tests passed. |
| New opt-in A7 route/action/DB integration | 1 test passed against `127.0.0.1:55435/ayawarta_a7` with a memory-only Cloudinary fake. |
| Existing A5 draft-media DB integration | 1 test passed against disposable `127.0.0.1:55434/ayawarta_a5`. |
| Existing A5 and A4 publication DB integration | 1 test passed in each file against the same disposable database. |
| Full `pnpm test` suite | 69 files, 869 tests passed; 3 opt-in tests skipped. Process-only invalid credentials on the guarded loopback `5432/ayawarta` URL prevented accidental production access. |
| TypeScript and targeted ESLint | Passed for the new test files. |

The first full-suite attempt used the disposable port 55434 as `DATABASE_URL` and failed before tests in two guard suites because the general Prisma local guard requires port 5432. The rerun with the guarded URL passed; this was a test-environment mismatch, not a product failure.

The new test invokes the actual POST route and admin actions in Vitest with a verified local DB target, synthetic administrator and images, and an in-memory provider. It covers same-key retry without duplicate upload, changed-content conflict, a remote-success/database-finalization failure, `RESERVED` provenance, recovery without re-upload, exactly one linked `MediaAsset` and `VERIFIED` provenance, no public invitation before publication, version-1 snapshot/media pins, retained draft, and stale-version rejection. Global fetch and real Cloudinary SDK calls are blocked by the test.

## Open release gate

This in-process integration does not exercise a running Next.js browser session for successful upload, recovery, private preview, and publication. The [A5 activation runbook](../runbooks/admin-a5-production-activation.md) still requires those flows, responsive compositions, keyboard focus, reduced motion, and file rejection in an isolated mocked-provider browser harness. Keep the gate **OPEN** and do not treat this review as approval for a code release, Vercel setting change, or customer content operation.

No Neon write, Cloudinary upload/admin API call, Vercel mutation, or Git commit/push occurred. Only synthetic rows in the removed disposable cluster were written.

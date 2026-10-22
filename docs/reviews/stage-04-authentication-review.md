# Stage 4 — Admin Authentication Foundation Review

## Status

`ACCEPTED — AWAITING IMPLEMENTATION COMMIT`

## Review Method

The implementation was reviewed against `docs/authentication.md`, the approved Stage 4 prompt, the Next.js 16 build output, and the TypeScript security checklist from the required `security-best-practices` skill. The installed skill contained no framework-specific reference directory, so the repository contract and direct code inspection remained authoritative.

## Positive Findings

- Auth.js Credentials and JWT sessions are isolated to server boundaries.
- Credential parsing normalizes email before lookup.
- Unknown, inactive, locked, and invalid-password paths expose no distinct public account-status message.
- Unknown-user verification uses a valid precomputed bcrypt dummy hash.
- Session data is limited to identity and role fields.
- The protected admin page revalidates current database state through `requireAdminSession`.
- Bootstrap execution was not run against the local database.
- No schema, migration, dependency, lockfile, invitation route, or external-service change was introduced.

## Blocking Findings

### AUTH-01 — Lockout updates are not concurrency-safe

`verifyAdminCredentials` reads `failedLoginCount`, calculates a number in application memory, and writes that absolute number with `user.update`. Concurrent invalid login attempts can read the same count and overwrite each other, losing failures and delaying or bypassing the five-attempt lock threshold. This directly violates the approved concurrency requirement.

Replace the read-modify-write transition with an atomic/transactional persistence operation. The implementation must correctly handle ordinary increments, expired-lock reset, threshold lock creation, and success reset under concurrent attempts. Test the persistence contract with controlled concurrent calls or a purpose-built atomic adapter mock; a sequential in-memory map is not sufficient evidence.

### AUTH-02 — A stale or revoked JWT can cause an `/admin` ↔ `/admin/login` redirect loop

The edge authorization callback redirects any session from `/admin/login` to `/admin`, while the login page also redirects any session without revalidating the database. The `/admin` page correctly rejects deleted, inactive, newly locked, or role-revoked users and redirects them to `/admin/login`. Their still-valid JWT then redirects them immediately back to `/admin`, producing a loop until the cookie is cleared or expires.

Keep `/admin/login` reachable through the edge guard and let its Server Component call the database-backed authorization helper. Redirect only when that helper confirms a current active allowed administrator. If the JWT is stale or revoked, render the login page so a new credential login or logout/recovery path remains available.

### AUTH-03 — The required route/session/logout test matrix is incomplete

The 29 new tests cover schemas, password utilities, service transitions, and bootstrap behavior, but there is no test for `authConfig.authorized`, JWT/session callbacks, login action generic mapping, logout, authenticated-login redirect, stale-session login behavior, or the complete protected-route decision matrix. The handoff therefore overstates coverage of the approved matrix.

Add hermetic tests around extracted pure decisions or exported callbacks/helpers. At minimum cover unauthenticated `/admin`, public `/admin/login`, valid-session coarse routing, current active-admin login redirect, stale/revoked-session login access, JWT/session field minimization, fixed internal redirect, generic AuthError handling, and logout destination. Avoid fragile tests of Next.js internals when a pure decision helper can express the contract.

### AUTH-04 — Stage 4 uses the deprecated Next.js 16 middleware filename

The production build succeeds but emits the explicit warning that the `middleware` convention is deprecated and `proxy` must be used. The approved task required the route-protection entry point appropriate for Next.js 16. Replace `src/middleware.ts` with the supported `src/proxy.ts` convention and rerun route tests and the production build. Do not change Next.js or Auth.js versions.

### AUTH-05 — Bootstrap failure output can disclose internal error detail

The bootstrap CLI prints arbitrary `err.message`. Prisma, environment, or adapter errors may contain host, schema, query, or other internal detail, contradicting the bootstrap contract that output is restricted to safe outcome information. Emit a fixed generic failure message to the console; preserve detailed errors only through a deliberate local debugging mechanism that cannot expose secrets by default.

### AUTH-06 — Credential length and bcrypt truncation are not bounded

The login schema accepts arbitrarily long passwords, and the bootstrap helper validates only non-empty strings. This permits unnecessary bcrypt work/memory pressure and allows passwords beyond bcrypt's 72-byte input boundary to be silently equivalent after truncation. Add consistent bounded validation for login and bootstrap, reject values that bcrypt reports as truncated (including multibyte cases), and test the boundary. Keep public login errors generic.

## Verification Performed

- 57/57 unit tests passed;
- TypeScript validation passed;
- ESLint passed with zero errors and the same two approved pre-existing warnings;
- production build passed and emitted the expected Next.js 16 middleware deprecation warning;
- source scans found no committed secret values and no auth server import in a Client Component other than the intended server-action reference.

Passing commands do not override the blocking behavioral and coverage findings above.

## Decision

Stage 4 is not accepted and must not be committed. Apply only the bounded corrections above, keep the database unmodified, rerun the complete verification suite, and return for review. Stage 5 remains blocked.

## Correction Re-Review

The submitted correction resolves AUTH-01 through AUTH-06 in substance:

- failure increments use Prisma atomic field operations and conditional locking;
- parallel and expired-lock transitions have dedicated concurrency tests;
- the login route remains reachable for stale sessions and revalidates against PostgreSQL before redirecting;
- route, JWT/session, login-handler, logout, and fixed-redirect decisions are tested;
- `src/proxy.ts` replaces the deprecated middleware convention;
- bootstrap failures expose only a fixed generic message;
- login and bootstrap reject passwords beyond bcrypt's 72-byte UTF-8 boundary.

Independent re-review confirmed 95/95 hermetic tests and clean TypeScript validation. Targeted Stage 4 lint completed without reported diagnostics; a subsequent full lint invocation stalled in the reviewer shell without emitting an error and was stopped after multiple wait intervals. The programmer's clean full-lint evidence remains credible and must be rerun after the final correction.

### AUTH-07 — Immediate process exit bypasses Prisma disconnect

`scripts/bootstrap-admin.ts` calls `process.exit(exitCode)` inside the `try` block. Node's immediate exit does not unwind the stack, so the `finally` block is not guaranteed to run and the Prisma client is not cleanly disconnected on the failure path. This contradicts the bootstrap disconnect contract and the handoff claim.

Set `process.exitCode` instead of calling `process.exit`, allow control to leave the `try`, and await `$disconnect()` in `finally`. The top-level catch must follow the same non-immediate-exit pattern. Add a small hermetic orchestration test or extract a testable `main` function proving disconnect occurs for both success and failure without importing the real database client in the unit test.

AUTH-07 is the only remaining blocking finding. Stage 4 remains `CHANGES REQUIRED` until this bounded correction is reviewed. Stage 5 remains blocked.

## AUTH-07 Final Review

AUTH-07 is resolved:

- the bootstrap script contains no direct `process.exit()` call;
- non-zero results set `process.exitCode` without terminating stack unwinding;
- orchestration always awaits the injected disconnect function in `finally`;
- unexpected runner failures emit only the approved generic message;
- four hermetic orchestration tests cover success, returned failure, thrown failure, and absence of direct exit calls.

Final independent verification confirmed:

- 99/99 hermetic tests;
- clean TypeScript validation;
- 5/5 read-only PostgreSQL integration tests;
- successful Next.js 16 production build with the supported proxy convention and no deprecated-middleware warning;
- four Prisma migrations with the local `ayawarta` schema up to date;
- no direct `process.exit()` call in application or bootstrap source.

## Final Decision

Stage 4 is accepted for implementation commit. The programmer may commit exactly the reviewed authentication files and must not run the bootstrap, create an administrator, modify PostgreSQL data, or begin Stage 5. After commit, report the full hash, exact committed paths, clean-worktree status, and final pnpm verification summary for closure review.

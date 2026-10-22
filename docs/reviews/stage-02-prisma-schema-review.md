# Stage Review: Stage 2 — Prisma Schema and Local Migration

## Review Status

`ACCEPTED`

## Scope Reviewed

- Assigned stage: Prisma application schema, local PostgreSQL migration, server-only client singleton, and local connection verification.
- Repository baseline: branch `develop`, committed HEAD `2698ad5`.
- Review target: uncommitted Stage 2 worktree diff and programmer-reported local database effects.
- Authorized database target: PostgreSQL `localhost:5432`, database `ayawarta`.

## Evidence Supplied by Programmer

| Check | Result | Review |
| --- | --- | --- |
| Database preflight | PASS | Programmer reported local PostgreSQL, database `ayawarta`, with zero existing application tables and no migration history. |
| Migration SQL inspection | PASS | SQL creates only the approved enums, tables, indexes, unique constraints, and foreign keys. No drop/reset statement is present. |
| Local migration | PASS | Programmer reports migration `20261022004203_init_invitation_admin_schema` applied only to local `ayawarta`. |
| Prisma format/validate/generate | Reported PASS | Generated output is consistent with the authored schema. |
| TypeScript | PASS | Independently confirmed `npm run typecheck` exits successfully. |
| Tests | Environment-dependent | Programmer reports 8/8 passing with local DB access. Reviewer environment cannot reach the local PostgreSQL process, and default `npm test` consequently fails two DB tests. |
| Build and lint | Reported PASS | No conflicting source-level evidence was found. |
| External effects | Local database only | One migration was applied; no seed, admin, Cloudinary, Firestore, Aiven, Vercel, or production action occurred. |

## Independent Reviewer Checks

- [x] Nine required models and three required enums are present.
- [x] Owner deletion uses `SetNull` and does not delete production invitations.
- [x] Referenced partner, gallery, and music media use `Restrict`.
- [x] Invitation-owned child content uses `Cascade`.
- [x] Required unique constraints for slug, email, public ID, sections, partner role, events, gallery, and love story are present.
- [x] Migration SQL contains no destructive statement.
- [x] Prisma runtime module is marked server-only and uses the PostgreSQL adapter.
- [x] Development singleton caching is implemented through `globalThis`.
- [x] Firestore wishes/RSVP remain outside PostgreSQL.
- [x] No seed or application data was added.
- [ ] Every ordered child collection prevents duplicate positions.
- [ ] Default automated tests are independent of a running developer database and future seed state.

## Findings

### Blocking

1. `GiftAccount` uses a non-unique `@@index([invitationId, position])`, while every other ordered child collection prevents duplicate positions. The implementation plan requires unique keys/indexes for ordered child records, and deterministic seed/repository behavior depends on one position per invitation. Change this to `@@unique([invitationId, position])`. Because the initial migration has already been applied locally, do not rewrite or reset the database silently; add and apply a small forward-only corrective migration that creates the unique constraint.
2. `src/lib/server/db.test.ts` asserts that all nine application tables contain exactly zero rows. This test is guaranteed to fail after the authorized Stage 6 seed and therefore encodes a temporary setup condition as a permanent invariant. Remove all zero-row assertions. A durable schema smoke test may verify model delegates, connectivity, table presence, and non-negative/queryable counts without requiring emptiness.
3. The default `npm run test` now requires the developer's live PostgreSQL service and complete runtime environment. In the reviewer environment, the unit test suite fails solely because localhost PostgreSQL is unavailable. Separate the live-database smoke test into an explicit integration command such as `test:db`, while keeping default `npm test` deterministic and runnable without a database. The integration test must still be executed and reported during database-related stages.

### Non-Blocking

- The live integration suite should own and disconnect only the client it creates, or run in an isolated test process, so disconnecting the cached application singleton cannot affect unrelated tests.
- Correct the roadmap language in the next handoff: Stage 3 adds domain/repository/mapper, Stage 4 adds admin authentication, Stage 5 migrates and verifies Cloudinary media, and Stage 6 performs the idempotent invitation seed.
- The review environment's failed connection and migration-status commands are caused by its inability to access the user's local Laragon service; this does not contradict the programmer's successful local evidence.

## Decision

Stage 2 is not accepted yet. The migration is safe and the main relational design is sound, but the final schema must enforce deterministic gift ordering and the committed test contract must survive later seeds and environments without Laragon.

## Next Authorized Stage

None. Stage 3 remains unauthorized until the corrected Stage 2 diff and additive local migration are reviewed and accepted.

## Corrected Submission Review

The corrected Stage 2 worktree was reviewed on top of `ec74851`.

All blocking findings were resolved:

- `GiftAccount` now enforces `@@unique([invitationId, position])`.
- The already-applied initial migration remains intact.
- A forward-only migration, `20261022013000_enforce_gift_account_position_unique`, replaces the earlier non-unique gift-order index with a unique index.
- The live database suite no longer assumes that application tables are empty.
- Default `npm test` excludes database integration tests and runs without PostgreSQL access.
- Live database verification is isolated behind `npm run test:db` using a dedicated Prisma client and clean disconnect.

Independent verification confirmed:

| Check | Result | Evidence |
| --- | --- | --- |
| Default tests | PASS | Reviewer ran 1 test file and 5 tests successfully without database access. |
| TypeScript | PASS | Reviewer independently confirmed `npm run typecheck` exits successfully. |
| Gift ordering | PASS | Authored schema contains a compound unique constraint for invitation and position. |
| Corrective migration | PASS | SQL drops only the superseded gift-order index and creates its unique replacement. |
| Initial migration preservation | PASS | Initial SQL still contains the original non-unique index followed by the separate forward migration; it was not rewritten in place. |
| Live DB integration | Programmer PASS; reviewer environment-limited | Programmer reports 3/3 tests against local `ayawarta`. Reviewer sandbox cannot reach the user's Laragon service. |
| Migration status | Programmer PASS; reviewer environment-limited | Programmer reports both migrations applied and schema up to date. |
| External effects | PASS | Only the approved local corrective migration was applied; no seed or external service was touched. |

The index replacement is safe for this stage because the database is still unseeded. Both migrations must remain committed in order and must be applied before production invitation data is inserted.

## Final Decision

Stage 2 is accepted. The relational contract, foreign-key behavior, deterministic child ordering, migration history, server-only Prisma runtime, and unit/integration test split are suitable foundations for the domain repository layer.

## Final Next Authorized Stage

Finalize and commit Stage 2 only. After the commit is verified, Stage 3 — Invitation Domain, Repository, and Mapper — is authorized.

## Commit Finalization Verification

Stage 2 was finalized as commit `529349a5437da2e5ad53eacf8c2d4801e4e6a9d4` (`feat: add invitation database schema`).

Post-commit verification confirmed:

- the commit is directly based on the Stage 2 acceptance review commit;
- all 26 changed files belong to the approved Stage 2 scope;
- both ordered migrations and `migration_lock.toml` are committed;
- the corrective migration contains only the approved gift-order index replacement;
- `.env.local`, `pnpm-lock.yaml`, seed data, routes, authentication, and UI are absent from the commit;
- branch `develop` has a clean worktree;
- the programmer reports both local migrations applied and the local schema up to date.

Stage 2 is closed. Stage 3 is authorized from the current reviewed HEAD.


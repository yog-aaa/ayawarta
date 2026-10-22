# Stage 3 — Invitation Domain, Repository, and Mapper Review

## Status

`ACCEPTED — AWAITING IMPLEMENTATION COMMIT`

## Reviewed Scope

- explicit client-safe invitation domain types;
- reusable typed Prisma invitation query and payload;
- pure persistence-to-domain mapper;
- server-only exact-slug repository;
- hermetic mapper and repository tests;
- type-only migration of current template and hard-coded data consumers.

## Findings

No blocking implementation finding was found.

The implementation satisfies the approved Stage 3 contract:

- domain types do not depend on Prisma, `server-only`, or database modules;
- existing invitation content and public-route behavior remain unchanged;
- the repository performs one exact-slug `findUnique` query and returns `null` without a preview fallback;
- owner relations and authentication fields are not loaded;
- hero, optional music, partners, ordered events, ordered gallery media, ordered love stories, ordered gifts, and section flags are loaded through one typed include tree;
- the mapper resolves partners by role, maps the explicit hero relation, preserves the external gallery-video scalar, keeps account numbers as strings, and respects optional-section semantics;
- required-data failures use explicit `InvitationMappingError` messages without credential or connection detail;
- no Prisma or repository module crosses into Client Components;
- Prisma schema, migrations, environment files, dependencies, and lockfile are unchanged.

## Verification

Independent reviewer verification passed:

- `git diff --check`;
- 28/28 hermetic unit tests across three test files;
- 5/5 read-only PostgreSQL integration tests;
- TypeScript validation;
- ESLint with zero errors and the same two approved pre-existing warnings;
- production build and page generation;
- four Prisma migrations found with the local `ayawarta` schema up to date;
- restricted-file and client/server-boundary scans.

The first reviewer build attempt encountered a transient `next/font` Google Font resolution failure for Noto Sans Thai. An immediate isolated retry succeeded without any file change, confirming it was environmental rather than a Stage 3 regression.

## Non-Blocking Note

`findBySlug` currently calls `findPayloadBySlug` through `this`. The approved singleton usage preserves the method receiver and is correct. A future repository refactor should prefer a closure-local helper so the method also remains safe if it is ever destructured or passed as a callback. This does not block Stage 3 and does not justify broadening the current diff.

## Decision

Stage 3 is accepted for implementation commit. The programmer may commit exactly the reviewed Stage 3 files and must not begin Stage 4. After the commit, report its full hash, exact committed paths, clean-worktree status, and final pnpm verification summary for closure review.

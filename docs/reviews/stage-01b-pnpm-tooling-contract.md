# Stage 1B — pnpm Tooling Contract Correction

## Status

`ACCEPTED — CLOSED`

## Owner Decision

AyaWarta uses pnpm on Vercel and must continue using pnpm as its only package manager.

## Audit Finding

- `package.json` currently has no `packageManager` field.
- `pnpm-lock.yaml` predates the Prisma, Auth.js, Cloudinary, bcryptjs, server-only, Zod, Vitest, and tsx dependencies added during Stage 1.
- `package-lock.json` is the currently synchronized lockfile, which contradicts the owner's deployment contract.
- Keeping both lockfiles makes local and Vercel dependency resolution ambiguous.
- The ambient local pnpm command reports version 11.25.0, but the project must use a repository-pinned version.

## Approved Correction

- Pin `pnpm@10.34.7` in `package.json#packageManager`.
- Preserve every existing dependency range and script.
- Regenerate `pnpm-lock.yaml` using the pinned pnpm version.
- Remove tracked `package-lock.json`.
- Keep `pnpm-lock.yaml` as the sole lockfile.
- Prove reproducibility with `pnpm install --frozen-lockfile`.
- Run every project verification command through pnpm.

The version choice follows Vercel's documented pnpm support through major version 10 and the current maintained pnpm 10 release. References: [Vercel package managers](https://vercel.com/docs/package-managers) and [pnpm releases](https://github.com/pnpm/pnpm/releases).

## Safety Constraints

- Do not change dependency names, versions, ranges, or scripts.
- Do not modify application code, Prisma schema/migrations, generated Prisma content, environment files, or product data.
- Do not run seed or migration commands.
- Do not access Cloudinary, Firestore, Aiven, or Vercel configuration.
- Local `node_modules` layout may change as an ignored installation effect.

## Gate

Stage 3 is not authorized until Stage 1B is implemented, reviewed, and committed.

## Implementation Review

Reviewed scope:

- `package.json`;
- regenerated `pnpm-lock.yaml`;
- removal of `package-lock.json`.

No blocking implementation finding was found. The implementation satisfies the approved correction:

- `packageManager` is exactly `pnpm@10.34.7`;
- dependency names, ranges, scripts, and other package metadata are unchanged;
- the pnpm root importer contains all 29 declared dependencies and dev dependencies;
- `pnpm-lock.yaml` uses lockfile format 9.0;
- `package-lock.json` is removed;
- a frozen pnpm install succeeds without modifying the lockfile;
- Prisma-generated files, schema, migrations, application source, and environment files remain unchanged.

Reviewer verification passed:

- project pnpm version resolves to 10.34.7;
- `pnpm install --frozen-lockfile`;
- root dependency listing with 29 packages and no missing dependency;
- Prisma schema validation and client generation;
- 5/5 hermetic unit tests;
- 5/5 live read-only local-database integration tests;
- TypeScript validation;
- ESLint with zero errors and the same two pre-existing warnings;
- production build;
- four migrations found with the local schema up to date.

pnpm reports ignored dependency build scripts. This is accepted as a non-blocking observation for the current dependency graph because a frozen install followed by Prisma generation, native-backed Next/Tailwind compilation, all tests, and the production build succeeds. Do not add an allowlist unless a future reviewed failure demonstrates it is required.

## Post-Commit Finalization

Implementation commit:

- short hash: `75dc0cc`;
- full hash: `75dc0ccc379f228231f962445445e6c393b0801c`;
- message: `chore: adopt pnpm package manager`.

The committed scope is exactly the three reviewed package-manager paths:

- `package-lock.json` removed;
- `package.json` updated only with `packageManager: pnpm@10.34.7`;
- `pnpm-lock.yaml` regenerated as the sole dependency lockfile.

Independent post-commit verification confirmed:

- `75dc0cc` is the current `develop` HEAD and the worktree is clean;
- pnpm resolves to version 10.34.7;
- `pnpm install --frozen-lockfile` succeeds with no lockfile change;
- 5/5 hermetic unit tests pass;
- TypeScript validation passes;
- 5/5 read-only local-database integration tests pass;
- all four Prisma migrations are present and the local `ayawarta` schema is up to date;
- no additional dependency lockfile is tracked or present.

The ignored dependency build-script notice remains a documented, non-blocking observation. No allowlist or interactive approval is required while the verified toolchain continues to pass.

Stage 1B is closed. Stage 3 — Invitation Domain and Server Repository is authorized, using pnpm exclusively.

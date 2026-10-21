# Stage Review: Stage 1 — Tooling and Environment Contract

## Review Status

`CHANGES REQUIRED`

## Scope Reviewed

- Assigned stage: dependency, script, Prisma scaffold, test-runner, and environment-contract foundation.
- Repository baseline: branch `develop`, committed HEAD `cedae2c`.
- Review target: uncommitted Stage 1 worktree diff.
- Tracked changes: `package.json`, `package-lock.json`.
- Untracked additions: `prisma.config.ts`, `prisma/schema.prisma`, `src/generated/prisma/**`, `src/lib/server/env.ts`, `src/lib/server/env.test.ts`, and `vitest.config.mts`.
- Ignored local change: `.env.local` key rename, verified by key names only.

## Evidence Supplied by Programmer

| Check | Result | Review |
| --- | --- | --- |
| Dependency installation | Reported PASS | Lockfile is npm lockfile v3 and `pnpm-lock.yaml` is untouched. |
| Prisma format, validation, and generation | Reported PASS | Reviewer independently confirmed schema validation and inspected generated Prisma 7 output. |
| TypeScript | PASS | Independently confirmed `npm run typecheck` exits successfully. |
| Tests | PASS | Independently confirmed 1 test file and 5 tests pass. |
| ESLint | PASS | Independently confirmed `npm run lint` exits successfully, but the configuration remains on the Next.js 15 package and legacy compatibility bridge. |
| Production build | Environment-limited reproduction | Programmer reports PASS. Reviewer build reached compilation and then failed only because the restricted review environment could not fetch five Google Fonts; no Stage 1 compilation error was observed. |
| External/data effects | None | No database migration, seed, Cloudinary operation, or production change was performed. |

## Independent Reviewer Checks

- [x] Diff remains within Stage 1 scope.
- [x] No application models, migration, authentication route, UI refactor, database mutation, or Cloudinary operation was added.
- [x] `pnpm-lock.yaml` is untouched.
- [x] `.env.local` contains 15 expected key names, no longer contains `NEXT_PUBLIC_CLOUDINARY_API_KEY`, and now contains `CLOUDINARY_API_KEY`.
- [x] No credential value was printed or added to tracked files.
- [x] Prisma 7 generator output uses the required explicit custom output directory.
- [x] Prisma CLI configuration reads `DATABASE_URL` from `prisma.config.ts`.
- [x] Environment validation failures expose key names rather than values.
- [x] Client-component source scan covers the listed server-only key names.
- [x] Dependency tree resolves the requested direct packages on Node 24.15.0.
- [ ] Next.js 16 lint configuration and package versions are aligned.
- [ ] Prisma 7 ESM requirement is represented in the package contract.
- [ ] Exceptional dependency choices are documented.

## Findings

### Blocking

1. `eslint-config-next` remains pinned to `15.3.3` while the application runs Next.js `16.0.10`. The Stage 1 change only replaces the command; `eslint.config.mjs` still adapts the older configuration through `FlatCompat`. Next.js 16 officially moved its plugin/configuration to flat config and recommends the direct `eslint-config-next` flat configuration. Align `eslint-config-next` with the installed Next.js 16 release and migrate the existing config without changing the deliberate local rule override.
2. The Prisma 7 foundation does not declare `"type": "module"` in `package.json`. Current Prisma 7 setup guidance requires ESM and the generated `prisma-client` source uses ESM constructs such as `import.meta.url`. Add the package-level ESM declaration, then rerun all Stage 1 checks to catch any compatibility impact on Next.js, ESLint, Vitest, Prisma CLI, and generated client code.
3. The stage required major version choices to be explained, but the handoff does not explain why the prerelease `next-auth@5.0.0-beta.32` was selected under a stable-release requirement. Record the compatibility rationale and risk explicitly, including why the current stable Auth.js line is not selected for Next.js 16. Pin an intentional prerelease exactly unless official compatibility guidance gives a concrete reason to allow a range.

### Non-Blocking

- `bcryptjs@3.0.3` already ships TypeScript declarations, so `@types/bcryptjs` is redundant and should be removed to keep the dependency surface clear.
- The legacy `package.json#prisma.seed` entry duplicates the Prisma 7 seed configuration already present in `prisma.config.ts`; retain only the Prisma 7 source of truth unless a verified tool still requires the legacy field.
- `.env.example` may document optional `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` and `NEXT_DISABLE_LIGHTNINGCSS`, but their omission does not block this stage because runtime validation marks them optional.
- `npm ls --depth=0 --json` found five extraneous packages in the current local `node_modules`. They are not lockfile entries or repository changes; a clean install should be used for final reproducibility evidence rather than committing anything related to them.
- The build emits a stale `baseline-browser-mapping` data warning. It is not a Stage 1 regression and does not justify an unrelated dependency update here.

## Decision

Stage 1 is not accepted yet. The core scaffold is sound and the required checks mostly pass, but the Next.js lint toolchain and Prisma module contract must match the selected framework/ORM majors. The Auth.js prerelease exception must also be made deliberate and reviewable before this foundation is committed.

## Next Authorized Stage

None. Stage 2 remains unauthorized until the corrected Stage 1 diff is reviewed and accepted.


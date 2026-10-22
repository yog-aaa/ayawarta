# Stage 1B — pnpm Tooling Contract Correction

## Status

`APPROVED — AWAITING IMPLEMENTATION`

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

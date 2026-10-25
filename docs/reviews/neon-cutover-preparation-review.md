# Neon Cutover Preparation — Final Review

Status: **ACCEPTED — PREPARATION ONLY** (2026-10-25).

## Scope

The application now has separate direct and pooled Neon connection handling and guarded `prod:migrate`, `prod:seed`, and `prod:verify` commands. Local runtime and default Prisma CLI paths validate the local PostgreSQL target. The production commands require `--execute` and an approved endpoint, database, and role fingerprint before connecting. No production cutover was performed in this stage.

## Accepted corrections

- The production verifier distinguishes an uninitialized schema, an empty schema, existing application data, and unexpected tables before migration (NEO-01).
- Production seed receives validated administrator credentials explicitly and fails before its transaction when required credentials are absent (NEO-02).
- Seed count constants and verification are separated from local-only script imports (NEO-03).
- Vercel Production runtime requires the pooled URL; local runtime selects and validates its direct local URL (NEO-04, NEO-12).
- Direct and pooled Neon URLs must agree on project, region, database, and role, use TLS, and match the approved endpoint/database/role fingerprint (NEO-05, NEO-08, NEO-14).
- Production CLI errors and migration child output are sanitized; default Prisma CLI use is local-only and its production wrapper validates the full effective target (NEO-06, NEO-07, NEO-09, NEO-10, NEO-13).
- Post-seed verification checks all 31 canonical media records field by field and expects the nine table counts to sum to 86 rows (NEO-11).
- Local runtime and Prisma CLI reject URL query parameters that can redirect the connection target (NEO-15).
- Prisma configuration detects conflicting shell and `.env.production` settings and passes the exact validated direct URL as `datasource.url` (NEO-16).

## Verification and limits

The implementation handoff reported checks with pinned pnpm 10.34.7 and no-`--execute` safety stops. Reviewer inspection confirmed the NEO-15/16 data flow. Finalization independently ran the installed project tools: 32 test files and 650 tests passed, TypeScript passed, ESLint passed, Prisma schema validation passed, and the Next.js production build passed. An initial build attempt could not fetch Google Fonts in the restricted environment; one retry with network access completed successfully. Corepack could not fetch pinned pnpm 10.34.7 in the reviewer environment, so these independent runs used the installed project binaries rather than a new frozen install. The code and documentation diff passed whitespace review. No production command was run with `--execute`.

The Stage 11 documentation was finalized with this preparation. Its earlier “82 rows” summary was an arithmetic error; the expected counts are 1 + 31 + 4 + 4 + 8 + 6 + 21 + 6 + 5 = **86**.

## Production gate

Neon connectivity, database emptiness, migrations, seed, Vercel settings, and deployment remain **unverified and unexecuted**. The owner must approve the exact Neon endpoint/database/role target and separately authorize the live cutover. Until then, the target approval gate remains `UNPROVEN`.

## Post-final-review correction (NEO-17)

A later review demonstrated two query parsing mismatches using synthetic connection URLs. A query-level `user` and `password` could replace the role checked in the URL authority, and a second `sslmode=disable` could override an earlier `sslmode=require` in the PostgreSQL driver. The guard now permits only one `sslmode`, optional `channel_binding=require`, and optional `schema=public` per URL. It rejects other query keys, duplicates, and explicit ports other than `5432` before production commands or the Vercel Production runtime can connect.

The corrected guard and runtime selection passed 113 focused tests and the full 654-test suite; TypeScript, ESLint, Prisma schema validation, and the Next.js production build also passed. The two production URLs currently stored in the ignored operator environment use allowed, unique query keys. No production operation, migration, seed, or database connection was performed during this correction. The correction was accepted for repository finalization; live cutover remains separately gated.

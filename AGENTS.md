# AyaWarta Agent Instructions

## Role and Workflow

This repository is executed in reviewed stages. A programmer agent implements exactly one approved stage at a time. The human owner and the planning/review agent approve the result before the next stage begins.

For current Codex work, the root agent orchestrates the approved stage and may use only the reusable roles `repo_architect`, `frontend_engineer`, `backend_engineer`, `data_engineer`, `qa_reviewer`, `release_engineer`, and `documenter`. Use the fewest roles needed; reuse one instance per role, give each edited file one owner, and route findings back to that owner. Only root delegates. No role named for a page, feature, endpoint, or individual bug is permitted. The detailed selection, contract, ownership, and review rules are in `docs/agent-workflow.md`. The stage prompts in `docs/agent/prompts.md` record the earlier Antigravity execution and are not a standing instruction to run another stage or commit.

Do not treat the complete implementation plan as permission to execute every phase in one run.

For every assigned stage:

1. Read this file and all documents listed under "Required Reading".
2. Inspect the current worktree and preserve unrelated changes.
3. Restate the stage scope and expected verification before editing.
4. Implement only the assigned stage.
5. Run the stage-specific checks.
6. Review the diff for secrets, unrelated edits, and scope drift.
7. Report changed files, commands and results, remaining risks, and the commit hash if asked to commit.
8. Stop and wait for review.

## Required Reading

Read these documents before making changes:

1. `docs/agent/index.md`
2. `docs/architecture.md`
3. `docs/design.md`
4. `docs/database-schema.md`
5. `docs/media-migration.md`
6. `docs/authentication.md`
7. `docs/deployment.md`
8. `docs/qa-checklist.md`
9. `docs/agent-workflow.md`
10. `docs/agent/prompts.md`
11. `docs/agent/skills.md`
12. `docs/superpowers/specs/2026-10-21-ayawarta-refactor-cloudinary-prisma-design.md`
13. `docs/superpowers/plans/2026-10-21-ayawarta-refactor-cloudinary-prisma-plan.md`

If documents conflict, the approved specification controls product behavior, the implementation plan controls ordering, and this file controls agent execution discipline. Ask before resolving any remaining ambiguity.

## Non-Negotiable Product Decisions

- Preserve the current AyaWarta UI and brand. This is a refactor, not a redesign.
- PostgreSQL and Prisma store invitation data and admin users.
- Firestore remains the real-time store for wishes and RSVP.
- Cloudinary stores dynamic invitation media only.
- Static UI assets remain in `public`.
- `rika-fauzi`, `shidqi-mita`, `dudi-aini`, and `default-preview` are production data.
- All current invitation media belongs under `ayawarta/production/invitations/{slug}/...` in the new Cloudinary account.
- The application is deployed on Vercel. Production PostgreSQL uses Neon (direct connection for migrations and seed, pooled connection for application runtime).
- Authentication is admin-only email/password. There is no public registration.
- Unknown invitation slugs return 404 and must not fall back to preview data.

## Security and Data Safety

- Never print, log, commit, or expose credential values.
- `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `DATABASE_URL`, `DATABASE_URL_POOLED`, `AUTH_SECRET`, and `ADMIN_PASSWORD` are server-only.
- Only `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` may be public.
- Do not import Prisma, Cloudinary admin APIs, password utilities, or server environment modules into Client Components.
- Never delete assets from the old Cloudinary account.
- Never delete local dynamic media until the explicit cleanup stage and all gates in `docs/media-migration.md` pass.
- Never run production migrations, production seeds, or modify Vercel/Neon configuration without a separately assigned production-cutover stage.
- Migration and seed scripts must be idempotent.
- Use transactions for relational seed operations that must succeed together.

## Repository Practices

- Use pnpm exclusively. The repository pins the approved pnpm version in `package.json#packageManager` and `pnpm-lock.yaml` is the sole dependency lockfile.
- Run package scripts with `pnpm`/`pnpm.cmd`; do not create or restore `package-lock.json`.
- Dependency verification must include `pnpm install --frozen-lockfile` before deployment-oriented build evidence.
- Use `apply_patch` or normal editor changes; avoid broad generated rewrites.
- Do not reformat unrelated files.
- Use PascalCase for React component filenames.
- Keep Server Components as the default. Add `"use client"` only at the smallest interactive boundary.
- Prefer typed domain and repository boundaries over importing persistence types into UI components.
- Keep files focused. Extract a module when it has more than one clear responsibility.
- Preserve existing public route behavior unless the approved design explicitly changes it.
- Do not use destructive Git commands.
- Treat pre-existing worktree changes as owner work. Do not stage, commit, or push a documentation-maintenance assignment unless the owner separately assigns that Git operation.

## Installed Skills

The `AGENT-SKILLS` collection is available as a skill source. Follow `docs/agent/skills.md` for relevant routing. Skill instructions guide execution but do not authorize broader scope, destructive actions, production operations, or unapproved design changes.

## Verification Minimum

Every stage must run the checks assigned in `docs/agent-workflow.md`. Before final handoff, the complete project must pass:

- Prisma format, validation, and generation;
- TypeScript checking;
- automated tests;
- ESLint;
- Next.js production build;
- media-manifest and Cloudinary URL verification;
- seed idempotency verification;
- public-route and admin-auth smoke tests;
- a credential and stale-media-reference scan.

## Required Handoff Format

Use this exact structure at the end of a stage:

```text
Stage:
Status: ready for review | blocked

Changed:
- file: summary

Verification:
- command: PASS/FAIL — relevant result

Data or external effects:
- none, or exact uploads/migrations performed

Risks / follow-ups:
- item

Skills used:
- skill-name: purpose and impact, or "none"

Commit:
- hash, or "not committed"
```

Do not begin the next stage in the same response.

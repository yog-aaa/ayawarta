# Programmer Agent Workflow

## Purpose

Use this document to assign work to Antigravity one stage at a time. Each stage ends with evidence and a mandatory stop for review.

## Universal Prompt Prefix

Include this at the start of every stage prompt:

```text
You are implementing one reviewed stage in the AyaWarta repository. Read AGENTS.md and every document it marks as required, including docs/agent/skills.md. Preserve unrelated work and do not broaden scope. Use only the skills routed to this stage. Implement only the stage below, run its required verification, review the diff, use the required handoff format, and stop. Do not begin the next stage.
```

## Stage 0 — Baseline Audit

### Assignment

Perform Phase 0 from the approved implementation plan. Make no product-code changes. Record baseline build, lint, type-check availability, routes, media counts, source references, environment key names, and current Git status.

### Exit evidence

- baseline command results;
- current known failures separated from new work;
- media count and total bytes;
- route and data-source inventory;
- no code changes.

## Stage 1 — Tooling and Environment Contract

### Assignment

Implement Phase 1 only. Add compatible dependencies, scripts, environment validation, `.env.example`, and Prisma configuration scaffolding. Do not create application models or migrate the database yet.

### Exit evidence

- dependency compatibility rationale;
- changed scripts;
- environment validation results without values;
- install and lockfile result;
- no database or Cloudinary external effects.

## Stage 2 — Prisma Schema and Local Migration

### Assignment

Implement Phase 2 and the model contract in `docs/database-schema.md`, including the required explicit invitation hero-media relation. Apply migrations only to local Laragon PostgreSQL. Do not seed invitation or admin data.

### Exit evidence

- schema diff;
- Prisma validate/generate results;
- migration name and local result;
- proof the required hero relation uses `Restrict` and is independent from gallery ordering;
- proof no production database was contacted.

## Stage 2A — Required Hero Media Relation Correction

### Assignment

Before Stage 3, add the approved required `Invitation.heroAssetId` relation through a third forward-only local migration. Give the hero and existing music relations to `MediaAsset` distinct explicit Prisma relation names without recreating the existing music database relation. Verify the local `Invitation` table is empty first. If it is not empty, stop and request a reviewed backfill plan instead of adding a required column blindly. Do not edit the two committed migrations or seed any data.

### Exit evidence

- zero-row preflight for the local `Invitation` table;
- authored schema and generated-client diff;
- migration SQL showing only the required hero column, index, and `Restrict` foreign key;
- local migration status and database integration result;
- confirmation no seed or external service was touched.

## Stage 2B — Gallery Video Persistence Correction

### Assignment

Before Stage 3, add the approved nullable `Invitation.galleryVideoUrl` scalar through a fourth forward-only local migration. It preserves the external gallery-video embed URL used by `default-preview`; it is not a Cloudinary `MediaAsset`. Normalize legacy empty strings during the later seed, not in this migration. Do not edit earlier migrations or seed data.

### Exit evidence

- schema and generated-client diff;
- migration SQL showing only the nullable scalar addition;
- confirmation `default-preview` source content remains unchanged;
- local migration status and read-only database integration result;
- confirmation no seed or external service was touched.

## Stage 1B — pnpm Tooling Contract Correction

### Assignment

Before Stage 3, replace the historical npm lockfile contract with the owner's pnpm/Vercel contract. Pin `pnpm@10.34.7` in `package.json#packageManager`, regenerate `pnpm-lock.yaml` from the current manifest, remove `package-lock.json`, and verify a frozen pnpm install plus all project checks. Do not change dependency ranges, product code, database state, or external services.

### Exit evidence

- exact pinned pnpm version;
- dependency-manifest equivalence before and after;
- synchronized pnpm lockfile containing Prisma/Auth/Cloudinary/test dependencies;
- proof `package-lock.json` is removed and only `pnpm-lock.yaml` remains;
- `pnpm install --frozen-lockfile` and project verification results;
- confirmation no application, database, or external-service effect.

## Stage 3 — Domain, Repository, and Mapper

### Assignment

Begin only after Stage 1B is accepted and committed. Implement Phase 3. Build the stable invitation domain contract, server repository, mapper, and tests. The repository must load the explicit hero media and gallery-video scalar; the mapper must preserve `couple.heroImage` and `gallery.videoUrl`. Do not switch public routes yet. Use pnpm for every command.

### Exit evidence

- repository include/order strategy;
- mapper test results;
- confirmation current routes still use the old source;
- no production data effects.

## Stage 4 — Admin Authentication

### Assignment

Implement Phase 4 following `docs/authentication.md`. Build login, route protection, bootstrap tooling, minimal protected page, and tests. Do not build the invitation dashboard.

Required skill: `security-best-practices` for TypeScript authentication review.

### Exit evidence

- authentication test matrix results;
- protected-route result;
- client-secret scan;
- bootstrap dry run or safe local bootstrap result as assigned;
- no password values in output.

## Stage 5A — Media Manifest and Dry Run

### Assignment

Implement the typed media manifest, deterministic public-ID generation, migration script dry-run mode, and tests. Do not upload anything.

### Exit evidence

- manifest counts by slug/category;
- target public IDs;
- test results;
- exact proposed external effects for Stage 5B.

## Stage 5B — Cloudinary Upload and Verification

### Assignment

After explicit approval of the dry-run manifest, upload required production media to the new account and verify it. Do not delete local files or switch application references.

### Exit evidence

- upload and verification counts;
- safe report path;
- failures, if any;
- confirmation old-account assets are untouched;
- confirmation local files are untouched.

## Stage 6 — Idempotent Seed

### Assignment

Implement and run the local invitation/admin seed using verified media records. Run it twice. Do not switch public routes.

### Exit evidence

- row counts after first and second runs;
- repository query results for four slugs;
- transaction and upsert strategy;
- local database effects only.

## Stage 7 — Public Route Cutover

### Assignment

Switch invitation and invite-link routes to Prisma, add true 404 behavior, and preserve template contracts. Do not remove old hard-coded data or media yet.

### Exit evidence

- route smoke-test results;
- four invitation results;
- 404 result;
- client/server boundary review;
- build result.

## Stage 8 — UI and Design-System Refactor

### Assignment

Implement Phase 8 within `docs/design.md`. Preserve the visual baseline. Do not combine this stage with database or media cleanup.

Required skills: `frontend-design` and `tailwind-design-system`; use `web-design-guidelines` for the post-implementation audit.

### Exit evidence

- changed components and rationale;
- intentional visual differences;
- responsive viewports checked;
- accessibility and reduced-motion checks;
- screenshots when available;
- build and lint results.

## Stage 9 — Firestore Isolation

### Assignment

Implement Phase 9 only. Preserve collection paths and real-time behavior while tightening component boundaries and states.

### Exit evidence

- proof collection path is unchanged;
- subscription cleanup result;
- read/submit smoke test;
- no PostgreSQL replacement introduced.

## Stage 10 — Cleanup

### Assignment

First evaluate every cleanup gate in `docs/media-migration.md`. If any gate fails, stop without deleting anything. If all pass and the stage is explicitly approved, remove migrated local media and obsolete hard-coded data, then run full verification.

### Exit evidence

- completed gate checklist;
- exact deleted files;
- stale-reference scan;
- repository-size change;
- full build/test result;
- Git recovery point.

## Stage 11 — Documentation and Final QA

### Assignment

Update operational documentation to match implemented commands and paths. Run the full final verification sequence and produce a release-readiness report. Do not perform Aiven/Vercel cutover.

### Exit evidence

- documentation changes;
- complete QA matrix;
- unresolved risks;
- explicit list of remaining production-cutover actions.

## Reviewer Response Template

The planner/reviewer responds with one of:

```text
ACCEPTED — Stage N
Evidence reviewed: ...
Next authorized stage: ...
```

or:

```text
CHANGES REQUIRED — Stage N
Blocking findings:
1. ...
Required correction:
- ...
Do not begin the next stage.
```

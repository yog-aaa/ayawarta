# AyaWarta Agent Documentation Index

This directory index is the entry point for programmer agents and reviewers. For current Codex work, start with `AGENTS.md` and the current orchestration section of `docs/agent-workflow.md`. The dated specification, plan, prompts, and stage reviews record the completed refactor; they do not authorize another implementation stage or production cutover.

## Source of Truth

| Document | Purpose |
| --- | --- |
| `AGENTS.md` | Mandatory repository-wide agent rules and handoff format. |
| `docs/superpowers/specs/2026-10-21-ayawarta-refactor-cloudinary-prisma-design.md` | Approved product and technical specification. |
| `docs/superpowers/plans/2026-10-21-ayawarta-refactor-cloudinary-prisma-plan.md` | Approved implementation ordering and file-level plan. |
| `docs/architecture.md` | Current and target system architecture, boundaries, and data flow. |
| `docs/design.md` | UI preservation rules, design tokens, components, and accessibility constraints. |
| `docs/database-schema.md` | Target Prisma entities, relationships, constraints, and seed rules. |
| `docs/media-migration.md` | Cloudinary paths, manifest contract, safety gates, and rollback. |
| `docs/authentication.md` | Admin-only authentication and authorization contract. |
| `docs/deployment.md` | Local, Vercel, and future Neon operational model. |
| `docs/deployment-aiven-vercel.md` | Current local commands and the separately authorized Neon/Vercel production cutover sequence. |
| `docs/media-management.md` | Current Cloudinary catalog, verification commands, and future upload boundaries. |
| `docs/agent-workflow.md` | Current fixed-role Codex orchestration and historical stage assignments. |
| `docs/agent/prompts.md` | Historical Antigravity copy-ready prompts; not standing instructions. |
| `docs/agent/skills.md` | Skill-selection rules and historical stage routing. |
| `docs/qa-checklist.md` | Evidence required for review and final acceptance. |
| `docs/reviews/STAGE-REVIEW-TEMPLATE.md` | Persistent review record for each implementation stage. |

## Status Vocabulary

- **Current:** behavior present in the repository before implementation.
- **Target:** approved behavior the programmer agent must implement.
- **Stage complete:** code for one stage is implemented and evidence is ready for review.
- **Accepted:** the owner/reviewer has approved the stage.
- **Cutover:** the separately approved action that connects the production deployment to new production services.

## Review Loop

```text
Owner assigns one stage
        ↓
Root selects the minimum reusable roles and assigns file ownership
        ↓
Owner agent implements and verifies
        ↓
Root reviews the diff and an independent reviewer checks risky work
        ↓
Root stops with evidence
        ↓
Fixes requested or stage accepted
        ↓
Owner assigns the next stage
```

No stage may silently expand its scope because a later task appears convenient.

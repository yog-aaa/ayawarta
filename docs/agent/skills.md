# Antigravity Skill Routing

## Context

The skills from the `AGENT-SKILLS` repository are installed in Antigravity. Programmer agents should use relevant skills as execution guidance, but skill availability does not expand an assigned stage.

## Rules

1. At the start of a stage, inspect the installed skill list and confirm the required skill names are available.
2. Read the complete `SKILL.md` for every selected skill before taking stage actions.
3. Use the smallest set of skills that covers the assigned work.
4. The approved AyaWarta specification, plan, `AGENTS.md`, and current stage scope remain authoritative.
5. If a skill recommends work outside the assigned stage, report it as a follow-up and do not perform it.
6. If a skill introduces a new product or architecture decision, stop and request review instead of deciding silently.
7. Report which skills were used and how they affected the implementation in the stage handoff.
8. If a required skill is unavailable or unreadable, report it and continue only when a safe documented fallback exists.

## Required Skill Routing

| Stage | Required skills | Purpose |
| --- | --- | --- |
| Stage 0 | None | Read-only baseline; inventory available skills only. |
| Stage 1 | None | Follow approved tooling plan and official package documentation. |
| Stage 1B | None | Reconcile the pnpm/Vercel lockfile contract without changing dependency scope. |
| Stage 2 | None | Follow approved Prisma schema and database contract. |
| Stage 3 | None | Follow repository and mapper contract. |
| Stage 4 | `security-best-practices` | Review TypeScript authentication, secret boundaries, password handling, session authorization, and secure defaults. |
| Stage 5A | None | Follow the approved media manifest contract. |
| Stage 5B | None | Follow the approved Cloudinary migration runbook and safety gates. |
| Stage 6 | None | Follow database seed and idempotency contract. |
| Stage 7 | None | Follow the approved server/client and route architecture. |
| Stage 8 | `frontend-design`, `tailwind-design-system` | Preserve visual character while organizing UI and Tailwind v4 tokens. |
| Stage 8 review | `web-design-guidelines` | Audit accessibility and interface-quality compliance after implementation. |
| Stage 9 | None | Preserve Firestore real-time behavior. |
| Stage 10 | None | Follow cleanup gates; no creative or broad refactoring skill is needed. |
| Stage 11 | `humanizer` when prose needs cleanup | Remove generic AI phrasing without changing technical meaning. |

## Conditional Skills

Use only when the assigned stage explicitly needs them:

- `animate`: only if an approved existing animation must be repaired or implemented; do not add new decorative motion.
- `design-taste-frontend`: optional during Stage 8 only when it supports the existing visual baseline rather than redesigning it.
- `shadcn`: do not use unless the repository is intentionally converted to a shadcn project in a separately approved design.
- `doc-coauthoring`: use for a substantial new specification or decision document, not routine README synchronization.
- `brainstorming`: use only when new scope or an unresolved design decision appears.
- `security-threat-model`: use only if the owner explicitly requests a threat model.
- `seo-audit` or `ai-seo`: use only in a separately assigned SEO stage.
- `copywriting`: use only when marketing copy changes are explicitly assigned.
- `figma` and `figma-implement-design`: use only when the owner provides a Figma source.
- `extract-design-system`: not needed because the current repository is the visual source of truth.

## Brainstorming and Existing Approval

The current refactor already has an approved specification and implementation plan. Do not reopen those decisions during normal execution.

If implementation reveals a material unknown that changes architecture, behavior, data ownership, UI direction, or destructive scope:

1. stop the current stage;
2. describe the discovered constraint;
3. use `brainstorming` to frame options if appropriate;
4. request owner/reviewer approval;
5. update the specification and plan before continuing.

## Handoff Addition

Add this section to the standard stage handoff:

```text
Skills used:
- skill-name: why it applied and what it changed or validated
```

Use `none` when no skill was required.

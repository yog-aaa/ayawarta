# Stage 9 — Firestore Isolation and Wishes Hardening Review

## Status

`ACCEPTED — FINALIZED`

Stage 9.1 resolves `FIRE-01` through `FIRE-06`. Stage 9.2 replaces the regex scanner with a TypeScript AST scanner. Stage 9.2A adds runtime namespace re-export edges, and Stage 9.2B supplies a meaningful negative test and positive control on the same graph. The scoped implementation was committed as `c998a2a3e3a56c153f2680d0901178ef6a8ebc71` (`feat: isolate realtime wishes in Firestore`).

## Post-Commit Finalization Audit

- The implementation commit contains exactly 13 reviewed files: 11 under `src/features/wishes/**`, `src/lib/firebase.ts`, and `WishesSection.tsx`. It contains neither planner document, environment file, package manifest, nor lockfile.
- Programmer finalization gates: `pnpm test` 493/493, typecheck clean, lint with zero warnings, `git diff --check`, `git diff --cached --check`, and `git show --check HEAD` all pass. The reviewer independently confirmed the 13-file commit scope, clean commit diff, and the remaining two-document planner worktree.
- No live Firestore read/write or database mutation was part of Stage 9. Live connectivity, Firestore rules, and indexes require a separately authorized integration check.

## Stage 9.2B Final Review

- The server root now side-effect imports the barrel at runtime, so the detector reaches the barrel in both test phases.
- With multiline `export type * as ... from`, the detector reports zero violations. Replacing only the barrel statement with multiline `export * as ... from` reports one violation and the complete `src/app/page.tsx` → `src/features/wishes/barrel.ts` → `src/features/wishes/firebase-adapter.ts` chain.
- Independent `pnpm test`: PASS — 29 files, 493 tests. `git diff --check`: PASS. The handoff also reports passing frozen install, typecheck, lint, build, and two 82-row seed checks; these other gates were not independently repeated in this review.
- Stage 9.2B changed only the boundary test fixture. No live Firestore behavior was exercised; production Firestore connectivity and rules remain for a separately authorized integration check.

## Stage 9.2A Final Review

- `ts.isNamespaceExport(statement.exportClause)` now adds a runtime edge for `export * as ... from` after the existing `statement.isTypeOnly` guard.
- A multiline runtime namespace re-export through a barrel reports the complete server-to-adapter dependency chain. The source code's `statement.isTypeOnly` guard correctly precedes the namespace branch.
- Independent `pnpm test`: PASS — 29 files, 493 tests. `git diff --check`: PASS. The programmer handoff reports passing frozen install, typecheck, lint, build, seed verification before and after, and 10 route smoke checks; these other gates were not independently repeated for Stage 9.2A.
- The actual repository scan passes with no current server-to-Firebase path. No production Firebase or wishes file was changed in Stage 9.2A.

### Historical finding — resolved by Stage 9.2B

#### FIRE-07B — Type-only namespace graph test stops at the root

The negative test at `src/features/wishes/boundary.test.ts` imports its barrel with `import type { wishes } from "@/features/wishes/barrel"`. This root import is removed from the runtime graph, so `findTransitiveFirebasePaths()` never visits the barrel or its `export type * as ... from`. The empty violation result would remain unchanged if the barrel re-export were accidentally classified as a runtime edge. The claim that this graph test proves type-only namespace handling is therefore unsupported.

Change the root fixture to a runtime side-effect import of the barrel while leaving `export type * as ... from` in the barrel. Assert zero violations. Add a positive control using the same graph with `export * as ... from`, and assert the full server → barrel → adapter chain. This proves the detector traverses the barrel in both cases and distinguishes the type-only re-export.

## Stage 9.2 Correction Review

### Accepted corrections

- Multiline `ImportDeclaration` and `ExportDeclaration` edges are parsed through the TypeScript AST.
- Type-only, mixed, empty-clause, alias, relative-path, cycle, and directive-prologue cases are covered by graph mutation tests using `findTransitiveFirebasePaths()`.
- The actual repository scan reports no current server-to-Firebase violation.
- Independent `pnpm test` passes: 29 files, 491 tests. The targeted boundary suite passes: 16 tests. `git diff --check` passes. The programmer handoff reports passing typecheck, lint, build, seed verification, and route smoke tests; those gates were not independently repeated in this review.

### Historical finding — resolved by Stage 9.2A

#### FIRE-07A — Namespace re-export is an untracked runtime edge

In `src/features/wishes/boundary.test.ts`, the `ExportDeclaration` branch handles a missing export clause (`export * from`) and `ts.isNamedExports(...)`, but it does not handle `ts.isNamespaceExport(...)`. TypeScript parses `export * as wishes from "./firebase-adapter"` as `NamespaceExport`. The current function adds no graph edge for that statement, even though it re-exports a runtime value. A server module can therefore reach the Firebase adapter through this barrel without the detector reporting the path.

Extend the same AST detector to treat a non-type-only `NamespaceExport` as a runtime edge. Add a temporary-graph mutation test where a Server Component imports from a barrel containing a multiline `export * as ... from` pointing to `firebase-adapter.ts`; require the complete chain in the violation. Also prove `export type * as ... from` remains ignored. Keep the existing 16 boundary tests and production implementation intact.

## Stage 9.1 Correction Review

### Accepted corrections

- `FIRE-01`: `WishesSnapshot.skippedCount` preserves valid siblings, prevents a false empty state, renders a generic nonfatal warning, and clears on a clean snapshot.
- `FIRE-02`: hoisted throwing mocks guard Firebase SDK entry points while adapter behavior is exercised through an injected low-level port.
- `FIRE-03`, production structure: `src/lib/firebase.ts` is client-only, the unused `db` proxy is removed, and the pure barrel no longer re-exports the Firebase adapter.
- `FIRE-04`: retry, slug replacement, unmount, stale data/error callbacks, active-subscription count, and one-to-one unsubscribe accounting are covered with a controllable gateway.
- `FIRE-05`: successful submission renders a polite status and clears stale success feedback on subsequent interaction.
- `FIRE-06`: name, message, attendance, and submit failures have distinct accessible associations.

### Historical finding — addressed by Stage 9.2

#### FIRE-07 — Graph scanner and mutation tests do not cover multiline imports

`extractImportSpecifiers()` uses `[^"'\n]+` between `import`/`export` and `from`. It therefore does not parse the normal multiline form used throughout this repository, for example:

```ts
import {
  getFirestore,
} from "firebase/firestore";
```

The synthetic mutation tests only call `extractImportSpecifiers()` or test the client-directive regex. They do not execute the actual graph traversal against a temporary module graph and therefore do not prove the claimed direct/transitive detection or boundary stop behavior.

Replace regex source parsing with the already-installed TypeScript compiler API (`typescript` is present in devDependencies). Parse `ImportDeclaration` and `ExportDeclaration` module specifiers across single-line and multiline syntax. Ignore fully type-only imports/re-exports, including specifier-level `import { type Foo }` and `export { type Foo } from`; mixed type+value and empty-clause imports/exports remain runtime edges. Recognize `"use client"` only in the initial directive prologue, not when it appears after another statement. Mutation tests must create an isolated temporary graph and invoke the same detector used for the repository scan, proving direct Firebase detection, multiline transitive re-export detection, valid directive-prologue boundary stop, a negative late-directive case, alias/relative resolution, cycles, and type-only/mixed/empty-clause classifications. Do not add a parser dependency.

## Stage 9.1 Independent Verification

- `pnpm test`: PASS — 29 files, 475 tests.
- `pnpm typecheck`: PASS — 0 errors.
- `pnpm lint`: PASS — 0 errors and 0 warnings.
- `pnpm build`: PASS — Next.js 16 production build completed. The existing `baseline-browser-mapping` age notice remains non-blocking and must not trigger an unrelated dependency update in Stage 9.
- `git diff --check`: PASS.
- File scope: implementation changes are limited to the approved wishes/Firebase paths. The planner-owned `docs/agent/prompts.md` diff remains separate.
- No review command performed a Firestore write or any external mutation.

## Accepted Foundations

- Exact path contract remains `wishes/{invitationSlug}/messages`.
- Query ordering remains `timestamp desc`.
- Read compatibility covers `Hadir`, `Tidak Hadir`, and `Belum Konfirmasi`; writes remain limited to `Hadir` and `Tidak Hadir`.
- Write payload remains exactly `name`, `message`, `attendance`, and `timestamp: new Date()`.
- Input trimming, double-submit locking, form persistence on failure, form reset on success, and minimum button touch targets are present.
- Subscription cleanup uses an unsubscribe returned by the gateway and ignores callbacks after cleanup.
- PostgreSQL, Prisma, Cloudinary, Auth.js, package manifests, and lockfiles are untouched.

## Historical Stage 9 Findings — Resolved by Stage 9.1

### FIRE-01 — Malformed-record handling is silent in the UI

`parseWishDocument()` skips malformed records and writes a fixed `console.warn`, but `WishesGateway.subscribe()` only returns `Wish[]`. The adapter therefore discards the fact that records were skipped, and `WishesSection` cannot render the required generic nonfatal warning. If every record is malformed, the UI incorrectly reports that there are no wishes.

Return safe snapshot metadata such as `skippedCount` alongside valid wishes. Keep valid siblings visible, render a generic nonfatal warning when `skippedCount > 0`, clear it after a clean snapshot, and never expose document data or raw errors.

### FIRE-02 — The zero-network test is not fail-closed against the real SDK

The tests import the real `firebase/app` and `firebase/firestore` modules. `createFailClosedFirestorePort()` proves only that a test double throws when directly invoked; it does not make `initializeApp`, `getFirestore`, `onSnapshot`, or `addDoc` fail if production code accidentally calls them. The handoff's zero-network/zero-production-call claim is therefore stronger than the evidence.

Mock both Firebase modules at the test boundary with hoisted throwing spies. Prove the component suite with an injected gateway never calls any real-SDK entry point. Keep the adapter contract tested through an injected low-level port.

### FIRE-03 — The boundary scan is direct-text-only and exempts the Firebase utility

`boundary.test.ts` skips `src/lib/firebase.ts` and only scans individual import lines. It does not follow alias/relative re-export paths. `src/features/wishes/index.ts` currently re-exports `firebase-adapter.ts` without declaring a client boundary, so a future Server Component could import the generic barrel and transitively reach Firebase without this test detecting the dependency path.

Make the production boundary explicit: mark the Firebase utility as client-only, remove the now-unused `db` proxy, and stop exporting the Firebase adapter from the generic pure barrel. The boundary test must walk imports/re-exports from server roots and stop only at an explicit `"use client"` boundary; the normal Server Component → Client Component edge remains valid.

### FIRE-04 — Retry and stale-generation claims lack the required proof

The retry test checks visible recovery but not exact subscription/unsubscription counts. The stale-callback test covers only unmount, not retry or slug replacement. It never invokes an old generation callback after a new generation has become active, so the reported stale-generation protection and one-unsubscribe-per-created-subscription contract are not proven.

Add a controllable gateway that retains callbacks per generation. Verify retry and slug change each unsubscribe the old generation exactly once, maintain at most one active subscription, create exactly one replacement, and ignore old data/error callbacks after the new generation is active. Also cover idempotent cleanup under React Strict Mode semantics.

### FIRE-05 — Submission success has no accessible status

A successful write silently clears the form. There is no rendered success state or polite live-region announcement, despite the Stage 9 handoff requiring proof of success feedback.

Render a concise success message in a polite status region after a successful submission. Clear stale success feedback when the user edits/resubmits, and test the lifecycle.

### FIRE-06 — Validation errors are associated with the wrong controls

Any `formError`, including missing attendance or a network failure, sets `aria-invalid` on both name and message. The attendance radiogroup has no `aria-invalid` or `aria-describedby`. This makes assistive technology announce valid text fields as invalid while failing to associate the attendance error with the attendance control.

Track content-validation, attendance-validation, and submit failures separately. Mark only the affected controls invalid, associate the radiogroup with its attendance error, and keep submission failures as form-level alerts without marking valid fields invalid.

## Decision

Stage 9 implementation is finalized at `c998a2a3e3a56c153f2680d0901178ef6a8ebc71`. The two planner documents are maintained separately. Stage 10 remains a separate review gate.

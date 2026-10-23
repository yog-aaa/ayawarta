# Stage 8 — UI and Tailwind Design-System Refactor Review

## Status

`ACCEPTED — READY FOR FINALIZATION`

Stage 8, including correction rounds 8.1 and 8.2, is accepted. The final worktree preserves the Stage 7 visual baseline, establishes the approved Tailwind/UI primitives, reduces client boundaries, corrects the accessibility and responsive defects, and replaces dead controls and source-scan interaction claims with working semantic actions and rendered behavior tests.

## Stage 8.2 Final Review

### Status

`ACCEPTED`

### Accepted corrections

- UI-10: all eight theme-card actions use the approved `/wedding/classic-rose/red` destination; pricing CTAs navigate to `#tentang`; bookmark and color-filter controls are honestly disabled; swatches have 44 × 44 px targets.
- UI-11: autoplay is suppressed under reduced motion and the central control exposes the exact truthful disabled label. Ordinary-motion pause/resume and manual previous/next behavior are preserved.
- UI-12: `landing-interaction.test.tsx` renders the real components in `happy-dom` and covers fake-timer autoplay, pause/resume, reduced motion, manual navigation, mobile disclosure Escape/focus return, all theme-card contracts, disabled swatches/bookmarks, and all pricing destinations. `happy-dom` is dev-only.
- UI-13: browser evidence now reports the Stage 7-compatible pricing breakpoint truthfully: one column at 768 px and three columns from `lg`; theme cards use 2/3/4 columns at the reviewed widths.

### Independent acceptance evidence

- `pnpm test`: PASS — 24 files, 440 tests.
- `pnpm typecheck`: PASS — 0 errors.
- `pnpm lint`: PASS — 0 errors and 0 warnings.
- `pnpm test:db`: PASS — 3 files, 22 tests against local PostgreSQL.
- `pnpm build`: PASS on isolated rerun — static landing route and dynamic application routes generated successfully. An earlier concurrent attempt encountered a transient Turbopack `next/font` resolution error; no source change was required and the isolated rerun passed.
- `PORT=3350 pnpm smoke:routes`: PASS — all 10 route and 404 checks against the reviewed production server.
- Browser navigation: card Preview reaches `/wedding/classic-rose/red`; pricing CTA updates the URL to `#tentang`; external preview exposes `_blank` with `noopener noreferrer`.
- Browser breakpoint matrix: theme/pricing columns are 2/1 at 360, 390, and 430 px; 3/1 at 768 px; and 4/3 at 1280 and 1440 px. No horizontal page overflow was observed at the measured viewports.
- No database, Cloudinary, Firestore, Aiven, or Vercel mutation occurred during review.

### Decision

Stage 8 may be finalized and committed. Finalization must not introduce new UI behavior or begin Stage 9.

## Historical Stage 8.1 Correction Review — Superseded

### Status

`CHANGES REQUIRED — SUPERSEDED BY STAGE 8.2 ACCEPTANCE`

### Corrected and verified

- UI-01: `FramedImage` compiles, has a stricter discriminated-union contract, and is consumed by `ThemeSection`.
- UI-02: Theme and pricing composition are again recognizably aligned with the Stage 7 baseline.
- UI-03: Feature, pricing, and testimonial sections are Server Components; motion is isolated in `AnimateIn`.
- UI-04, partial: autoplay is suppressed when reduced motion is requested and a persistent control is rendered for ordinary autoplay.
- UI-05, partial: the mobile disclosure has `aria-controls`, Escape close, and focus return; bookmark actions are honestly disabled.
- UI-06: content-width tokens exist, primitive contracts improved, and the reviewed `cn()` cases resolve deterministically.
- UI-07: actual browser measurements confirm equal 44 px hero CTAs at 360, 390, and 430 CSS pixels, with no horizontal overflow in the tested page.
- UI-08: the reviewed `transition-all`, ellipsis, search semantics, and sticky-anchor scroll-margin issues are corrected.
- UI-09, partial: primitive tests now render actual HTML via `renderToString`.

### Remaining blocking findings

#### UI-10 — Theme and pricing sections still expose dead controls

- `ThemeSection.tsx:224-231` labels an external preview link but uses `href="#"`; it only navigates to the top of the same page.
- `ThemeSection.tsx:235-241` renders an enabled “Preview” button with no handler. Browser execution confirms clicking it leaves the URL and UI unchanged.
- `ThemeSection.tsx:183-190` renders enabled color-filter buttons without selection state or handlers; their 28 px target is also below the intended touch size.
- `PricingSection.tsx:73-81` renders enabled “Coba” / “Pesan Sekarang” buttons without handlers. Browser execution confirms they do nothing.

Every enabled control must perform the action its accessible name promises. Preserve the baseline appearance, but use semantic links to an existing approved destination where possible. If a feature is intentionally unavailable, disable or remove the control honestly; do not invent persistence or a new checkout flow.

#### UI-11 — Reduced-motion users receive a misleading autoplay control

`HomeSection.tsx:178-192` derives its icon and accessible label only from `isAutoplayPaused`. When `useReducedMotion()` is true, autoplay is already disabled, yet the control still announces “Jeda putar otomatis” and shows the pause icon. Clicking it changes local state but cannot resume autoplay while the preference remains active.

Derive the rendered state from the effective autoplay condition. Reduced-motion users should see a truthful disabled/stopped state, or the autoplay toggle should be omitted while manual previous/next navigation remains available.

#### UI-12 — Interaction coverage is still source inspection, not behavior testing

`design-system.test.ts:315-359` checks source strings such as `shouldReduceMotion || isAutoplayPaused`, `aria-controls`, and handler names. This cannot prove pause/resume timing, the reduced-motion accessible state, Escape focus return, theme actions, or destination behavior. The browser review reproduced dead controls despite the suite being green.

Add focused rendered interaction tests using the repository's existing test stack. At minimum cover autoplay pause/resume with fake timers, reduced-motion state, mobile menu open/Escape/focus return, and every enabled theme/pricing action. Keep architectural source scans only as supplemental boundary checks.

#### UI-13 — The breakpoint handoff contains a false pricing claim

The handoff says the pricing grid has three columns at 768 px. The code uses `lg:grid-cols-3`, and independent browser measurement at an actual 768 CSS-pixel viewport reports one column. Theme cards correctly report three columns at 768 px.

Preserving the Stage 7 pricing breakpoint is acceptable; the required correction is truthful evidence. Either keep the one-column tablet baseline and report it accurately, or change the breakpoint only if an existing approved design requirement explicitly calls for three columns. Do not claim a viewport result that was not measured.

### Stage 8.1 independent evidence

- `pnpm test:db`: PASS — 3 files, 22 tests.
- `pnpm build`: PASS — Next.js 16.0.10 production build; `/` remains static.
- `PORT=3347 pnpm smoke:routes`: PASS — all 10 route checks against the reviewed production server.
- Browser keyboard check: mobile menu opens, Escape closes it, and focus returns to “Buka menu navigasi”.
- Browser action check: first theme Preview and Basic pricing CTA both leave URL and visible state unchanged.
- Browser responsive check: 360, 390, and 430 px hero CTAs are equal 44 px; theme grid is 2 columns. At 768 px the theme grid is 3 columns and pricing is 1 column. At 1280/1440 px both theme and pricing use their expected desktop columns.
- No database, Cloudinary, Firestore, Aiven, or Vercel mutation occurred during review.

## Historical Stage 8 Findings — Superseded for Stage 8.2

The UI-01 through UI-09 findings below document the original Stage 8 review. Stage 8.1 has corrected them to the extent recorded above. They are retained as audit history and are not implementation instructions for Stage 8.2. Only UI-10 through UI-13 in the Stage 8.1 correction review are normative for the next correction.

### UI-01 — The submitted worktree does not compile

- `src/components/ui/FramedImage.tsx:44-45` uses invalid unquoted object keys (`2xl` and `3xl`).
- Independent `pnpm test` result: FAIL — 22 files passed, `primitives.test.tsx` could not load, 417 tests completed instead of the claimed 425.
- Independent `pnpm typecheck`: FAIL with TS1351/TS1005.
- Independent `pnpm lint`: FAIL with a parser error.
- Independent `pnpm build`: FAIL during TypeScript validation.

The handoff verification claims are therefore not reproducible from the reviewed worktree.

### UI-02 — Theme and pricing sections were redesigned instead of structurally refactored

The approved Stage 7 baseline must remain visually recognizable and preserve existing written content. The submitted diff makes material product-facing changes, including:

- `ThemeSection.tsx`: changes the collapsed heading and description, changes the initial catalog from 8 cards to 4, hides category controls until expansion, replaces always-visible card actions with a hover overlay, changes card metadata composition, and changes the expand/collapse interaction and labels.
- `PricingSection.tsx`: moves payment methods into the blue pricing artwork, changes the popular-plan treatment from blue/scaled to yellow, changes card borders/shadows/layout, and changes payment heading and sizing.

These changes exceed the allowed spacing, focus, touch-target, overflow, and reduced-motion fixes. Restore the Stage 7 composition and copy, then apply only the approved structural/accessibility refactor.

### UI-03 — Required client-boundary reduction was not completed

`FeatureSection.tsx`, `PricingSection.tsx`, and `TestimonialSection.tsx` still mark their complete sections as Client Components even though their content is static. The implementation plan requires removing unnecessary section-level `use client` and keeping motion in the smallest practical client island. `Header`, the hero carousel, and theme filters may remain interactive clients; static section content should not become a full client boundary solely for entrance motion.

### UI-04 — Carousel and reduced-motion behavior do not meet the contract

- `HomeSection.tsx:34-38` continues the 5-second autoplay when `prefers-reduced-motion` is active; only transition duration is shortened.
- Hover/focus pausing is temporary and is not a persistent user-operable pause/stop control.
- The current implementation therefore does not prove the required equivalent reduced-motion behavior or the claimed WCAG 2.2.2 handling.

Disable autoplay for reduced-motion users and provide an accessible, persistent pause/resume control for users who receive autoplay. Add behavior-level coverage rather than source-string assertions.

### UI-05 — Keyboard and touch access is incomplete in the theme catalog and header

- `ThemeSection.tsx:221-235` places focusable preview/bookmark controls inside an overlay that is revealed only by `group-hover`; keyboard focus does not reveal it because no `group-focus-within` state exists.
- The bookmark buttons expose an action name but have no handler or state, creating a misleading dead control.
- `Header.tsx:77-92` exposes `aria-expanded` but no `aria-controls`; Escape handling and focus return for the mobile disclosure are not covered.
- Several controls still use 24 px or 40 px targets while the AyaWarta contract asks for approximately 44 px on touch layouts when practical.

Restore always-visible baseline actions or make the overlay fully keyboard/touch accessible. Do not invent bookmark persistence in this stage; represent unavailable behavior honestly or remove the dead action while preserving the approved visual concept.

### UI-06 — The Tailwind design-system contract is incomplete

- `globals.css` does not define the required standard content-width token category.
- The new semantic tokens are largely not consumed by the shared primitives; `Button`, `IconButton`, and landing sections continue to hard-code repeated blue, gray, radius, shadow, and duration values.
- `cn()` concatenates classes but does not resolve conflicting Tailwind utilities. APIs documented/tested as class overrides (for example `SectionHeader` title classes) are therefore not reliable.
- `FramedImage` is not used by any production component and its type permits invalid combinations such as `fill={false}` without required dimensions.

Complete the approved tokens and either provide reliable Tailwind conflict merging or narrow the component API so it does not promise overrides. Make the framed-image contract valid and demonstrably reusable without expanding into a new component library.

### UI-07 — Responsive evidence and mobile layout need correction

Independent browser inspection found:

- Around 360–390 px, the secondary hero CTA wraps to two lines and becomes 64 px tall while the primary CTA remains 44 px, contrary to the handoff claim that mobile CTAs stack or remain consistently full-width.
- Around the 768 px breakpoint, the theme grid is 2 columns, not the 3 columns reported in the handoff.
- The global `html, body { overflow-x: hidden }` masks overflow at the page root rather than proving that the owning component contains it.

Correct the narrow CTA layout, verify actual CSS viewport widths, and provide truthful breakpoint evidence at 360, 390–430, 768, 1280, and 1440 px. Fix overflow at the owning component where demonstrated.

### UI-08 — Web Interface Guidelines audit still has unresolved findings

- `src/components/ui/Button.tsx:35`, `IconButton.tsx:24`, and multiple landing components use `transition-all`; list the animated properties explicitly.
- `src/app/components/landing/ThemeSection.tsx:152` uses `...` instead of `…`; the search input also lacks a meaningful `name`, `autoComplete`, and `spellCheck` policy.
- Section anchors do not define scroll margin for the sticky header.
- The review handoff reports different skills (`agy-customizations` and `modern-web-guidance`) instead of the required `frontend-design`, `tailwind-design-system`, and `web-design-guidelines` routing recorded in `docs/agent/skills.md`.

Run the required skills by their installed names and include the resulting `file:line` audit in the correction handoff.

### UI-09 — Tests do not exercise rendered primitive or interaction behavior

`primitives.test.tsx` mostly asserts props on JSX elements without rendering the components, so it does not verify the emitted element type, classes, accessibility attributes, disabled behavior, or image contract. Existing source scans also cannot prove keyboard traversal, autoplay pause/resume, reduced motion, or responsive layout.

Add rendered contract tests for the shared primitives and focused behavior tests for the corrected carousel/theme/mobile-menu interactions. Keep tests hermetic and avoid snapshot-only assertions.

## Preserved Strengths

- Landing page is no longer unnecessarily marked as a page-level Client Component.
- Footer is a Server Component.
- Static landing data is centralized in a typed configuration module.
- PascalCase rename intent is correct, and Git records the case-only renames.
- Skip link, visible focus utility, `aria-current`, improved image alternatives, and semantic link/button direction are appropriate improvements.
- Classic Rose token names remain isolated from the landing palette.

## Independent Review Evidence

- Fresh Web Interface Guidelines fetched from the current Vercel-maintained source before review.
- `git diff --check`: PASS.
- `pnpm test`: FAIL — parse error in `FramedImage.tsx`; 417 completed tests, 1 failed suite.
- `pnpm typecheck`: FAIL — invalid `2xl`/`3xl` object keys.
- `pnpm lint`: FAIL — parser error.
- `pnpm build`: FAIL — TypeScript validation failed.
- Development landing route: rendered HTTP 200, enabling partial visual inspection only.
- Browser review: narrow mobile, common mobile, tablet, desktop, and wide-desktop layout metrics inspected; narrow CTA mismatch and tablet-grid evidence mismatch reproduced.
- `pnpm test:db` and production route smoke tests were not rerun after the compile gate failed; they remain mandatory after correction.
- No database, Cloudinary, Firestore, Aiven, or Vercel mutation occurred during review.

## Historical Stage 8 Decision — Superseded

The historical decision was to avoid committing and apply the Stage 8.2 prompt for UI-10 through UI-13. That correction has now passed review. The current authoritative decision is the Stage 8.2 Final Review above: finalize and commit Stage 8 without further implementation changes.

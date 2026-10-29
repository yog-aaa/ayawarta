# Siger Priangan premium template implementation plan

## Basis and boundaries

Implement the approved [Siger Priangan design](../specs/2026-10-29-siger-priangan-premium-template-design.md) in reviewable slices. It is a wedding-only, modern Priangan theme with restrained Garutan accents, no religious default, and purposeful 3D depth during scroll. The theme is independent of Classic Rose. This plan does not authorize Cloudinary uploads, Neon migrations/customer-data writes, deployment, price/package changes, or a commit. Those operations require their own exact target review.

Root owns the theme/domain integration contract. The owner explicitly requested a graphic designer agent for this template; `graphic_designer` is a task-specific exception to the standard role list in `AGENTS.md` and owns only original concept art and cultural reference notes, not product code or production operations. `frontend_engineer` owns the new theme's UI/motion; `backend_engineer` owns theme dispatch and domain mapping; `data_engineer` owns any additive Prisma fields and migrations; `qa_reviewer` independently checks regressions. Assign exact files before a stage begins and never have two agents edit the same file concurrently.

## Stage T1 — visual board and culturally reviewed artwork

1. Produce an original asset board for the ivory cover, siger-inspired embossed contour, light Garutan geometric/floral edge rhythm, portrait frame, paper texture, and section transition frames. Show static mobile (~390 px) and desktop (~1280 px) compositions for the full guest flow, not only a hero image.
2. Check historical/cultural references against [Sunda siger documentation](https://repositori.kemendikdasmen.go.id/16254/) and [Garutan batik characteristics](https://www.garutkab.go.id/page/batik-tulis-garutan). Ask a Priangan bridal/cultural practitioner to validate final ceremonial shapes and terms before marketing authenticity. Do not trace a specific craftsperson's pattern or use generated script as decoration.
3. Keep names, dates, instructions, and buttons as real HTML text in the mockup. Prepare separate ornamental layers that can be cropped on phones and reassembled on desktop. Define safe areas for text and touch controls.

**Gate:** owner reviews mobile/desktop board, color contrast, asset provenance, cultural notes, and the static reduced-motion presentation. No route or Cloudinary change. Built-in image generation may create original bitmap concepts only after this visual direction is reviewed; final project assets must be saved in the repository before code references them.

## Stage T2 — typed theme contract and content fields

1. Extend `src/features/invitations/types.ts` so theme metadata is a discriminated union: Classic Rose retains red/green/blue/orange/black/white; Siger Priangan accepts only `ivory`. Update `src/features/invitations/mapper.ts` validation and focused tests. Unsupported theme/variant pairs fail safely.
2. Add optional `greeting` and `prayer` content with empty defaults, plus persisted gallery `caption` and existing `altText` in the Siger domain view. Keep Classic Rose's `Gallery.images` compatibility view derived from the same ordered records. Add the necessary additive Prisma columns and mapper changes under a separate reviewed data stage.
3. Define a preview-only sample record that is clearly illustrative and never substitutes for unknown customer slugs. Its RSVP/wishes UI is read-only; do not mount a writable Firestore adapter or send a sample submission. Do not modify any of the four production invitation rows merely to demo the theme.
4. Coordinate the admin draft schema/editor fields with [the admin implementation plan](2026-10-29-ayawarta-admin-panel-plan.md). The new theme is not publishable through admin until its data, assets, route, and tests are complete.

**Gate:** mapper/type tests for both themes, old slug/Classic Rose regression, rejection of invalid theme/variant pairs at the mapper boundary, sample preview Firestore-write isolation, and migration review. Public route-level 404 behavior is verified in T3 after dispatch exists. No Neon migration in this stage.

## Stage T3 — static responsive template

1. Add a separate Siger Priangan config and route under `src/app/(templates)/wedding/siger-priangan/[variant]/`, with a theme-specific component family. The public `src/app/[slug]/page.tsx` dispatches by the persisted theme while preserving the existing slug lookup and unknown-slug 404. Do not branch within every Classic Rose section.
2. Implement opening, hero, couple/greeting, events/location, story, gallery, gifts, RSVP/wishes, and closing with semantic text and the existing Firestore adapter. Optional sections collapse without empty decorative panels. Check that each control has a label and visible focus.
3. Build one-column mobile first at 360–430 px, a readable ~640–760 px content column on desktop, and decorative side fields that never cover content. Background textures and ornaments should flow between sections without visible rectangular seams or unexplained corner stickers.
4. Verify initial viewport and all sections at 360/390/430/768/1280/1440 px. Review image crop, names of unusual length, empty optional content, keyboard order, and no horizontal overflow.

**Gate:** screenshots of opening and each section on mobile/desktop, typecheck, lint, focused component/route tests including unknown theme/variant 404 behavior, and a complete static reduced-motion view. Do not add scroll effects until the static flow is approved.

## Stage T4 — section-scoped 3D motion and media delivery

1. Add perspective to at most two or three independent layers per section, using `transform`/`opacity` and intersection-aware scroll progress. Give cover, profiles, events, gallery, and closing distinct but restrained depth cues. Do not pin scrolling, block content behind a long animation, or move focus with a decorative layer.
2. On `prefers-reduced-motion: reduce`, render final states directly with identical content/actions. Pause or release scroll work when a section leaves the viewport. Avoid layout-affecting animation and expensive per-frame React state changes.
3. Produce optimized raster derivatives sized for actual rendered slots; use CSS/SVG for small repeatable geometry. After an exact upload review, deliver approved runtime raster artwork from Cloudinary via content-addressed IDs, verified versioned URLs, responsive widths, and lazy loading below the opening view. Preserve local originals as source material outside `public`.
4. Inspect network payload and smoothness on a midrange mobile viewport with CPU throttling when tooling permits. Manual scroll must remain responsive during image loading; no broken decoration if an image fails.

**Gate:** reduced-motion, keyboard, normal-scroll, cross-browser/viewport checks; verified Cloudinary manifest and byte/dimension constraints; no oversize initial media. Report exact external uploads and their IDs. No production customer-data write.

## Stage T5 — integration and release readiness

1. Add the Siger preview to the landing theme collection only after the route and sample assets are complete. Mark premium availability honestly; do not imply it is included in Kabar/Cerita/Istimewa or available for purchase until a separate offer decision is implemented.
2. Exercise the public `/{slug}` theme dispatch with fixtures for both themes. Preserve `/[slug]/invite`, Firestore wishes/RSVP, Classic Rose variants, and 404 behavior. Review long names, missing optional sections, and content from a future admin draft publish fixture.
3. Update `docs/design.md`, `docs/architecture.md`, `docs/media-management.md`, and relevant QA notes. Run typecheck, lint, tests, production build, route smoke tests, screenshot review, accessibility checks, image-manifest verification, and credential/stale-path scan.
4. Prepare separate production data/asset activation steps with exact migration target, cultural sign-off, and theme availability switch. For a converted existing invitation, recovery restores a prior complete publication snapshot with its original theme, valid variant, content, and media references through a reviewed publish path. A Siger-only invitation has no Classic Rose state to restore; its disable/recovery behavior requires a separate product decision and cannot be a simple theme-key flip. Do not activate a production invitation or change pricing in this stage.

## Cross-project ordering

The admin panel's read-only shell/list (A1) and the template's visual board (T1) can proceed independently. Siger's optional content fields and theme/variant contract (T2) must be agreed with the admin draft schema (A2) before either editor or theme publish is enabled. The static template (T3) precedes motion (T4). Both streams require their own review gates and an explicit owner decision on production activation.

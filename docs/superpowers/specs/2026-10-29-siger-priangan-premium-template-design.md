# Siger Priangan: premium wedding invitation template

## Status and decisions

Design approved in conversation on 2026-10-29. This document is the reviewable specification, not authorization to publish a theme or mutate production data. The owner selected a wedding-only template with a broad Priangan identity and restrained Garutan accents. Greeting and prayer text must be editable and have no religious default. The desired presentation is traditional Sundanese craft interpreted through a modern, mobile-first visual system, with noticeable depth and 3D motion while scrolling.

## Purpose and success criteria

The template should give an AyaWarta customer a premium invitation that feels distinctly Sunda without using unrelated regional ornaments as decoration. Guests should immediately understand whose wedding it is, when and where to attend, and how to respond. The experience must remain legible and fully functional on a narrow phone, slow network, and reduced-motion setting. Desktop uses the extra canvas for atmosphere rather than stretching the invitation content.

The template is called **Siger Priangan** in product-facing copy; **Siger Priangan Atelier** is the visual concept name, not a separate template. It is a new theme family alongside Classic Rose. Existing invitation slugs, Classic Rose appearance, Firestore wishes/RSVP, and public route behavior stay intact until the new theme is explicitly enabled for an invitation.

## Cultural and visual direction

The visual spine is a wedding keepsake: an ivory paper cover, a portrait framed by an original contour interpretation of the Sunda siger, then successive layers of paper, textile, and restrained floral detail. Use original artwork rather than a photo cutout or a traced craft object. The contour and any wedding attributes must be reviewed with a Priangan bridal stylist or cultural practitioner before the theme is marketed as culturally authentic.

The palette is warm ivory `#F6F1E8`, ink green `#243B35`, antique gold `#B58B53`, and muted earth blush `#C8A69A`. Gold is an accent for fine rules, seals, and small highlights; body text stays high contrast. A subtle diagonal/diamond textile rhythm and small flora at selected edges refer to documented Garutan batik characteristics. The Garut government describes its geometric diagonal and diamond forms, flora/fauna, and cream base [here](https://www.garutkab.go.id/page/batik-tulis-garutan). The Ministry of Education repository documents Sunda siger bridal styling [here](https://repositori.kemendikdasmen.go.id/16254/). These sources support direction; they do not grant permission to reproduce a specific artist's pattern or bridal image.

Use a moderate-contrast serif for names and section titles and a readable humanist sans for dates, addresses, and controls. Avoid ornate script for running text. Do not render Sundanese script as filler; if it is later used, verify spelling, meaning, and shaping with a knowledgeable reviewer. The invitation copy is Indonesian by default, with editable greeting and prayer fields that can be left empty. Never insert an Islamic or other religious formula automatically.

This copy needs a real data contract before the theme goes live: add optional `greeting` and `prayer` fields to the invitation domain, published Prisma record, mapper, and admin draft/editor. Existing records map both fields to empty strings, and Classic Rose ignores them. Add an optional `caption` to `GalleryItem` and expose each image's persisted `altText` and caption to the new template. During migration, keep the Classic Rose `Gallery.images: string[]` contract as a derived compatibility view over the same ordered `GalleryItem` records; a single database record remains the source of truth. The Siger gallery never invents captions or uses a filename as alt text.

## Responsive composition

Mobile widths from 360 to 430 px are the primary canvas: one text column, a readable portrait, sticky-safe controls, no ornament over names or actions, and no horizontal overflow. The opening cover uses a centered portrait and seal, with decoration occupying its own peripheral layer. After opening, sections share a continuous ivory/green visual rhythm; edges and textures cross section boundaries without obvious rectangular image seams.

At desktop widths, keep the reading column around 640–760 px and use side fields for large but low-contrast ornamental layers. Do not scale mobile cards to the full viewport. The theme needs explicit layouts at approximately 360, 390–430, 768, 1280, and 1440 px.

## Guest flow and sections

1. **Opening cover:** couple names, guest addressee when provided, date, portrait, and a clearly labeled button to open the invitation. The cover works without motion.
2. **Hero:** names, date, short introduction, and a quiet transition from seal/paper to the main story.
3. **Couple and greeting:** two partner profiles, parent names where supplied, editable greeting/prayer, and optional social links. Empty optional text must not leave a blank decorative panel.
4. **Events and location:** ceremony/reception cards with full date, time, address, map link, and countdown if present. Information remains selectable text.
5. **Story:** ordered chapters when enabled; the layout supports both a short and a long account.
6. **Gallery:** owner-supplied media with aspect-ratio-safe crops, captions/alt text, and lazy loading. Guest-uploaded private gallery is a separate future extension and is never shown here.
7. **Gifts:** optional accounts with clear labels and copy actions only where supported.
8. **RSVP and wishes:** preserve the existing Firestore-backed behavior and its loading, empty, error, and success states.
9. **Closing:** a concise thank-you and the couple names, without a false completion animation that hides content.

Sections follow the current invitation data contract when possible. Missing optional sections disappear cleanly. Their order is fixed for the first release; an admin section-order editor is outside this template stage.

## Motion system

The perceived 3D depth comes from two or three independent layers at a time: paper cover, embossed siger contour, portrait mat, and textile/floral details. Scroll progress may rotate or translate layers within a small range and reveal the next section through perspective and occlusion. Each section gets a distinct transition tied to its content: cover unfolding, profile cards separating, event card depth, gallery stack, and closing seal. The user always controls scroll; there is no scroll-jacking, long pinned sequence, or motion that delays a button.

Use `transform` and `opacity` on isolated layers, observe only sections near the viewport, and release animation work when they leave it. No WebGL or large 3D runtime is required for the initial design. On `prefers-reduced-motion: reduce`, render the final layout directly with all information and actions available; controls should not depend on animation completion. Keyboard focus and screen-reader reading order must follow the document, not the visual layer order. The motion approach follows [WCAG guidance on animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions) and [web.dev's animation performance guidance](https://web.dev/articles/animations-guide).

## Theme and application boundaries

- Add a distinct `siger-priangan` theme identifier, route, configuration, and component family. The first release has one valid variant key, `ivory`, and a preview route `/wedding/siger-priangan/ivory`. Define invitation metadata as a discriminated theme/variant union: Classic Rose accepts its six current keys; Siger Priangan accepts only `ivory`. Validate this pair in both the mapper and admin draft before rendering or publishing. Do not insert Siger-specific branches throughout Classic Rose components.
- The public `/{slug}` route must dispatch by the invitation's stored theme; unknown themes or invalid variants fail safely. Preview uses explicit sample content and never substitutes for an unknown customer slug.
- Keep server data loading and authorization boundaries outside client motion components. Reuse existing domain data and Firestore adapters; extend types and mapping only where the new template genuinely needs a field.
- Any new sample invitation must be clearly marked as illustrative. Its RSVP and wishes presentation is read-only with a visible preview explanation; do not mount the writable Firestore adapter or send submissions from a sample preview. Do not modify the four production invitation records to demonstrate the theme.
- Premium availability and pricing are separate product decisions. This design does not change the current Kabar/Cerita/Istimewa offer, silently include the new theme in a package, or activate checkout.

## Artwork and delivery

The graphic designer creates an original, reviewable asset board before implementation: siger contour, textile motif, restrained floral elements, paper/metal texture, cover composition, and section transition frames. Validate shape and labels culturally before generating or publishing final art. Any AI-generated raster asset must be inspected for malformed bridal attributes, invented script, and accidental third-party marks. Keep decorative elements separate from text and buttons so they can crop and move responsively.

Prepare raster assets in WebP/AVIF-sized derivatives appropriate to their actual rendered dimensions; prefer CSS/SVG for small repeatable geometry. Store approved runtime artwork in Cloudinary with content-addressed IDs and a verified URL manifest, following the Classic Rose precedent. Use width-specific delivery and lazy loading below the opening view. A small seamless background tile may load directly. No Cloudinary upload is part of writing this specification.

## Implementation slices and review gates

1. **Visual proof:** original asset board plus mobile and desktop static compositions, with practitioner review notes. No production data or route changes.
2. **Theme foundation:** typed theme/variant dispatch, optional greeting/prayer and caption/alt data mapping, admin draft fields, preview route/sample data, layout, and responsive CSS. Classic Rose regression tests must pass. The additive schema work must pass its own reviewed database stage before theme publication.
3. **Motion and media:** section-scoped 3D transforms, reduced-motion fallback, optimized and verified Cloudinary assets.
4. **Integration:** server-rendered public theme dispatch, valid preview links, Firestore interaction reuse, and landing theme listing only after the template is ready.

At each slice, review 360/390/430/768/1280/1440 px, keyboard access, reduced motion, image payload, no horizontal overflow, and normal scrolling. The final gate includes typecheck, lint, focused tests, production build, route smoke tests, and a visual comparison of all sections. Production Cloudinary uploads, if needed, are reported with exact asset IDs and verified independently. Neon migrations and customer invitation updates require separate, exact authorization.

## Non-goals

No customer self-service editor, payment/checkout integration, guest photo extension, QR check-in, new Firestore collection, arbitrary drag-and-drop section ordering, or replacement of Classic Rose. No unvalidated ceremonial language, copied artisan pattern, or religious default is included.

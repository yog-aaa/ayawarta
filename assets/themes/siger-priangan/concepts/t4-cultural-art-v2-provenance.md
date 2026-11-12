# T4 modular cultural art v2 — source and review notes

**Status:** two original source concepts for owner review. They are not published runtime assets, reproductions of a ceremonial object, or evidence of cultural authenticity. Existing T1/T4 studies remain untouched.

## Selected assets

| Asset | Source dimensions | Source bytes | Alpha inspection | Intended integration |
| --- | ---: | ---: | --- | --- |
| `margin-motif-t4-v2.png` | 1024 × 1536 | 942,850 | RGBA; 92.64% pixels fully transparent; marks with alpha > 10 at x 41–154 | Crop to a narrow side strip; place outside text and controls. Its three diamond clusters and paper edge are intentionally non-tileable. |
| `cover-contour-t4-v2.png` | 2172 × 724 | 237,913 | RGBA; 95.44% pixels fully transparent; marks with alpha > 10 at x 155–2016, y 205–487 | Crop as a shallow horizontal overlay above the independently supplied portrait. Position against the actual photo slot; the generated marks extend farther down than the prompt's intended top band. |

Both were visually inspected over the approved ivory `#F6F1E8` background. The margin strip is deliberately pale with separated diagonal/diamond clusters and two tiny sprigs. The cover contour is an open, low relief sweep with one diamond accent. Neither should be enlarged as a full-page background. Root/frontend will determine optimized derivatives and integration after owner review.

## Provenance and cultural boundary

- Created with the built-in `image_gen` tool on 12 November 2026. `margin-motif-t4-v2.png` was generated from text. `cover-contour-t4-v2.png` used that **project-made** margin asset only as a material and line-weight reference. No external image or specific artisan pattern was passed to the tool.
- The approved [Siger Priangan design specification](../../../../docs/superpowers/specs/2026-10-29-siger-priangan-premium-template-design.md) cites [Garut government's description of Batik Garutan](https://www.garutkab.go.id/page/batik-tulis-garutan) for diagonal/diamond and flora direction, and [Kemdikdasmen's Sunda siger material](https://repositori.kemendikdasmen.go.id/16254/) for bridal context. These sources do not validate this artwork as an exact motif or headpiece.
- The diamond units and embossed cover sweep are original abstractions. Do not label the contour a historically accurate siger or assign a symbolic meaning to the diamonds. A Priangan bridal stylist and Garutan textile practitioner should review the shape, placement above the portrait, and margin pairing before a cultural claim or publication.
- No text, people, owner photography, exact ceremonial artifact, logos, or controls are baked into either image.

## Exact prompts

### `margin-motif-t4-v2.png`

```text
Use case: stylized-concept
Asset type: original isolated vertical margin ornament for a modern Priangan wedding invitation, source artwork for later responsive integration.
Primary request: design a refined, slim margin rhythm inspired only by the documented diagonal and diamond geometry of Batik Garutan. Three small open diamond clusters spaced far apart connect through very fine diagonal strokes, with two tiny botanical sprigs as quiet secondary details. Add a faint tactile cotton-paper embossed edge on the extreme left. Keep the composition architectural and precise, with visible hand-crafted paper relief rather than ornate floral decoration. This is an original abstraction, not a copied batik motif.
Scene/backdrop: genuinely transparent alpha background; isolated ornament only, no rectangular paper panel, wall, gradient, opaque color field, vignette, or cast-shadow cloud.
Style/medium: premium contemporary Indonesian wedding stationery, blind emboss in warm ivory with tiny controlled antique-gold glints, elegant linework, natural paper fibers.
Composition/framing: tall portrait canvas; all visible marks confined to the leftmost 15% of width. A slender vertical composition with generous gaps between the three clusters and completely transparent center and right 85%. Ends naturally taper so it can be cropped in mobile gutters or desktop side fields. Do not enclose page content.
Color palette: warm ivory #F6F1E8, parchment #D8CCBB, whisper of antique gold #B58B53. No dark masses.
Constraints: no words, numerals, Sundanese script, logos, watermarks, people, faces, photo, crown, siger contour, ceremonial headpiece, literal cloth photograph, copied artisan motif, large flowers, dense foliage, metallic jewelry, UI or controls. No claim of cultural authenticity.
```

### `cover-contour-t4-v2.png`

```text
Use case: stylized-concept
Asset type: one NEW isolated cover ornament for a modern Priangan wedding invitation, separate from portrait, names, and controls.
Input images: Image 1 is an original project-made margin motif used ONLY as material/color/line-weight reference; do not extend its vertical composition or copy its exact clusters.
Primary request: create a refined horizontal embossed paper contour for the top edge of a circular portrait area. Use a low, open central uplift flanked by two gently outward-sweeping layered lines, with one very small open diamond accent above the center to visually relate to the margin motif. The contour should read as a quiet original stationery relief with a suggested three-part silhouette, not a literal bridal headpiece or crown. Keep the linework restrained and precise.
Scene/backdrop: genuinely transparent alpha. No paper sheet, opaque rectangle, vignette, gradient, studio floor, cast-shadow cloud, or visible canvas.
Style/medium: tactile warm ivory cotton-paper blind emboss with only hairline antique-gold catchlights; match the clean delicate material treatment in Image 1.
Composition/framing: wide horizontal canvas, all visible marks in the central top band; the lower 60% and the whole central portrait circle remain transparent. The contour is open-ended, never closes around the portrait. Reserve broad side margins for responsive cropping.
Color palette: warm ivory #F6F1E8, parchment #D8CCBB, very sparse antique gold #B58B53.
Constraints: no words, numerals, script, logos, watermark, people, faces, photo, jewelry, gems, tiara, fantasy crown, sharp tower/roof peak, mosque or temple arch, heraldic badge, copied ceremonial object, detailed floral vines, ornate filigree, UI elements. This is an abstract study for subsequent Priangan practitioner review, with no claim that the shape is an authentic siger.
```

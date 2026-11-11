# Siger Priangan T4 paper-edge layer study

**Status:** original, unreviewed concept only. `paper-edge-layer-t4-study.png` is not a runtime asset, a complete page background, or a culturally validated motif.

## Intent and usage hypothesis

The old `ornament-layer-study.png` is dense and dark. This study isolates a much lighter cotton-paper relief, two tiny botanical marks, and an open diagonal/diamond line rhythm at one perimeter. Keep names, portraits, event information, and controls as independent DOM layers. The layer can sit behind a side gutter and crop at the section edge. Do not stretch the full 1024 px transparent canvas across a viewport or use it as a baked full-page background. If a mirrored right side is desired, first inspect the flipped botanical forms and paper lighting; independent CSS/SVG geometry is preferable for repetition.

## Technical inspection

- PNG source: 1024 × 1536 px, RGBA, 1,026,613 bytes.
- Alpha: 90.9% fully transparent pixels; no fully opaque pixels. Visible content above alpha 10 falls within x = 0–157 px, the leftmost 15.4% of the canvas.
- Potential rendered crops, **estimates only**: crop source to x = 0–169 px with transparent bleed, then produce a mobile 72 × 651 WebP at quality 75 (about 10 KB) or a desktop 144 × 1301 WebP at quality 75 (about 33 KB). These figures are local Pillow encoding measurements, not a measured browser payload or an approved budget. Recheck edge quality and Cloudinary transform output after any cultural/art review.
- Avoid tiling the whole image: paper fold and two sprigs are intentionally nonrepeating. Use a single cropped accent per section or create a dedicated original repeatable geometric unit in CSS/SVG.

## Provenance and review

Generated with Codex's built-in `image_gen` on 12 November 2026. No third-party image was supplied or traced. The prior T1 board was inspected as direction, but no image file was passed as an edit reference. The diagonal/diamond language is an original abstraction informed by [Garut government documentation of Batik Garutan](https://www.garutkab.go.id/page/batik-tulis-garutan). This does not identify a particular batik motif, grant craft reproduction rights, or certify cultural authenticity. A Priangan/Garutan practitioner should review the geometry and whether pairing it with botanical relief is appropriate before publication. There is deliberately no siger or ceremonial headpiece contour in this study.

## Exact final prompt

```text
Use case: stylized-concept
Asset type: one original transparent decorative artwork study for the Siger Priangan digital wedding invitation; source artwork only, not a finished screen or runtime asset.
Primary request: create an exceptionally restrained, separable vertical paper-edge ornament layer. A narrow strip of tactile warm ivory cotton paper relief follows the extreme left perimeter, with a few fine diagonal and open diamond-shaped lines and only two tiny abstract botanical sprigs. The line rhythm is an original design interpretation informed by documented Garutan geometric diagonal and diamond characteristics, not a copied artisan motif. A small pale embossed paper fold near the bottom gives shallow depth.
Scene/backdrop: genuinely transparent background with clean alpha, no wall, table, studio shadow, opaque rectangle, vignette, or color fill.
Style/medium: premium editorial stationery detail, elegant blind emboss and almost invisible antique-gold foil glints, realistic paper fibers. Precise, airy, low contrast.
Composition/framing: tall portrait canvas. Occupy only the outermost 12–18% of the left side; leave the remaining 82–88% completely transparent. Keep top and bottom naturally tapering so the layer can be cropped or placed in mobile side gutters and desktop side fields. No border enclosing the content.
Lighting/mood: soft diffuse daylight, quiet tactile depth, no dramatic shadows.
Color palette: warm ivory #F6F1E8, delicate parchment #D8CCBB, a whisper of antique gold #B58B53; no dark green masses.
Constraints: no text, letters, numbers, script, symbols with claimed ceremonial meaning, logos, watermarks, people, faces, crowns, siger contour, literal bridal objects, photographs, framed portrait, UI, buttons, copied batik pattern, large flowers, dense foliage. The image is a provisional art-direction study pending practitioner review. Preserve genuinely transparent center and right side.
```

# Siger Priangan T4 cover contour study

**Status:** provisional original artwork concept. `cover-contour-t4-study.png` is an isolated embossed-paper layer, not a historically exact siger, approved cultural motif, or runtime asset. The portrait, names, and open button remain independent DOM content.

## Selection and visual review

I rejected an earlier generated draft without saving it to the workspace: its acute center peak and rough relief read too much like a generic crown or roof. The selected image uses three separate shallow waves with no closed arch, jewelry, face, text, or photograph. The antique-gold edge is deliberately faint. Inspect against the actual ivory cover at mobile size before any use; the final contour may need to be artist-drawn after practitioner feedback.

## Technical inspection

- Selected PNG: 1536 × 1024 px, RGBA, 805,080 bytes.
- Alpha: 96.13% fully transparent pixels. Content with alpha greater than 10 is confined to x = 211–1307, y = 196–392. The lower 60% has no visually meaningful alpha (maximum alpha 1 after row 410), leaving a clear portrait/text safe region.
- Crop hypothesis: x = 190–1329, y = 175–419. A local exploratory WebP encoding at quality 75 measured approximately 5.8 KB for 280 × 60 px and 11.2 KB for 480 × 103 px. These are encoding estimates, not an approved runtime asset or measured network payload. Preserve the original outside `public` until cultural and visual review.
- This is a one-off cover accent. It should not be tiled or enlarged to fill the whole page.

## Provenance and practitioner review

Generated on 12 November 2026 with Codex built-in `image_gen` from text only. No third-party image, artisan pattern, or headpiece photograph was supplied. The [Kemdikdasmen Sunda siger reference](https://repositori.kemendikdasmen.go.id/16254/) supports the bridal context in the approved board; it does **not** validate this contour's shape or authorize an authenticity claim.

Questions for a Priangan bridal stylist or cultural practitioner:

1. Does the abstract three-line contour feel respectful in a Sunda wedding context, or is it too generic to associate with siger?
2. Would positioning it above a real couple portrait imply a specific bridal attribute inaccurately?
3. Are the shallow raised center, outward sweeps, and restrained gold edge appropriate, or should any part be removed before publication?

## Exact selected prompt

```text
Use case: stylized-concept
Asset type: isolated cover-portrait ornament study for modern Priangan wedding stationery, never a historical or ceremonial reconstruction.
Primary request: make THREE SEPARATE shallow embossed ivory paper strokes, centered horizontally above a future circular portrait. Each stroke is a long soft flowing shallow wave, like an elegant hand-cut paper contour: the lowest widest, the middle shorter, the top shortest. Let their midpoints rise only gently, forming no acute peak. Endpoints taper into transparency. Keep generous space between strokes so each is visibly independent. Add no symbols or objects.
Scene/backdrop: truly transparent alpha background. Only the three clean curved embossed strokes are visible; no paper sheet, wall, vignette, cast shadow field, speckled cloud, halo, or rectangular fill.
Style/medium: minimal blind emboss on warm cotton paper, almost invisible antique gold along one edge, precise clean tactile linework, premium understated stationery.
Composition/framing: horizontal 1536x1024-style canvas; strokes occupy an upper central band (roughly 15% to 35% of height), with a vast completely transparent lower 60% for a separate real portrait, name, and control. Overall line width about 60% of canvas width. No enclosing oval, arch, frame, closed loop, or element entering the portrait safe area.
Color palette: ivory #F6F1E8, parchment relief #D8CCBB, tiny glint of antique gold #B58B53.
Constraints: no text, script, people, faces, photo, jewelry, gems, floral vines, diamonds, crown, tiara, bridal headpiece, literal siger, mosque/temple roof, throne, heraldry, ornate filigree, logos, watermark, copied artisan motifs. No culturally authoritative claim. The lines are an abstract concept to review with a Priangan bridal practitioner, not a depiction of a real object. Preserve smooth clean alpha edges.
```

# Siger Priangan T4 browser QA — 12 November 2026

## Scope

Read-only inspection of the illustrative local route `/wedding/siger-priangan/ivory` on port 3000. This check covers keyboard entry, responsive width, and a live Windows reduced-motion preference. It does not approve cultural artwork or complete the T4 media gate.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Keyboard entry | Pass | `Tab` focused “Buka Undangan” with a visible solid outline. `Enter` followed its `#siger-content` anchor. |
| Responsive width | Pass | At browser widths 360, 390, 430, 768, 1280, and 1440 px, the document had no horizontal overflow. The cover/reading sheet stayed within the viewport. |
| Live reduced motion | Pass | Windows **Accessibility → Visual effects → Animation effects** was temporarily switched from On to Off. The browser then reported `prefers-reduced-motion: reduce`; the cover relief and section fold reported `animation-name: none`, document scroll behavior was `auto`, and the inspected couple section remained visible at opacity 1. Eight sections and their headings remained in the document. |
| Preference restored | Pass | Animation effects was switched back to On. The browser again reported `prefers-reduced-motion: reduce` as false and scroll behavior as `smooth`. |
| Current page assets | Informational | The observed local sample loaded no invitation images; the asset inventory listed a favicon, fonts, scripts, and stylesheets. This is not a byte-size or network-speed measurement. |

## Open T4 gates

- Cross-browser behavior and a midrange/CPU-throttled mobile smoothness check are still unverified.
- The concept art awaits a Priangan practitioner review. No Siger raster was added to runtime or uploaded to Cloudinary; the approved-art manifest, byte limits, and delivery check remain open.
- This browser pass does not authorize Siger publication, a production data write, or T5 theme-list activation.

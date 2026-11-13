# Siger Priangan release check — 13 November 2026

**Scope:** local source and illustrative preview at `/wedding/siger-priangan/ivory`, based on commit `784eeed`. This check does not activate a customer invitation or approve a cultural claim.

## Verification completed

| Check | Result |
| --- | --- |
| Pinned dependency install | `pnpm 10.34.7 install --frozen-lockfile` passed against the existing v10 store; lockfile was already current. |
| TypeScript and full ESLint | Passed using the repository's installed binaries. |
| Hermetic tests | 73 files passed, four skipped; 900 tests passed with a loopback-only `127.0.0.1/ayawarta` URL. The focused Siger motion and sample-media tests passed after test-contract maintenance. |
| Next.js production build | Passed with loopback/dummy service variables and network access for the existing Google Fonts. The `baseline-browser-mapping` age warning remains. |
| Browser sample, 390 px | Reload showed only the closed cover; **Buka Undangan** opened the document, moved focus to `#siger-content`, and left no horizontal overflow. The photo chapter loaded; later gallery photos remained lazy until needed. |
| Browser sample, 1280 px | Cover, open action, and closing chapters rendered without horizontal overflow. The read-only RSVP/wishes notice remained visible. |
| Runtime media budget | Five distinct illustrative WebPs total 222,920 bytes; largest dimension 1100 px. Two self-contained SVG scene assets remain below 5 KB each. The new test enforces these bounds. |

The earlier motion test assumed every keyframe used only `transform`/`opacity`. The current approved sequence also animates `clip-path` on the photo aperture and event veil; the test now restricts that exception to those two keyframes. The album shutter is an animated `::after` decoration, not an animated photo element. These exceptions merit the low-power check below.

## Runtime asset decision

The current approved visual uses CSS and the two lightweight SVGs for paper/ornament geometry. No PNG concept is loaded by the invitation, and no Siger-specific raster ornament needs a Cloudinary upload for this version. The five fictional preview photos stay local so the sample works without customer data. Real invitation photos must continue through verified, invitation-owned Cloudinary media; the preview files are never a fallback for a customer slug. If cultural review calls for a raster ornament, prepare responsive WebP derivatives, a versioned manifest, and an exact upload review before serving it.

## Remaining release gates

1. A Priangan bridal/cultural practitioner must review the rendered cover contour, margin rhythm, product name, and source concepts using the [review packet](../design/siger-priangan-cultural-review.md). Internal visual inspection does not establish cultural authenticity.
2. Check the final motion on a midrange/low-power phone, including scroll reversal and the two animated clipping regions. Repeat live reduced-motion and keyboard checks after the last motion revision; the previous live pass predates it.
3. Check another browser engine or supported target browser. This run inspected the in-app Chromium browser only.
4. Complete the separate Production activation decision using the [preparation runbook](../runbooks/siger-priangan-production-activation.md). The current Siger admin publication gate remains limited to the disposable local fixture.

No Neon, Cloudinary, Vercel, customer-content, or Git write was made by this verification.

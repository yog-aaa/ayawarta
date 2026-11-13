# Siger Priangan: Production activation preparation

**Status:** preparation only, 13 November 2026. Do not run a customer conversion or set a Production Siger switch from this document. The current `AYAWARTA_SIGER_PUBLISH` gate accepts only the disposable local `127.0.0.1/ayawarta_siger` fixture; setting it on Vercel Production does not authorize or enable publishing.

## Required evidence before a cutover proposal

1. Record the Priangan practitioner decision for the rendered cover, margin rhythm, product name, and source concepts in the [cultural packet](../design/siger-priangan-cultural-review.md). The reviewer must identify each approved, revised, or rejected element. Do not market the current abstraction as an authenticated siger.
2. Close the [release-check gaps](../reviews/siger-priangan-release-check-2026-11-13.md): low-power mobile scroll, scroll reversal, current reduced-motion and keyboard behavior, another supported browser, and all visible images. Confirm the theme remains readable if scroll timelines are unavailable.
3. Keep current CSS/SVG ornaments and the fictional local preview photos as the default media decision. Real customer photos must be verified Cloudinary assets owned by the exact invitation. If approved raster artwork is later required, review its optimized derivatives, content-addressed IDs, versioned manifest, responsive widths, and exact upload targets before any Cloudinary write.
4. Exercise the current T5 disposable database fixture and public route regression tests against both themes. Prepare a separate code change for a Production publication gate; the local-only gate must not be weakened by configuration alone.
5. Review the exact target fingerprint before any database operation. The last approved Neon target was `ep-mute-water-azaf9oyl:ayawarta:neondb_owner`; verify that it is still current. Capture a restorable Neon snapshot and record its UTC time. Verify the existing published aggregate and publication snapshot of the invitation to be converted.

## Controlled activation proposal

- Deploy the reviewed Production gate code with Siger publication disabled. Smoke test existing Classic Rose pages, unknown-slug 404, the illustrative Siger preview, admin lists, and private draft preview.
- Prepare one private Siger draft with the exact customer-owned Cloudinary photos. Save and preview it without changing the public invitation. Review names, long text, event details, gallery alt text/captions, optional greeting/prayer, and section visibility.
- Obtain a separate owner approval naming the invitation slug, prior published theme/version, new draft version, exact media IDs, deployment, Neon snapshot, and rollback action. Publish through the authenticated editor's confirmation flow, then verify public `/{slug}` and `/{slug}/invite` as well as the immutable publication snapshot and media pins.
- For an existing Classic Rose invitation, recovery republishes its previous complete snapshot through a reviewed path, including the original theme/variant/content/media references. A Siger-only invitation has no Classic Rose snapshot; choose and implement its disable/archive behavior before allowing its first Production publication. A theme-key flip is not a valid rollback.
- Keep the package/pricing offer unchanged. Enable Siger sales only after a separate product decision.

This runbook contains no migration, upload, deployment, or customer-content command. Each consequential Production operation requires its own exact reviewed cutover and evidence.

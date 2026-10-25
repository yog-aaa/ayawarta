# Cloudinary media management

## Current state

The completed migration placed 31 physical assets in Cloudinary cloud `uhwi7xvb`: 27 images and four audio files, including one explicit hero and one audio asset for each of `rika-fauzi`, `shidqi-mita`, `dudi-aini`, and `default-preview`. The repository no longer contains the 12 legacy dynamic images or the hard-coded invitation modules. Static theme and payment artwork remains in `public/images/`.

The Git-tracked [canonical catalog](../src/features/media/canonical-catalog.ts) is the portable seed input. Each record binds a slug, category, folder, public ID, format, resource type, metadata, and HTTPS delivery URL. The optional gallery video URL is invitation content in PostgreSQL, not a Cloudinary asset. Cloudinary audio uses provider resource type `video` and domain resource type `AUDIO`.

## Naming and validation

Public IDs follow `ayawarta/production/invitations/{slug}/{category}/{item}`, with `couple`, `gallery`, and `audio` categories. A target URL must bind to its exact public ID, expected cloud, upload resource type, version, and extension. Seed validation rejects a missing hero, partner photo, gallery image, audio resource, or inconsistent category.

## Operational checks

- `pnpm test src/features/media/canonical-catalog.test.ts` validates the portable catalog without external files or network access.
- `pnpm media:verify-upload` checks the local Stage 5B upload report's schema, counts, public ID uniqueness, required hero/audio IDs, URL shape, and summary consistency **offline**. It requires the ignored `.media-migration/cloudinary-upload-report.json` artifact. This command does not check its pinned SHA-256, compare every asset with the canonical catalog, or contact Cloudinary to confirm current live state.
- `pnpm media:verify-audio` validates the three operator MP3 inputs when `.media-migration/input/audio/` is available.
- `pnpm exec vitest run --config vitest.integration.config.mts src/features/media/canonical-provenance.integration.test.ts` is the fail-closed provenance check. It verifies the report's pinned SHA-256 and 1:1 metadata against the canonical catalog and guarded local PostgreSQL. It requires the accepted report and seeded local database; it also runs as part of the full `pnpm test:db` suite (which requires running the preflight database target check first, as other integration tests connect directly to `DATABASE_URL` without internal guards). The historical Stage 5B streaming identity audit supplied live content evidence at migration time; none of these offline commands establish current live Cloudinary content identity.

The historical `media:dry-run`, `media:migrate`, `media:verify`, and `media:audit-identity` package scripts were retired after migration. Their source files remain as historical tooling. They require removed legacy sources and must not be used as routine upload commands.

## Future uploads and safe reruns

There is no finished administrator upload screen or supported operational upload CLI. A new media workflow requires its own reviewed stage. It should validate the image signature and decoded dimensions, enforce byte and pixel limits, prepare an oversized JPEG with the server-only Sharp utility, upload under a deterministic public ID, read back metadata, verify delivery identity, update the canonical catalog or a reviewed successor, and only then update Prisma relations. The current image preparation primitive rejects oversized PNG and WebP inputs until format-specific recompression exists.

Never overwrite a conflicting public ID merely to make a retry pass. A safe rerun first checks existing metadata and content identity; verified existing assets can be reused. A mismatch must stop for review. Keep Cloudinary API credentials on the server, do not expose them in logs, and do not delete resources from the old account. The [historical migration runbook](media-migration.md) records the completed one-time process and cleanup gates.

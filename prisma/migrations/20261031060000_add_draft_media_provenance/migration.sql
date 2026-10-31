CREATE TYPE "DraftMediaState" AS ENUM ('RESERVED', 'VERIFIED');

CREATE TABLE "DraftMediaProvision" (
  "id" TEXT NOT NULL,
  "draftId" TEXT NOT NULL,
  "slot" TEXT NOT NULL,
  "idempotencyKey" VARCHAR(36) NOT NULL,
  "preparedSha256" CHAR(64) NOT NULL,
  "publicId" TEXT NOT NULL,
  "format" VARCHAR(16) NOT NULL,
  "bytes" INTEGER NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "state" "DraftMediaState" NOT NULL DEFAULT 'RESERVED',
  "cloudinaryAssetId" TEXT,
  "mediaAssetId" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  CONSTRAINT "DraftMediaProvision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DraftMediaProvision_prepared_check" CHECK (
    "preparedSha256" ~ '^[0-9a-f]{64}$' AND
    "idempotencyKey" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND
    "slot" ~ '^(cover|groom|bride|gallery:[A-Za-z0-9_-]{1,80})$' AND
    "format" IN ('webp', 'jpg', 'jpeg', 'png') AND
    "bytes" > 0 AND "width" > 0 AND "height" > 0
  ),
  CONSTRAINT "DraftMediaProvision_publicId_check" CHECK (
    "publicId" = 'ayawarta/production/invitations/draft-' || "draftId" ||
      '/images/' || "id" || '-' || LEFT("preparedSha256", 16)
  ),
  CONSTRAINT "DraftMediaProvision_state_check" CHECK (
    ("state" = 'RESERVED' AND "cloudinaryAssetId" IS NULL AND
      "mediaAssetId" IS NULL AND "verifiedAt" IS NULL) OR
    ("state" = 'VERIFIED' AND NULLIF("cloudinaryAssetId", '') IS NOT NULL AND
      "mediaAssetId" IS NOT NULL AND "verifiedAt" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "DraftMediaProvision_draftId_idempotencyKey_key"
  ON "DraftMediaProvision"("draftId", "idempotencyKey");
CREATE UNIQUE INDEX "DraftMediaProvision_publicId_key" ON "DraftMediaProvision"("publicId");
CREATE UNIQUE INDEX "DraftMediaProvision_cloudinaryAssetId_key" ON "DraftMediaProvision"("cloudinaryAssetId");
CREATE UNIQUE INDEX "DraftMediaProvision_mediaAssetId_key" ON "DraftMediaProvision"("mediaAssetId");
CREATE INDEX "DraftMediaProvision_draftId_state_idx" ON "DraftMediaProvision"("draftId", "state");
CREATE INDEX "DraftMediaProvision_createdById_idx" ON "DraftMediaProvision"("createdById");

ALTER TABLE "DraftMediaProvision" ADD CONSTRAINT "DraftMediaProvision_draftId_fkey"
  FOREIGN KEY ("draftId") REFERENCES "InvitationDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DraftMediaProvision" ADD CONSTRAINT "DraftMediaProvision_mediaAssetId_fkey"
  FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DraftMediaProvision" ADD CONSTRAINT "DraftMediaProvision_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Ownership, bytes, slot, and Cloudinary identity are write-once. A reserved
-- upload may advance only once after readback and MediaAsset persistence.
CREATE FUNCTION "guard_draft_media_provision_mutation"() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Draft media provenance cannot be deleted automatically';
  END IF;
  IF OLD."state" <> 'RESERVED' OR NEW."state" <> 'VERIFIED' OR
     OLD."id" IS DISTINCT FROM NEW."id" OR
     OLD."draftId" IS DISTINCT FROM NEW."draftId" OR
     OLD."slot" IS DISTINCT FROM NEW."slot" OR
     OLD."idempotencyKey" IS DISTINCT FROM NEW."idempotencyKey" OR
     OLD."preparedSha256" IS DISTINCT FROM NEW."preparedSha256" OR
     OLD."publicId" IS DISTINCT FROM NEW."publicId" OR
     OLD."format" IS DISTINCT FROM NEW."format" OR
     OLD."bytes" IS DISTINCT FROM NEW."bytes" OR
     OLD."width" IS DISTINCT FROM NEW."width" OR
     OLD."height" IS DISTINCT FROM NEW."height" OR
     OLD."createdById" IS DISTINCT FROM NEW."createdById" OR
     OLD."createdAt" IS DISTINCT FROM NEW."createdAt" THEN
    RAISE EXCEPTION 'Draft media provenance is immutable after reservation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "DraftMediaProvision_guard"
  BEFORE UPDATE OR DELETE ON "DraftMediaProvision"
  FOR EACH ROW EXECUTE FUNCTION "guard_draft_media_provision_mutation"();

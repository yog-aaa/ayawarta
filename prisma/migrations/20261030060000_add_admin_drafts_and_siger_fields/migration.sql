-- Add only nullable invitation content and a safe publication version for legacy rows.
ALTER TABLE "Invitation"
  ADD COLUMN "greeting" TEXT,
  ADD COLUMN "prayer" TEXT,
  ADD COLUMN "publishedVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_publishedVersion_check"
  CHECK ("publishedVersion" > 0);

ALTER TABLE "GalleryItem" ADD COLUMN "caption" TEXT;

CREATE TYPE "PublicationSource" AS ENUM ('BASELINE', 'PUBLISH');

CREATE TABLE "InvitationDraft" (
  "id" TEXT NOT NULL,
  "invitationId" TEXT,
  "proposedSlug" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "draftVersion" INTEGER NOT NULL DEFAULT 1,
  "basePublishedVersion" INTEGER,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InvitationDraft_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InvitationDraft_version_check" CHECK (
    "schemaVersion" > 0 AND "draftVersion" > 0 AND
    (("invitationId" IS NULL AND "basePublishedVersion" IS NULL) OR
     ("invitationId" IS NOT NULL AND "basePublishedVersion" > 0))
  )
);

CREATE TABLE "InvitationPublication" (
  "id" TEXT NOT NULL,
  "invitationId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "source" "PublicationSource" NOT NULL,
  "snapshot" JSONB NOT NULL,
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "contentDigest" CHAR(64) NOT NULL,
  "changeSummary" TEXT,
  "actorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InvitationPublication_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InvitationPublication_version_check" CHECK (
    "version" > 0 AND "schemaVersion" > 0 AND ("source" <> 'BASELINE' OR "version" = 1)
  ),
  CONSTRAINT "InvitationPublication_digest_check" CHECK ("contentDigest" ~ '^[0-9a-f]{64}$')
);

CREATE TABLE "InvitationPublicationMedia" (
  "publicationId" TEXT NOT NULL,
  "mediaAssetId" TEXT NOT NULL,
  CONSTRAINT "InvitationPublicationMedia_pkey" PRIMARY KEY ("publicationId", "mediaAssetId")
);

CREATE UNIQUE INDEX "InvitationDraft_invitationId_key" ON "InvitationDraft"("invitationId");
CREATE INDEX "InvitationDraft_proposedSlug_idx" ON "InvitationDraft"("proposedSlug");
CREATE INDEX "InvitationDraft_createdById_idx" ON "InvitationDraft"("createdById");
CREATE INDEX "InvitationDraft_updatedById_idx" ON "InvitationDraft"("updatedById");
CREATE UNIQUE INDEX "InvitationPublication_invitationId_version_key" ON "InvitationPublication"("invitationId", "version");
CREATE INDEX "InvitationPublication_actorId_idx" ON "InvitationPublication"("actorId");
CREATE INDEX "InvitationPublicationMedia_mediaAssetId_idx" ON "InvitationPublicationMedia"("mediaAssetId");

ALTER TABLE "InvitationDraft" ADD CONSTRAINT "InvitationDraft_invitationId_fkey"
  FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvitationDraft" ADD CONSTRAINT "InvitationDraft_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvitationDraft" ADD CONSTRAINT "InvitationDraft_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvitationPublication" ADD CONSTRAINT "InvitationPublication_invitationId_fkey"
  FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvitationPublication" ADD CONSTRAINT "InvitationPublication_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvitationPublicationMedia" ADD CONSTRAINT "InvitationPublicationMedia_publicationId_fkey"
  FOREIGN KEY ("publicationId") REFERENCES "InvitationPublication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvitationPublicationMedia" ADD CONSTRAINT "InvitationPublicationMedia_mediaAssetId_fkey"
  FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Publication history is append-only. Restores must create a new draft and publish a new version.
CREATE FUNCTION "reject_invitation_publication_mutation"() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Invitation publication history is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "InvitationPublication_immutable"
  BEFORE UPDATE OR DELETE ON "InvitationPublication"
  FOR EACH ROW EXECUTE FUNCTION "reject_invitation_publication_mutation"();

CREATE TRIGGER "InvitationPublicationMedia_immutable"
  BEFORE UPDATE OR DELETE ON "InvitationPublicationMedia"
  FOR EACH ROW EXECUTE FUNCTION "reject_invitation_publication_mutation"();

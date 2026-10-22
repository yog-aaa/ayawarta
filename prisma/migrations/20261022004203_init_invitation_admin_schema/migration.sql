-- CreateEnum
CREATE TYPE "PartnerRole" AS ENUM ('GROOM', 'BRIDE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "secureUrl" TEXT NOT NULL,
    "folder" TEXT NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "format" TEXT,
    "bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "originalName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'classic-rose',
    "variant" TEXT NOT NULL,
    "weddingDate" TIMESTAMP(3) NOT NULL,
    "musicAssetId" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvitationSections" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "couple" BOOLEAN NOT NULL DEFAULT true,
    "events" BOOLEAN NOT NULL DEFAULT true,
    "gallery" BOOLEAN NOT NULL DEFAULT true,
    "loveStory" BOOLEAN NOT NULL DEFAULT true,
    "gifts" BOOLEAN NOT NULL DEFAULT true,
    "wishes" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "InvitationSections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "role" "PartnerRole" NOT NULL,
    "name" TEXT NOT NULL,
    "parents" TEXT NOT NULL,
    "instagram" TEXT,
    "photoAssetId" TEXT NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayDate" TEXT NOT NULL,
    "displayTime" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL,
    "mapUrl" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryItem" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "altText" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "GalleryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoveStory" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "LoveStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftAccount" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "accountHolder" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "logoPath" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "GiftAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_publicId_key" ON "MediaAsset"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_slug_key" ON "Invitation"("slug");

-- CreateIndex
CREATE INDEX "Invitation_ownerId_idx" ON "Invitation"("ownerId");

-- CreateIndex
CREATE INDEX "Invitation_musicAssetId_idx" ON "Invitation"("musicAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "InvitationSections_invitationId_key" ON "InvitationSections"("invitationId");

-- CreateIndex
CREATE INDEX "Partner_photoAssetId_idx" ON "Partner"("photoAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_invitationId_role_key" ON "Partner"("invitationId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Event_invitationId_position_key" ON "Event"("invitationId", "position");

-- CreateIndex
CREATE INDEX "GalleryItem_assetId_idx" ON "GalleryItem"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "GalleryItem_invitationId_position_key" ON "GalleryItem"("invitationId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "LoveStory_invitationId_position_key" ON "LoveStory"("invitationId", "position");

-- CreateIndex
CREATE INDEX "GiftAccount_invitationId_position_idx" ON "GiftAccount"("invitationId", "position");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_musicAssetId_fkey" FOREIGN KEY ("musicAssetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationSections" ADD CONSTRAINT "InvitationSections_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_photoAssetId_fkey" FOREIGN KEY ("photoAssetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryItem" ADD CONSTRAINT "GalleryItem_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryItem" ADD CONSTRAINT "GalleryItem_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoveStory" ADD CONSTRAINT "LoveStory_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftAccount" ADD CONSTRAINT "GiftAccount_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

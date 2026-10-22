-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "heroAssetId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Invitation_heroAssetId_idx" ON "Invitation"("heroAssetId");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_heroAssetId_fkey" FOREIGN KEY ("heroAssetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropIndex
DROP INDEX "GiftAccount_invitationId_position_idx";

-- CreateIndex
CREATE UNIQUE INDEX "GiftAccount_invitationId_position_key" ON "GiftAccount"("invitationId", "position");

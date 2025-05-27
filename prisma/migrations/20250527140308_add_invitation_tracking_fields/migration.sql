/*
  Warnings:

  - Added the required column `invitedByUserId` to the `property_invitations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "property_invitations" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "invitedByUserId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "property_invitations_invitedByUserId_idx" ON "property_invitations"("invitedByUserId");

-- AddForeignKey
ALTER TABLE "property_invitations" ADD CONSTRAINT "property_invitations_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `created_at` on the `property_invitations` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `property_invitations` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `property_invitations` table without a default value. This is not possible if the table is not empty.
  - Made the column `expiresAt` on table `property_invitations` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "property_invitations" DROP CONSTRAINT "property_invitations_invitedByUserId_fkey";

-- DropIndex
DROP INDEX "property_invitations_invitedByUserId_idx";

-- AlterTable
ALTER TABLE "property_invitations" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "expiresAt" SET NOT NULL,
ALTER COLUMN "invitedByUserId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "property_invitations_invitationToken_idx" ON "property_invitations"("invitationToken");

-- AddForeignKey
ALTER TABLE "property_invitations" ADD CONSTRAINT "property_invitations_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

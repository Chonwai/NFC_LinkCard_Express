/*
  Warnings:

  - You are about to drop the column `linkspaceAffiliation` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the column `profileType` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the `property_invitations` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "property_invitations" DROP CONSTRAINT "property_invitations_acceptedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "property_invitations" DROP CONSTRAINT "property_invitations_invitedByUserId_fkey";

-- AlterTable
ALTER TABLE "profiles" DROP COLUMN "linkspaceAffiliation",
DROP COLUMN "profileType";

-- DropTable
DROP TABLE "property_invitations";

-- DropEnum
DROP TYPE "InvitationStatus";

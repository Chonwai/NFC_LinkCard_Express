/*
  Warnings:

  - You are about to drop the column `metadata` on the `AssociationAnalytics` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AssociationAnalytics" DROP COLUMN "metadata",
ADD COLUMN     "meta" JSONB;

-- AlterTable
ALTER TABLE "AssociationMember" ADD COLUMN     "meta" JSONB DEFAULT '{}';

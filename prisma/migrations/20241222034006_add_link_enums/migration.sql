/*
  Warnings:

  - The `platform` column on the `links` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "LinkPlatform" AS ENUM ('GITHUB', 'FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'WEBSITE', 'PHONE', 'EMAIL', 'LOCATION');

-- AlterTable
ALTER TABLE "links" DROP COLUMN "platform",
ADD COLUMN     "platform" "LinkPlatform";

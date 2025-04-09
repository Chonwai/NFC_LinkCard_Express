-- CreateEnum
CREATE TYPE "BadgeDisplayMode" AS ENUM ('HIDDEN', 'BADGE_ONLY', 'FULL');

-- AlterTable
ALTER TABLE "profile_badges" ADD COLUMN     "displayMode" "BadgeDisplayMode" NOT NULL DEFAULT 'FULL';

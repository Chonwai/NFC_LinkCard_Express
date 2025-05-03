-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LinkPlatform" ADD VALUE 'TELEGRAM';
ALTER TYPE "LinkPlatform" ADD VALUE 'WECHAT';
ALTER TYPE "LinkPlatform" ADD VALUE 'X';
ALTER TYPE "LinkPlatform" ADD VALUE 'YOUTUBE';

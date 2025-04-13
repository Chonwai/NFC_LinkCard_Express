/*
  Warnings:

  - You are about to drop the column `associationId` on the `profile_badges` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `profile_badges` table. All the data in the column will be lost.
  - You are about to drop the column `customColor` on the `profile_badges` table. All the data in the column will be lost.
  - You are about to drop the column `customLabel` on the `profile_badges` table. All the data in the column will be lost.
  - You are about to drop the column `customSize` on the `profile_badges` table. All the data in the column will be lost.
  - You are about to drop the column `displayMode` on the `profile_badges` table. All the data in the column will be lost.
  - You are about to drop the column `displayOrder` on the `profile_badges` table. All the data in the column will be lost.
  - You are about to drop the column `isVisible` on the `profile_badges` table. All the data in the column will be lost.
  - You are about to drop the column `profileId` on the `profile_badges` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `profile_badges` table. All the data in the column will be lost.
  - You are about to drop the `Association` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AssociationAnalytics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AssociationLead` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AssociationMember` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[profile_id,association_id]` on the table `profile_badges` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `association_id` to the `profile_badges` table without a default value. This is not possible if the table is not empty.
  - Added the required column `profile_id` to the `profile_badges` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `profile_badges` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Association" DROP CONSTRAINT "Association_userId_fkey";

-- DropForeignKey
ALTER TABLE "AssociationAnalytics" DROP CONSTRAINT "AssociationAnalytics_associationId_fkey";

-- DropForeignKey
ALTER TABLE "AssociationLead" DROP CONSTRAINT "AssociationLead_associationId_fkey";

-- DropForeignKey
ALTER TABLE "AssociationMember" DROP CONSTRAINT "AssociationMember_associationId_fkey";

-- DropForeignKey
ALTER TABLE "AssociationMember" DROP CONSTRAINT "AssociationMember_userId_fkey";

-- DropForeignKey
ALTER TABLE "profile_badges" DROP CONSTRAINT "profile_badges_associationId_fkey";

-- DropForeignKey
ALTER TABLE "profile_badges" DROP CONSTRAINT "profile_badges_profileId_fkey";

-- DropIndex
DROP INDEX "profile_badges_associationId_idx";

-- DropIndex
DROP INDEX "profile_badges_profileId_associationId_key";

-- DropIndex
DROP INDEX "profile_badges_profileId_idx";

-- AlterTable
ALTER TABLE "profile_badges" DROP COLUMN "associationId",
DROP COLUMN "createdAt",
DROP COLUMN "customColor",
DROP COLUMN "customLabel",
DROP COLUMN "customSize",
DROP COLUMN "displayMode",
DROP COLUMN "displayOrder",
DROP COLUMN "isVisible",
DROP COLUMN "profileId",
DROP COLUMN "updatedAt",
ADD COLUMN     "association_id" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "custom_color" TEXT,
ADD COLUMN     "custom_label" TEXT,
ADD COLUMN     "custom_size" TEXT,
ADD COLUMN     "display_mode" "BadgeDisplayMode" NOT NULL DEFAULT 'FULL',
ADD COLUMN     "display_order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "is_visible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "profile_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "Association";

-- DropTable
DROP TABLE "AssociationAnalytics";

-- DropTable
DROP TABLE "AssociationLead";

-- DropTable
DROP TABLE "AssociationMember";

-- CreateTable
CREATE TABLE "associations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "banner" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "social_links" JSONB,
    "customization" JSONB,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "badge_image" TEXT,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "associations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "association_members" (
    "id" TEXT NOT NULL,
    "association_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "membership_tier" "MembershipTier" NOT NULL DEFAULT 'BASIC',
    "membership_status" "MembershipStatus" NOT NULL DEFAULT 'PENDING',
    "display_in_directory" BOOLEAN NOT NULL DEFAULT true,
    "position" TEXT,
    "join_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "renewal_date" TIMESTAMP(3),
    "meta" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "association_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "association_leads" (
    "id" TEXT NOT NULL,
    "association_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "organization" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "association_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "association_analytics" (
    "id" TEXT NOT NULL,
    "association_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "association_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "associations_slug_key" ON "associations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "associations_user_id_key" ON "associations"("user_id");

-- CreateIndex
CREATE INDEX "associations_user_id_idx" ON "associations"("user_id");

-- CreateIndex
CREATE INDEX "association_members_association_id_idx" ON "association_members"("association_id");

-- CreateIndex
CREATE INDEX "association_members_user_id_idx" ON "association_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "association_members_association_id_user_id_key" ON "association_members"("association_id", "user_id");

-- CreateIndex
CREATE INDEX "association_leads_association_id_idx" ON "association_leads"("association_id");

-- CreateIndex
CREATE INDEX "association_leads_email_idx" ON "association_leads"("email");

-- CreateIndex
CREATE INDEX "association_analytics_association_id_idx" ON "association_analytics"("association_id");

-- CreateIndex
CREATE INDEX "association_analytics_event_type_idx" ON "association_analytics"("event_type");

-- CreateIndex
CREATE INDEX "association_analytics_created_at_idx" ON "association_analytics"("created_at");

-- CreateIndex
CREATE INDEX "profile_badges_profile_id_idx" ON "profile_badges"("profile_id");

-- CreateIndex
CREATE INDEX "profile_badges_association_id_idx" ON "profile_badges"("association_id");

-- CreateIndex
CREATE UNIQUE INDEX "profile_badges_profile_id_association_id_key" ON "profile_badges"("profile_id", "association_id");

-- AddForeignKey
ALTER TABLE "associations" ADD CONSTRAINT "associations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "association_members" ADD CONSTRAINT "association_members_association_id_fkey" FOREIGN KEY ("association_id") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "association_members" ADD CONSTRAINT "association_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "association_leads" ADD CONSTRAINT "association_leads_association_id_fkey" FOREIGN KEY ("association_id") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "association_analytics" ADD CONSTRAINT "association_analytics_association_id_fkey" FOREIGN KEY ("association_id") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_badges" ADD CONSTRAINT "profile_badges_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_badges" ADD CONSTRAINT "profile_badges_association_id_fkey" FOREIGN KEY ("association_id") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

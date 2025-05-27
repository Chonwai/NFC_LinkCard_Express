/*
  Warnings:

  - You are about to drop the `facilities` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `facility_access_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `properties` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `property_management_companies` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `property_residents` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `property_units` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED');

-- DropForeignKey
ALTER TABLE "facilities" DROP CONSTRAINT "facilities_property_id_fkey";

-- DropForeignKey
ALTER TABLE "facility_access_logs" DROP CONSTRAINT "facility_access_logs_facility_id_fkey";

-- DropForeignKey
ALTER TABLE "facility_access_logs" DROP CONSTRAINT "facility_access_logs_property_resident_id_fkey";

-- DropForeignKey
ALTER TABLE "properties" DROP CONSTRAINT "properties_property_management_company_id_fkey";

-- DropForeignKey
ALTER TABLE "property_residents" DROP CONSTRAINT "property_residents_property_unit_id_fkey";

-- DropForeignKey
ALTER TABLE "property_residents" DROP CONSTRAINT "property_residents_user_id_fkey";

-- DropForeignKey
ALTER TABLE "property_units" DROP CONSTRAINT "property_units_property_id_fkey";

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "linkspaceAffiliation" JSONB,
ADD COLUMN     "profileType" TEXT NOT NULL DEFAULT 'DEFAULT';

-- DropTable
DROP TABLE "facilities";

-- DropTable
DROP TABLE "facility_access_logs";

-- DropTable
DROP TABLE "properties";

-- DropTable
DROP TABLE "property_management_companies";

-- DropTable
DROP TABLE "property_residents";

-- DropTable
DROP TABLE "property_units";

-- DropEnum
DROP TYPE "ResidentVerificationMethod";

-- CreateTable
CREATE TABLE "property_invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "linkspaceUserId" TEXT,
    "invitationToken" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "acceptedByUserId" TEXT,

    CONSTRAINT "property_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "property_invitations_invitationToken_key" ON "property_invitations"("invitationToken");

-- CreateIndex
CREATE INDEX "property_invitations_email_idx" ON "property_invitations"("email");

-- CreateIndex
CREATE INDEX "property_invitations_spaceId_idx" ON "property_invitations"("spaceId");

-- AddForeignKey
ALTER TABLE "property_invitations" ADD CONSTRAINT "property_invitations_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

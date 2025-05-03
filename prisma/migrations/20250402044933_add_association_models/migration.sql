-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "MembershipTier" AS ENUM ('BASIC', 'PREMIUM', 'EXECUTIVE');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING');

-- CreateTable
CREATE TABLE "Association" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "socialLinks" JSONB,
    "customization" JSONB,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Association_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssociationMember" (
    "id" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "membershipTier" "MembershipTier" NOT NULL DEFAULT 'BASIC',
    "membershipStatus" "MembershipStatus" NOT NULL DEFAULT 'PENDING',
    "displayInDirectory" BOOLEAN NOT NULL DEFAULT true,
    "position" TEXT,
    "joinDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "renewalDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssociationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssociationLead" (
    "id" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "organization" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssociationLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssociationAnalytics" (
    "id" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssociationAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Association_userId_key" ON "Association"("userId");

-- CreateIndex
CREATE INDEX "Association_userId_idx" ON "Association"("userId");

-- CreateIndex
CREATE INDEX "AssociationMember_associationId_idx" ON "AssociationMember"("associationId");

-- CreateIndex
CREATE INDEX "AssociationMember_userId_idx" ON "AssociationMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AssociationMember_associationId_userId_key" ON "AssociationMember"("associationId", "userId");

-- CreateIndex
CREATE INDEX "AssociationLead_associationId_idx" ON "AssociationLead"("associationId");

-- CreateIndex
CREATE INDEX "AssociationLead_email_idx" ON "AssociationLead"("email");

-- CreateIndex
CREATE INDEX "AssociationAnalytics_associationId_idx" ON "AssociationAnalytics"("associationId");

-- CreateIndex
CREATE INDEX "AssociationAnalytics_eventType_idx" ON "AssociationAnalytics"("eventType");

-- CreateIndex
CREATE INDEX "AssociationAnalytics_createdAt_idx" ON "AssociationAnalytics"("createdAt");

-- AddForeignKey
ALTER TABLE "Association" ADD CONSTRAINT "Association_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssociationMember" ADD CONSTRAINT "AssociationMember_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssociationMember" ADD CONSTRAINT "AssociationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssociationLead" ADD CONSTRAINT "AssociationLead_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssociationAnalytics" ADD CONSTRAINT "AssociationAnalytics_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association"("id") ON DELETE CASCADE ON UPDATE CASCADE;

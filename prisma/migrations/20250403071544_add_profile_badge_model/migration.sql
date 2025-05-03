-- AlterTable
ALTER TABLE "Association" ADD COLUMN     "badgeImage" TEXT;

-- CreateTable
CREATE TABLE "profile_badges" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "customLabel" TEXT,
    "customColor" TEXT,
    "customSize" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_badges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profile_badges_profileId_idx" ON "profile_badges"("profileId");

-- CreateIndex
CREATE INDEX "profile_badges_associationId_idx" ON "profile_badges"("associationId");

-- CreateIndex
CREATE UNIQUE INDEX "profile_badges_profileId_associationId_key" ON "profile_badges"("profileId", "associationId");

-- AddForeignKey
ALTER TABLE "profile_badges" ADD CONSTRAINT "profile_badges_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_badges" ADD CONSTRAINT "profile_badges_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association"("id") ON DELETE CASCADE ON UPDATE CASCADE;

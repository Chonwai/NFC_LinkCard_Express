-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MembershipStatus" ADD VALUE 'EXPIRED';
ALTER TYPE "MembershipStatus" ADD VALUE 'SUSPENDED';
ALTER TYPE "MembershipStatus" ADD VALUE 'TERMINATED';
ALTER TYPE "MembershipStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "association_members" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "membership_history" (
    "id" TEXT NOT NULL,
    "association_member_id" TEXT NOT NULL,
    "previous_status" "MembershipStatus" NOT NULL,
    "new_status" "MembershipStatus" NOT NULL,
    "changed_by" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "membership_history_association_member_id_idx" ON "membership_history"("association_member_id");

-- AddForeignKey
ALTER TABLE "membership_history" ADD CONSTRAINT "membership_history_association_member_id_fkey" FOREIGN KEY ("association_member_id") REFERENCES "association_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

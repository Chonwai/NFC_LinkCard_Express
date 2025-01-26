-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "enable_lead_capture" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lead_capture_fields" JSONB;

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone_number" TEXT,
    "company" TEXT,
    "job_title" TEXT,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_profile_id_idx" ON "leads"("profile_id");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

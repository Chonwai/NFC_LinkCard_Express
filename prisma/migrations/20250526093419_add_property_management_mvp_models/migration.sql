-- CreateEnum
CREATE TYPE "ResidentVerificationMethod" AS ENUM ('UNIQUE_CODE', 'ADMIN_APPROVAL');

-- CreateTable
CREATE TABLE "property_management_companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "api_endpoint" TEXT NOT NULL,
    "api_key" TEXT,
    "meta" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_management_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "external_property_id" TEXT,
    "address" TEXT,
    "property_management_company_id" TEXT NOT NULL,
    "meta" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_units" (
    "id" TEXT NOT NULL,
    "unit_number" TEXT NOT NULL,
    "external_unit_id" TEXT,
    "property_id" TEXT NOT NULL,
    "meta" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_residents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "property_unit_id" TEXT NOT NULL,
    "external_role_id" TEXT,
    "external_account_id" TEXT,
    "external_subscription_id" TEXT,
    "verification_status" BOOLEAN NOT NULL DEFAULT false,
    "verification_method" "ResidentVerificationMethod",
    "verified_at" TIMESTAMP(3),
    "meta" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_residents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facilities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "external_facility_id" TEXT,
    "property_id" TEXT NOT NULL,
    "access_methods_supported" JSONB DEFAULT '{"QR": true, "NFC": false}',
    "meta" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facility_access_logs" (
    "id" TEXT NOT NULL,
    "property_resident_id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "access_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "access_method" TEXT NOT NULL,
    "is_successful" BOOLEAN NOT NULL,
    "external_log_id" TEXT,
    "meta" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facility_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "properties_external_property_id_key" ON "properties"("external_property_id");

-- CreateIndex
CREATE UNIQUE INDEX "property_units_external_unit_id_key" ON "property_units"("external_unit_id");

-- CreateIndex
CREATE INDEX "property_units_property_id_idx" ON "property_units"("property_id");

-- CreateIndex
CREATE INDEX "property_residents_user_id_idx" ON "property_residents"("user_id");

-- CreateIndex
CREATE INDEX "property_residents_property_unit_id_idx" ON "property_residents"("property_unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "property_residents_user_id_property_unit_id_key" ON "property_residents"("user_id", "property_unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_external_facility_id_key" ON "facilities"("external_facility_id");

-- CreateIndex
CREATE INDEX "facilities_property_id_idx" ON "facilities"("property_id");

-- CreateIndex
CREATE INDEX "facility_access_logs_property_resident_id_idx" ON "facility_access_logs"("property_resident_id");

-- CreateIndex
CREATE INDEX "facility_access_logs_facility_id_idx" ON "facility_access_logs"("facility_id");

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_property_management_company_id_fkey" FOREIGN KEY ("property_management_company_id") REFERENCES "property_management_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_units" ADD CONSTRAINT "property_units_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_residents" ADD CONSTRAINT "property_residents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_residents" ADD CONSTRAINT "property_residents_property_unit_id_fkey" FOREIGN KEY ("property_unit_id") REFERENCES "property_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_access_logs" ADD CONSTRAINT "facility_access_logs_property_resident_id_fkey" FOREIGN KEY ("property_resident_id") REFERENCES "property_residents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_access_logs" ADD CONSTRAINT "facility_access_logs_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

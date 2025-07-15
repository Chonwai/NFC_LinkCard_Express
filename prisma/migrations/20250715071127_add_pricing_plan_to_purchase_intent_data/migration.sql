-- AlterTable
ALTER TABLE "purchase_intent_data" ADD COLUMN     "pricing_plan_id" TEXT;

-- CreateIndex
CREATE INDEX "purchase_intent_data_pricing_plan_id_idx" ON "purchase_intent_data"("pricing_plan_id");

-- AddForeignKey
ALTER TABLE "purchase_intent_data" ADD CONSTRAINT "purchase_intent_data_pricing_plan_id_fkey" FOREIGN KEY ("pricing_plan_id") REFERENCES "pricing_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

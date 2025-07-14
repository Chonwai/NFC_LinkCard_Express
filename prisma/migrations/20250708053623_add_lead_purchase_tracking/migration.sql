-- AlterTable
ALTER TABLE "association_leads" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "priority" TEXT DEFAULT 'MEDIUM',
ADD COLUMN     "purchase_order_id" TEXT,
ADD COLUMN     "source" TEXT DEFAULT 'WEBSITE_CONTACT',
ADD COLUMN     "user_id" TEXT;

-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "lead_id" TEXT;

-- CreateIndex
CREATE INDEX "association_leads_source_idx" ON "association_leads"("source");

-- CreateIndex
CREATE INDEX "association_leads_priority_idx" ON "association_leads"("priority");

-- CreateIndex
CREATE INDEX "association_leads_status_idx" ON "association_leads"("status");

-- CreateIndex
CREATE INDEX "association_leads_purchase_order_id_idx" ON "association_leads"("purchase_order_id");

-- CreateIndex
CREATE INDEX "association_leads_user_id_idx" ON "association_leads"("user_id");

-- CreateIndex
CREATE INDEX "association_leads_created_at_idx" ON "association_leads"("created_at");

-- CreateIndex
CREATE INDEX "purchase_orders_lead_id_idx" ON "purchase_orders"("lead_id");

-- AddForeignKey
ALTER TABLE "association_leads" ADD CONSTRAINT "association_leads_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "association_leads" ADD CONSTRAINT "association_leads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

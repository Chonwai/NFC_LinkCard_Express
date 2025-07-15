-- CreateTable
CREATE TABLE "purchase_intent_data" (
    "id" TEXT NOT NULL,
    "association_id" TEXT NOT NULL,
    "user_id" TEXT,
    "purchase_order_id" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "organization" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "auto_create_profile" BOOLEAN NOT NULL DEFAULT true,
    "profile_settings" JSONB,
    "purchase_context" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "converted_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_intent_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "purchase_intent_data_association_id_idx" ON "purchase_intent_data"("association_id");

-- CreateIndex
CREATE INDEX "purchase_intent_data_user_id_idx" ON "purchase_intent_data"("user_id");

-- CreateIndex
CREATE INDEX "purchase_intent_data_email_idx" ON "purchase_intent_data"("email");

-- CreateIndex
CREATE INDEX "purchase_intent_data_status_idx" ON "purchase_intent_data"("status");

-- CreateIndex
CREATE INDEX "purchase_intent_data_purchase_order_id_idx" ON "purchase_intent_data"("purchase_order_id");

-- CreateIndex
CREATE INDEX "purchase_intent_data_expires_at_idx" ON "purchase_intent_data"("expires_at");

-- CreateIndex
CREATE INDEX "purchase_intent_data_created_at_idx" ON "purchase_intent_data"("created_at");

-- AddForeignKey
ALTER TABLE "purchase_intent_data" ADD CONSTRAINT "purchase_intent_data_association_id_fkey" FOREIGN KEY ("association_id") REFERENCES "associations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_intent_data" ADD CONSTRAINT "purchase_intent_data_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_intent_data" ADD CONSTRAINT "purchase_intent_data_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

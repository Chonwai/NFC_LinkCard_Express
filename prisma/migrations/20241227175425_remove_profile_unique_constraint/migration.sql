-- DropIndex
DROP INDEX "profiles_user_id_is_default_key";

-- CreateIndex
CREATE INDEX "profiles_user_id_idx" ON "profiles"("user_id");

-- Migration: Remove unique constraint on Association.userId to support multiple associations per user
-- Date: 2025-01-03
-- Description: Allow users to create multiple associations by removing the unique constraint

-- Remove the unique constraint on user_id
ALTER TABLE "associations" DROP CONSTRAINT "Association_userId_key";

-- Note: 
-- 1. This change is backward compatible - existing data remains unchanged
-- 2. All existing associations will continue to work normally
-- 3. Users can now create multiple associations
-- 4. The index on userId is preserved for query performance 
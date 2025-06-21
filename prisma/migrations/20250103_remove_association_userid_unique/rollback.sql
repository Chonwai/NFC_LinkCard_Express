-- Rollback Migration: Restore unique constraint on Association.userId
-- WARNING: This rollback will FAIL if users have created multiple associations
-- Only use this if no users have created multiple associations yet

-- First, check if there are users with multiple associations
-- Run this query first: SELECT user_id, COUNT(*) FROM associations GROUP BY user_id HAVING COUNT(*) > 1;
-- If the query returns any rows, this rollback will fail and manual intervention is needed

-- Restore the unique constraint on user_id
ALTER TABLE "associations" ADD CONSTRAINT "Association_userId_key" UNIQUE ("user_id");

-- Note:
-- 1. This rollback will only work if no user has multiple associations
-- 2. If users have multiple associations, you need to handle them manually first
-- 3. Consider the business impact before performing this rollback 
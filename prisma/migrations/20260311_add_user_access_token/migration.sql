-- Add userAccessToken column to meta_integrations table
-- This stores the long-lived OAuth USER token (not the page token)
-- which is required for instagram_manage_insights scope queries.
ALTER TABLE "meta_integrations" ADD COLUMN IF NOT EXISTS "userAccessToken" TEXT;

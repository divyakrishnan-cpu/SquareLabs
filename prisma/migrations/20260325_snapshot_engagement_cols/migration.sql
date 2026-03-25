-- Add per-day engagement breakdown columns to social_metric_snapshots
-- These replace the previous "interactions" catch-all with individual metrics
-- so we can do accurate historical comparisons without hitting the Meta API.

ALTER TABLE "social_metric_snapshots"
  ADD COLUMN IF NOT EXISTS "likes"    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "comments" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "saves"    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "shares"   INTEGER NOT NULL DEFAULT 0;

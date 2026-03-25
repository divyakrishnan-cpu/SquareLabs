-- Remove TWITTER from SocialPlatform enum
-- PostgreSQL doesn't support DROP VALUE from enum directly, so we recreate it.

-- Step 1: Update any existing rows that reference TWITTER (safety — shouldn't exist)
UPDATE "social_metric_snapshots" SET "platform" = 'INSTAGRAM' WHERE "platform" = 'TWITTER';
UPDATE "content_calendar_items"  SET "platform" = 'INSTAGRAM' WHERE "platform"::text = 'TWITTER';

-- Step 2: Create the new enum without TWITTER
CREATE TYPE "SocialPlatform_new" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'YOUTUBE', 'PINTEREST');

-- Step 3: Alter columns that use SocialPlatform to use the new type
ALTER TABLE "social_metric_snapshots"
  ALTER COLUMN "platform" TYPE "SocialPlatform_new"
  USING "platform"::text::"SocialPlatform_new";

-- Handle SocialPlatform[] arrays in content_series and content_calendar_items
ALTER TABLE "content_series"
  ALTER COLUMN "platforms" TYPE "SocialPlatform_new"[]
  USING "platforms"::text[]::"SocialPlatform_new"[];

ALTER TABLE "content_calendar_items"
  ALTER COLUMN "platforms" TYPE "SocialPlatform_new"[]
  USING "platforms"::text[]::"SocialPlatform_new"[];

-- Step 4: Drop the old enum and rename the new one
DROP TYPE "SocialPlatform";
ALTER TYPE "SocialPlatform_new" RENAME TO "SocialPlatform";

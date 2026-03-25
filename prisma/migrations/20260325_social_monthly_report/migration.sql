-- CreateTable: social_monthly_reports
-- Stores manually-logged aggregate social metrics per vertical, per month.

CREATE TABLE IF NOT EXISTS "social_monthly_reports" (
    "id"               TEXT NOT NULL,
    "vertical"         "Vertical" NOT NULL,
    "year"             INTEGER NOT NULL,
    "month"            INTEGER NOT NULL,

    -- Audience
    "totalFollowers"   INTEGER NOT NULL DEFAULT 0,
    "newFollowers"     INTEGER NOT NULL DEFAULT 0,
    "unfollows"        INTEGER NOT NULL DEFAULT 0,
    "netFollowers"     INTEGER NOT NULL DEFAULT 0,

    -- Reach & visibility
    "totalViews"       INTEGER NOT NULL DEFAULT 0,
    "totalReach"       INTEGER NOT NULL DEFAULT 0,
    "totalImpressions" INTEGER NOT NULL DEFAULT 0,

    -- Engagement
    "interactions"     INTEGER NOT NULL DEFAULT 0,
    "linkClicks"       INTEGER NOT NULL DEFAULT 0,
    "profileVisits"    INTEGER NOT NULL DEFAULT 0,
    "totalContacts"    INTEGER NOT NULL DEFAULT 0,

    -- Publishing
    "postsPublished"   INTEGER NOT NULL DEFAULT 0,
    "videosPublished"  INTEGER NOT NULL DEFAULT 0,
    "staticsPublished" INTEGER NOT NULL DEFAULT 0,

    -- Per-platform JSON breakdown (optional)
    "platformBreakdown" JSONB,

    "notes"            TEXT,
    "enteredById"      TEXT,

    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_monthly_reports_pkey" PRIMARY KEY ("id")
);

-- Unique index: one record per vertical + year + month
CREATE UNIQUE INDEX IF NOT EXISTS "social_monthly_reports_vertical_year_month_key"
    ON "social_monthly_reports"("vertical", "year", "month");

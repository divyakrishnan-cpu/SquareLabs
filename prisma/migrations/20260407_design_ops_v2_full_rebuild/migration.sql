-- ============================================================
-- Design Ops v2 — DDL + data migration
-- 2026-04-07
--
-- Enum values must already be committed before this runs.
-- See 20260407000000_design_ops_v2_enums for ALTER TYPE statements.
-- ============================================================

-- ── 1. Add new columns to design_requests ────────────────────
-- Each column wrapped individually so an already-existing column
-- (from a prior db push) doesn't break the whole statement.

DO $$ BEGIN ALTER TABLE design_requests ADD COLUMN "videoSubType"     "VideoSubType";              EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE design_requests ADD COLUMN "channels"         TEXT[] NOT NULL DEFAULT '{}'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE design_requests ADD COLUMN "inProgressAt"     TIMESTAMP(3);                EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE design_requests ADD COLUMN "completedAt"      TIMESTAMP(3);                EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE design_requests ADD COLUMN "shootPlannedAt"   TIMESTAMP(3);                EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE design_requests ADD COLUMN "shootDoneAt"      TIMESTAMP(3);                EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE design_requests ADD COLUMN "editingStartedAt" TIMESTAMP(3);                EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE design_requests ADD COLUMN "allApprovedAt"    TIMESTAMP(3);                EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE design_requests ADD COLUMN "uploadedClosedAt" TIMESTAMP(3);                EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE design_requests ADD COLUMN "readyToUploadAt"  TIMESTAMP(3);                EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE design_requests ADD COLUMN "uploadDoneAt"     TIMESTAMP(3);                EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE design_requests ADD COLUMN "cancelledAt"      TIMESTAMP(3);                EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Rename legacy column (graceful — skip if source column doesn't exist)
DO $$
BEGIN
  ALTER TABLE design_requests RENAME COLUMN "designerDoneAt" TO "completedAt_legacy";
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- Drop old requesterName (name now comes from session)
ALTER TABLE design_requests DROP COLUMN IF EXISTS "requesterName";

-- ── 2. Migrate existing type values ──────────────────────────

UPDATE design_requests SET type = 'VIDEO'           WHERE type IN ('VIDEO_EDIT', 'VIDEO_SHOOT');
UPDATE design_requests SET type = 'PAID_CAMPAIGN'   WHERE type = 'GRAPHIC_CAMPAIGN';
UPDATE design_requests SET type = 'SOCIAL_GRAPHICS' WHERE type IN ('GRAPHIC_SOCIAL', 'OTHER');

-- Migrate old statuses to new equivalents
UPDATE design_requests SET status = 'COMPLETED'       WHERE status = 'DESIGNER_DONE';
UPDATE design_requests SET status = 'REVIEW'          WHERE status = 'IN_REVIEW';
UPDATE design_requests SET status = 'ALL_APPROVED'    WHERE status IN ('FINAL_DONE', 'DELIVERED');
UPDATE design_requests SET status = 'UPLOADED_CLOSED' WHERE status = 'FINAL_DONE';

-- ── 3. Update design_request_pocs unique constraint ──────────

ALTER TABLE design_request_pocs
  DROP CONSTRAINT IF EXISTS "design_request_pocs_requestId_userId_key";

DO $$
BEGIN
  ALTER TABLE design_request_pocs
    ADD CONSTRAINT "design_request_pocs_requestId_role_key"
    UNIQUE ("requestId", "role");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- ── 4. Create notifications table ────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT         NOT NULL PRIMARY KEY,
  "userId"    TEXT         NOT NULL,
  "requestId" TEXT,
  title       TEXT         NOT NULL,
  body        TEXT         NOT NULL,
  read        BOOLEAN      NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notifications_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT "notifications_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES design_requests(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "notifications_userId_idx"    ON notifications("userId");
CREATE INDEX IF NOT EXISTS "notifications_requestId_idx" ON notifications("requestId");

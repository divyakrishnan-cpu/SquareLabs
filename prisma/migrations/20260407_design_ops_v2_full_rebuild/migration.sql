-- ============================================================
-- Design Ops v2 — Full flow rebuild
-- 2026-04-07
-- ============================================================

-- ── 1. New enums ─────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "DesignRequestType_new" AS ENUM (
    'SOCIAL_GRAPHICS',
    'VIDEO',
    'PAID_CAMPAIGN'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "VideoSubType" AS ENUM ('VERTICAL', 'HORIZONTAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ReviewAction" AS ENUM ('APPROVED', 'CHANGES_REQUESTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. Extend DesignRequestStatus with all new values ────────

DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'NEW';              EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'ASSIGNED';         EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';      EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';        EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'SHOOT_PLANNED';    EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'SHOOT_DONE';       EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'EDITING_IN_PROGRESS'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'EDIT_DONE';        EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'REVIEW';           EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'CHANGES_REQUESTED'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'ALL_APPROVED';     EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'UPLOADED_CLOSED';  EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'APPROVED';         EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'READY_TO_UPLOAD';  EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'UPLOAD_DONE';      EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';        EXCEPTION WHEN others THEN NULL; END $$;

-- ── 3. Extend POCRole with new values ────────────────────────

DO $$ BEGIN ALTER TYPE "POCRole" ADD VALUE IF NOT EXISTS 'DESIGN';    EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "POCRole" ADD VALUE IF NOT EXISTS 'VIDEO';     EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "POCRole" ADD VALUE IF NOT EXISTS 'CONTENT';   EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "POCRole" ADD VALUE IF NOT EXISTS 'SOCIAL';    EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "POCRole" ADD VALUE IF NOT EXISTS 'UPLOADING'; EXCEPTION WHEN others THEN NULL; END $$;

-- ── 4. Extend DesignRequestType with new values ───────────────
-- (We add new values and will migrate old rows below)

DO $$ BEGIN ALTER TYPE "DesignRequestType" ADD VALUE IF NOT EXISTS 'SOCIAL_GRAPHICS'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestType" ADD VALUE IF NOT EXISTS 'VIDEO';           EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestType" ADD VALUE IF NOT EXISTS 'PAID_CAMPAIGN';   EXCEPTION WHEN others THEN NULL; END $$;

-- ── 5. Add new columns to design_requests ────────────────────

ALTER TABLE design_requests
  ADD COLUMN IF NOT EXISTS "videoSubType"      "VideoSubType",
  ADD COLUMN IF NOT EXISTS "channels"          TEXT[]         NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "inProgressAt"      TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "completedAt"       TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "shootPlannedAt"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "shootDoneAt"       TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "editingStartedAt"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "allApprovedAt"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "uploadedClosedAt"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "readyToUploadAt"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "uploadDoneAt"      TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelledAt"       TIMESTAMP(3);

-- Rename legacy columns safely
ALTER TABLE design_requests
  RENAME COLUMN IF EXISTS "designerDoneAt" TO "completedAt_legacy";

-- Drop old requesterName (name now comes from session)
ALTER TABLE design_requests
  DROP COLUMN IF EXISTS "requesterName";

-- ── 6. Migrate existing type values ──────────────────────────

UPDATE design_requests SET type = 'VIDEO'           WHERE type IN ('VIDEO_EDIT', 'VIDEO_SHOOT');
UPDATE design_requests SET type = 'PAID_CAMPAIGN'   WHERE type = 'GRAPHIC_CAMPAIGN';
UPDATE design_requests SET type = 'SOCIAL_GRAPHICS' WHERE type IN ('GRAPHIC_SOCIAL', 'OTHER');

-- Migrate old statuses to new equivalents
UPDATE design_requests SET status = 'NEW'         WHERE status = 'NEW';
UPDATE design_requests SET status = 'ASSIGNED'    WHERE status = 'ASSIGNED';
UPDATE design_requests SET status = 'IN_PROGRESS' WHERE status = 'IN_PROGRESS';
UPDATE design_requests SET status = 'COMPLETED'   WHERE status = 'DESIGNER_DONE';
UPDATE design_requests SET status = 'REVIEW'      WHERE status IN ('IN_REVIEW', 'REVIEW');
UPDATE design_requests SET status = 'ALL_APPROVED' WHERE status IN ('APPROVED', 'FINAL_DONE', 'DELIVERED');
UPDATE design_requests SET status = 'UPLOADED_CLOSED' WHERE status = 'FINAL_DONE';

-- ── 7. Update design_request_pocs unique constraint ──────────
-- Old: unique on (requestId, userId) — one user per request
-- New: unique on (requestId, role)  — one person per role per request

ALTER TABLE design_request_pocs
  DROP CONSTRAINT IF EXISTS "design_request_pocs_requestId_userId_key";

ALTER TABLE design_request_pocs
  ADD CONSTRAINT "design_request_pocs_requestId_role_key"
  UNIQUE ("requestId", "role");

-- ── 8. Create notifications table ────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT        NOT NULL PRIMARY KEY,
  "userId"    TEXT        NOT NULL,
  "requestId" TEXT,
  title       TEXT        NOT NULL,
  body        TEXT        NOT NULL,
  read        BOOLEAN     NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notifications_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT "notifications_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES design_requests(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "notifications_userId_idx" ON notifications("userId");
CREATE INDEX IF NOT EXISTS "notifications_requestId_idx" ON notifications("requestId");

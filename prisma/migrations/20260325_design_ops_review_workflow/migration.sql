-- Design Ops: Review Workflow with multi-POC and review cycle tracking
-- Adds: new statuses, POCRole enum, ReviewAction enum,
--       DesignRequestPOC table, DesignReviewCycle table,
--       new timestamp columns on design_requests.

-- ── 1. New enum: POCRole ───────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "POCRole" AS ENUM ('DESIGN', 'SOCIAL', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. New enum: ReviewAction ──────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "ReviewAction" AS ENUM ('APPROVED', 'CHANGES_REQUESTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 3. Add new values to DesignRequestStatus ───────────────────────────────
DO $$ BEGIN
  ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'DESIGNER_DONE';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'IN_REVIEW';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'CHANGES_REQUESTED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'FINAL_DONE';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 4. New columns on design_requests ─────────────────────────────────────
ALTER TABLE "design_requests"
  ADD COLUMN IF NOT EXISTS "designerDoneAt"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "changesRequestedAt"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approvedAt"          TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "finalDoneAt"         TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reviewCycleCount"    INTEGER NOT NULL DEFAULT 0;

-- ── 5. Create design_request_pocs table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS "design_request_pocs" (
  "id"        TEXT        NOT NULL,
  "requestId" TEXT        NOT NULL,
  "userId"    TEXT        NOT NULL,
  "role"      "POCRole"   NOT NULL DEFAULT 'OTHER',
  "addedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "design_request_pocs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "design_request_pocs_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "design_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "design_request_pocs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "design_request_pocs_requestId_userId_key"
    UNIQUE ("requestId", "userId")
);

-- ── 6. Create design_review_cycles table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS "design_review_cycles" (
  "id"           TEXT          NOT NULL,
  "requestId"    TEXT          NOT NULL,
  "reviewedById" TEXT          NOT NULL,
  "action"       "ReviewAction" NOT NULL,
  "note"         TEXT,
  "cycleNumber"  INTEGER       NOT NULL,
  "createdAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "design_review_cycles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "design_review_cycles_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "design_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "design_review_cycles_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

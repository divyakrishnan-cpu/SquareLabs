-- ============================================================
-- Design Ops v2 — Enum additions (MUST run before data migration)
-- 2026-04-07
--
-- PostgreSQL error 55P04 ("unsafe_new_enum_value_usage") occurs
-- when ALTER TYPE ADD VALUE and DML that uses the new value run
-- in the same transaction.  Keeping all enum DDL in this separate
-- migration ensures the new values are committed before the next
-- migration tries to UPDATE rows with them.
-- ============================================================

-- ── 1. New standalone types ───────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "VideoSubType" AS ENUM ('VERTICAL', 'HORIZONTAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ReviewAction" AS ENUM ('APPROVED', 'CHANGES_REQUESTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. Extend DesignRequestStatus ────────────────────────────

DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'NEW';                 EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'ASSIGNED';            EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';         EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';           EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'SHOOT_PLANNED';       EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'SHOOT_DONE';          EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'EDITING_IN_PROGRESS'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'EDIT_DONE';           EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'REVIEW';              EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'CHANGES_REQUESTED';   EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'ALL_APPROVED';        EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'UPLOADED_CLOSED';     EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'APPROVED';            EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'READY_TO_UPLOAD';     EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'UPLOAD_DONE';         EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';           EXCEPTION WHEN others THEN NULL; END $$;

-- ── 3. Extend POCRole ─────────────────────────────────────────

DO $$ BEGIN ALTER TYPE "POCRole" ADD VALUE IF NOT EXISTS 'DESIGN';    EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "POCRole" ADD VALUE IF NOT EXISTS 'VIDEO';     EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "POCRole" ADD VALUE IF NOT EXISTS 'CONTENT';   EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "POCRole" ADD VALUE IF NOT EXISTS 'SOCIAL';    EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "POCRole" ADD VALUE IF NOT EXISTS 'UPLOADING'; EXCEPTION WHEN others THEN NULL; END $$;

-- ── 4. Extend DesignRequestType ──────────────────────────────

DO $$ BEGIN ALTER TYPE "DesignRequestType" ADD VALUE IF NOT EXISTS 'SOCIAL_GRAPHICS'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestType" ADD VALUE IF NOT EXISTS 'VIDEO';           EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "DesignRequestType" ADD VALUE IF NOT EXISTS 'PAID_CAMPAIGN';   EXCEPTION WHEN others THEN NULL; END $$;

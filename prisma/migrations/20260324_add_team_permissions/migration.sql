-- Add ADMIN value to UserRole enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ADMIN';

-- Create AppSection enum
DO $$ BEGIN
  CREATE TYPE "AppSection" AS ENUM (
    'DASHBOARD', 'SOCIAL', 'DESIGN_OPS', 'GMB', 'PORTALS', 'SETTINGS', 'TEAM_HUB'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to users table
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "department"     TEXT,
  ADD COLUMN IF NOT EXISTS "isActive"       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "teamId"         TEXT;

-- Add accessSections column (array of AppSection enum) with default
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "accessSections" "AppSection"[] NOT NULL DEFAULT ARRAY['DASHBOARD'::"AppSection"];

-- Create teams table
CREATE TABLE IF NOT EXISTS "teams" (
  "id"          TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "slug"        TEXT NOT NULL,
  "description" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on teams.slug
DO $$ BEGIN
  ALTER TABLE "teams" ADD CONSTRAINT "teams_slug_key" UNIQUE ("slug");
EXCEPTION
  WHEN duplicate_table THEN null;
  WHEN duplicate_object THEN null;
END $$;

-- Foreign key: users.teamId -> teams.id
DO $$ BEGIN
  ALTER TABLE "users"
    ADD CONSTRAINT "users_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "teams"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

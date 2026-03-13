-- ORM-01: GMB Location Registry
CREATE TABLE "gmb_locations" (
  "id"         TEXT NOT NULL,
  "business"   TEXT NOT NULL,
  "city"       TEXT NOT NULL,
  "country"    TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "address"    TEXT NOT NULL,
  "gmbUrl"     TEXT NOT NULL,
  "handledBy"  TEXT,
  "status"     TEXT NOT NULL DEFAULT 'active',
  "placeId"    TEXT,
  "notes"      TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gmb_locations_pkey" PRIMARY KEY ("id")
);

-- ORM-02: GMB Weekly Rating Snapshots
CREATE TABLE "gmb_rating_snapshots" (
  "id"           TEXT NOT NULL,
  "locationId"   TEXT NOT NULL,
  "weekStart"    TIMESTAMP(3) NOT NULL,
  "rating"       DOUBLE PRECISION,
  "reviewCount"  INTEGER,
  "newReviews"   INTEGER,
  "ratingDelta"  DOUBLE PRECISION,
  "source"       TEXT NOT NULL DEFAULT 'manual',
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gmb_rating_snapshots_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "gmb_rating_snapshots"
  ADD CONSTRAINT "gmb_rating_snapshots_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "gmb_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "gmb_rating_snapshots_locationId_weekStart_key"
  ON "gmb_rating_snapshots"("locationId", "weekStart");

-- ORM-03: Employee Review Platforms
CREATE TABLE "employee_review_platforms" (
  "id"        TEXT NOT NULL,
  "platform"  TEXT NOT NULL,
  "business"  TEXT NOT NULL,
  "url"       TEXT NOT NULL,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employee_review_platforms_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employee_review_snapshots" (
  "id"          TEXT NOT NULL,
  "platformId"  TEXT NOT NULL,
  "weekStart"   TIMESTAMP(3) NOT NULL,
  "rating"      DOUBLE PRECISION,
  "reviewCount" INTEGER,
  "newReviews"  INTEGER,
  "ratingDelta" DOUBLE PRECISION,
  "source"      TEXT NOT NULL DEFAULT 'manual',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employee_review_snapshots_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "employee_review_snapshots"
  ADD CONSTRAINT "employee_review_snapshots_platformId_fkey"
  FOREIGN KEY ("platformId") REFERENCES "employee_review_platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "employee_review_snapshots_platformId_weekStart_key"
  ON "employee_review_snapshots"("platformId", "weekStart");

-- Add mapsUrl and displayLabel to gmb_locations
ALTER TABLE gmb_locations ADD COLUMN IF NOT EXISTS maps_url TEXT;
ALTER TABLE gmb_locations ADD COLUMN IF NOT EXISTS display_label TEXT;

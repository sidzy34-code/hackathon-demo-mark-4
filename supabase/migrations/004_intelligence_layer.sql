-- ============================================================
-- VANGUARD — Intelligence Layer Migration
-- Brief 1: Narrative Engine columns
-- Brief 2: Hypothesis Engine columns + seed data
-- Brief 3: Ecology-Crime Interface tables + seed data
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ─── BRIEF 1: Narrative Engine ───────────────────────────────
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS narrative text;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS narrative_generated_at timestamptz;

-- ─── BRIEF 2: Hypothesis Engine ──────────────────────────────
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS hypothesis JSONB;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS resolved boolean DEFAULT false;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS outcome text;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS severity text;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS source_type text;

-- Make zone_id accept text values (for the seed data with 'zone-4' style IDs)
-- Note: if zone_id is already a UUID FK, these inserts use the text alias column below.
-- We add a separate text column for the legacy intelligence engine seed rows:
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS zone_label text;

-- Seed: 10 historical Zone 4 incidents for hypothesis engine training corpus
-- zone_label is a text column (added above) — avoids the UUID FK constraint on zone_id
-- `type` is NOT NULL so we include it; we use 'ACOUSTIC', 'CAMERA', 'COMMUNITY' to match the check constraint
INSERT INTO alerts (zone_label, type, severity, source_type, description, confidence, created_at, resolved, outcome) VALUES
  ('zone-4', 'ACOUSTIC',   'CRITICAL',  'ACOUSTIC',   'Gunshot detected, single discharge, high confidence',         94, NOW() - INTERVAL '45 days',  true, 'confirmed_incident'),
  ('zone-4', 'ACOUSTIC',   'CRITICAL',  'ACOUSTIC',   'Gunshot detected, possible poaching activity',                88, NOW() - INTERVAL '62 days',  true, 'confirmed_incident'),
  ('zone-4', 'CAMERA',     'ELEVATED',  'CAMERA',     'Two humanoid silhouettes detected on trail camera 7',         79, NOW() - INTERVAL '63 days',  true, 'confirmed_incident'),
  ('zone-4', 'COMMUNITY',  'ELEVATED',  'COMMUNITY',  'Ranger reported suspicious vehicle near Zone 3 boundary',     65, NOW() - INTERVAL '78 days',  true, 'confirmed_incident'),
  ('zone-4', 'ACOUSTIC',   'CRITICAL',  'ACOUSTIC',   'Multiple gunshots, 3 discharges detected',                   97, NOW() - INTERVAL '91 days',  true, 'confirmed_incident'),
  ('zone-4', 'ACOUSTIC',   'ELEVATED',  'ACOUSTIC',   'Low RPM diesel engine, Zone 3 perimeter',                    71, NOW() - INTERVAL '110 days', true, 'false_positive'),
  ('zone-4', 'CAMERA',     'ELEVATED',  'CAMERA',     'Motion event, possible animal movement',                     55, NOW() - INTERVAL '120 days', true, 'false_positive'),
  ('zone-4', 'ACOUSTIC',   'CRITICAL',  'ACOUSTIC',   'Gunshot, single discharge, Zone 4 eastern corridor',         91, NOW() - INTERVAL '135 days', true, 'confirmed_incident'),
  ('zone-4', 'COMMUNITY',  'ELEVATED',  'COMMUNITY',  'Community report: unknown persons near waterhole',           60, NOW() - INTERVAL '150 days', true, 'confirmed_incident'),
  ('zone-4', 'ACOUSTIC',   'ELEVATED',  'ACOUSTIC',   'Acoustic anomaly, unclassified, possible vehicle',           48, NOW() - INTERVAL '160 days', true, 'false_positive');


-- ─── BRIEF 3: Ecology-Crime Interface ────────────────────────

-- Table 1: Tracked animals (individual sighting events)
CREATE TABLE IF NOT EXISTS tracked_animals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id      text NOT NULL,
  species        text NOT NULL,
  zone_id        text NOT NULL,
  confirmed_at   timestamptz NOT NULL DEFAULT now(),
  camera_trap_id text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Table 2: Zone threat correlations (static lookup)
CREATE TABLE IF NOT EXISTS zone_threat_correlations (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id                     text NOT NULL,
  species                     text NOT NULL,
  incident_count_near_sighting integer NOT NULL,
  total_sightings             integer NOT NULL,
  correlation_pct             integer NOT NULL,
  UNIQUE(zone_id, species)
);

-- Enable RLS
ALTER TABLE tracked_animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_threat_correlations ENABLE ROW LEVEL SECURITY;

-- RLS policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tracked_animals' AND policyname = 'Allow authenticated read on tracked_animals'
  ) THEN
    CREATE POLICY "Allow authenticated read on tracked_animals"
      ON tracked_animals FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tracked_animals' AND policyname = 'Allow authenticated insert on tracked_animals'
  ) THEN
    CREATE POLICY "Allow authenticated insert on tracked_animals"
      ON tracked_animals FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'zone_threat_correlations' AND policyname = 'Allow authenticated read on zone_threat_correlations'
  ) THEN
    CREATE POLICY "Allow authenticated read on zone_threat_correlations"
      ON zone_threat_correlations FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Seed zone correlations
INSERT INTO zone_threat_correlations (zone_id, species, incident_count_near_sighting, total_sightings, correlation_pct)
VALUES
  ('zone-4', 'Tiger', 4, 8, 50),
  ('zone-7', 'Tiger', 3, 6, 50)
ON CONFLICT (zone_id, species) DO NOTHING;

-- Seed historical T-08 sightings
INSERT INTO tracked_animals (animal_id, species, zone_id, confirmed_at, camera_trap_id) VALUES
  ('T-08', 'Tiger', 'zone-4', NOW() - INTERVAL '45 days',  'CT-04-07'),
  ('T-08', 'Tiger', 'zone-7', NOW() - INTERVAL '56 days',  'CT-07-02'),
  ('T-08', 'Tiger', 'zone-4', NOW() - INTERVAL '78 days',  'CT-04-03'),
  ('T-08', 'Tiger', 'zone-7', NOW() - INTERVAL '89 days',  'CT-07-05'),
  ('T-08', 'Tiger', 'zone-4', NOW() - INTERVAL '102 days', 'CT-04-07'),
  ('T-08', 'Tiger', 'zone-7', NOW() - INTERVAL '115 days', 'CT-07-02');

-- Alert RLS: allow authenticated insert (needed for narrative/hypothesis upserts)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'alerts' AND policyname = 'alerts_insert_auth'
  ) THEN
    CREATE POLICY "alerts_insert_auth" ON public.alerts FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'alerts' AND policyname = 'alerts_update_auth'
  ) THEN
    CREATE POLICY "alerts_update_auth" ON public.alerts FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;

-- 028 Production event advancing and show operations
CREATE TABLE IF NOT EXISTS wgos.production_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid NOT NULL REFERENCES wgos.projects(id) ON DELETE CASCADE,brand_id text NOT NULL REFERENCES wgos.brands(id),
 event_name text NOT NULL,venue_name text,venue_address text,event_start timestamptz,event_end timestamptz,load_in_at timestamptz,doors_at timestamptz,
 timezone text NOT NULL DEFAULT 'America/Chicago',status text NOT NULL DEFAULT 'ADVANCING',metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS wgos.production_departments(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),production_event_id uuid NOT NULL REFERENCES wgos.production_events(id) ON DELETE CASCADE,
 department text NOT NULL,lead_crew_profile_id uuid REFERENCES wgos.crew_profiles(id),status text NOT NULL DEFAULT 'PLANNING',notes text,
 UNIQUE(production_event_id,department)
);
CREATE TABLE IF NOT EXISTS wgos.production_requirements(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),production_event_id uuid NOT NULL REFERENCES wgos.production_events(id) ON DELETE CASCADE,
 department text NOT NULL,category text NOT NULL,item text NOT NULL,quantity integer NOT NULL DEFAULT 1,source text,status text NOT NULL DEFAULT 'NEEDED',
 notes text,metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS wgos.run_of_show_items(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),production_event_id uuid NOT NULL REFERENCES wgos.production_events(id) ON DELETE CASCADE,
 position integer NOT NULL DEFAULT 0,cue_at timestamptz,duration_seconds integer,title text NOT NULL,department text,owner_subject text,
 notes text,status text NOT NULL DEFAULT 'PLANNED'
);
CREATE INDEX IF NOT EXISTS ros_event_order_idx ON wgos.run_of_show_items(production_event_id,position);
CREATE TABLE IF NOT EXISTS wgos.advancing_checkpoints(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),production_event_id uuid NOT NULL REFERENCES wgos.production_events(id) ON DELETE CASCADE,
 checkpoint text NOT NULL,owner_subject text,due_at timestamptz,status text NOT NULL DEFAULT 'OPEN',completed_at timestamptz,notes text
);
-- 025 Communications, scheduling, production resources and AI command execution
CREATE TABLE IF NOT EXISTS wgos.communication_threads(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),brand_id text NOT NULL REFERENCES wgos.brands(id),
 organization_id uuid REFERENCES wgos.organizations(id),person_id uuid REFERENCES wgos.people(id),
 channel text NOT NULL CHECK(channel IN ('EMAIL','SMS','PHONE','PORTAL','OTHER')),subject text,
 external_thread_ref text,status text NOT NULL DEFAULT 'OPEN',created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS wgos.communication_messages(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),thread_id uuid NOT NULL REFERENCES wgos.communication_threads(id) ON DELETE CASCADE,
 direction text NOT NULL CHECK(direction IN ('INBOUND','OUTBOUND')),sender_ref text,recipient_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
 body_ref text,external_message_ref text,occurred_at timestamptz NOT NULL DEFAULT now(),metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE UNIQUE INDEX IF NOT EXISTS communication_external_msg_idx ON wgos.communication_messages(external_message_ref) WHERE external_message_ref IS NOT NULL;
CREATE TABLE IF NOT EXISTS wgos.calendar_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),brand_id text NOT NULL REFERENCES wgos.brands(id),project_id uuid REFERENCES wgos.projects(id),
 title text NOT NULL,start_at timestamptz NOT NULL,end_at timestamptz NOT NULL,timezone text NOT NULL DEFAULT 'America/Chicago',
 external_provider text,external_event_ref text,status text NOT NULL DEFAULT 'CONFIRMED',metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE UNIQUE INDEX IF NOT EXISTS calendar_external_event_idx ON wgos.calendar_events(external_provider,external_event_ref) WHERE external_event_ref IS NOT NULL;
CREATE TABLE IF NOT EXISTS wgos.crew_profiles(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),person_id uuid NOT NULL REFERENCES wgos.people(id),brand_id text REFERENCES wgos.brands(id),
 disciplines jsonb NOT NULL DEFAULT '[]'::jsonb,status text NOT NULL DEFAULT 'ACTIVE',day_rate_cents bigint,notes text,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS wgos.equipment_assets(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),brand_id text REFERENCES wgos.brands(id),owner_organization_id uuid REFERENCES wgos.organizations(id),
 asset_tag text,category text NOT NULL,manufacturer text,model text,serial_number text,status text NOT NULL DEFAULT 'AVAILABLE',
 replacement_value_cents bigint,location_text text,metadata jsonb NOT NULL DEFAULT '{}'::jsonb,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS equipment_asset_tag_idx ON wgos.equipment_assets(asset_tag) WHERE asset_tag IS NOT NULL;
CREATE TABLE IF NOT EXISTS wgos.project_crew_assignments(
 project_id uuid NOT NULL REFERENCES wgos.projects(id) ON DELETE CASCADE,crew_profile_id uuid NOT NULL REFERENCES wgos.crew_profiles(id),
 role_name text NOT NULL,call_at timestamptz,release_at timestamptz,status text NOT NULL DEFAULT 'PROPOSED',rate_cents bigint,
 PRIMARY KEY(project_id,crew_profile_id,role_name)
);
CREATE TABLE IF NOT EXISTS wgos.project_equipment_assignments(
 project_id uuid NOT NULL REFERENCES wgos.projects(id) ON DELETE CASCADE,equipment_asset_id uuid NOT NULL REFERENCES wgos.equipment_assets(id),
 quantity integer NOT NULL DEFAULT 1 CHECK(quantity>0),notes text,PRIMARY KEY(project_id,equipment_asset_id)
);
CREATE TABLE IF NOT EXISTS wgos.ai_action_executions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),brand_id text REFERENCES wgos.brands(id),actor_subject text,
 requested_action text NOT NULL,authority_level text NOT NULL CHECK(authority_level IN ('READ','DRAFT','PROPOSE_ACTION','EXECUTE_LOW_RISK','EXECUTE_APPROVED')),
 approval_request_id uuid REFERENCES wgos.approval_requests(id),status text NOT NULL DEFAULT 'REQUESTED',
 request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,result_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 correlation_id text,created_at timestamptz NOT NULL DEFAULT now(),completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS ai_action_correlation_idx ON wgos.ai_action_executions(correlation_id,created_at DESC);

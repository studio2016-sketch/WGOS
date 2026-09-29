-- 026 Workflow engine, durable outbox, retry and dead-letter primitives
CREATE TABLE IF NOT EXISTS wgos.workflow_definitions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),brand_id text REFERENCES wgos.brands(id),key text NOT NULL,version integer NOT NULL DEFAULT 1,
 name text NOT NULL,trigger_type text NOT NULL,definition jsonb NOT NULL DEFAULT '{}'::jsonb,status text NOT NULL DEFAULT 'DRAFT',
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(brand_id,key,version)
);
CREATE TABLE IF NOT EXISTS wgos.workflow_runs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workflow_definition_id uuid NOT NULL REFERENCES wgos.workflow_definitions(id),
 brand_id text REFERENCES wgos.brands(id),trigger_ref text,status text NOT NULL DEFAULT 'QUEUED',correlation_id text,
 input jsonb NOT NULL DEFAULT '{}'::jsonb,output jsonb NOT NULL DEFAULT '{}'::jsonb,started_at timestamptz,completed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS wgos.outbox_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),brand_id text REFERENCES wgos.brands(id),topic text NOT NULL,dedupe_key text,
 payload jsonb NOT NULL DEFAULT '{}'::jsonb,status text NOT NULL DEFAULT 'PENDING',attempt_count integer NOT NULL DEFAULT 0,
 next_attempt_at timestamptz NOT NULL DEFAULT now(),last_error text,created_at timestamptz NOT NULL DEFAULT now(),processed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS outbox_dedupe_idx ON wgos.outbox_events(topic,dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS outbox_pending_idx ON wgos.outbox_events(status,next_attempt_at);
CREATE TABLE IF NOT EXISTS wgos.dead_letter_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),outbox_event_id uuid REFERENCES wgos.outbox_events(id),topic text NOT NULL,payload jsonb NOT NULL,
 error text NOT NULL,failed_at timestamptz NOT NULL DEFAULT now(),resolved_at timestamptz,resolution text
);
CREATE TABLE IF NOT EXISTS wgos.external_object_mappings(
 provider text NOT NULL,object_type text NOT NULL,external_id text NOT NULL,internal_type text NOT NULL,internal_id text NOT NULL,
 brand_id text REFERENCES wgos.brands(id),metadata jsonb NOT NULL DEFAULT '{}'::jsonb,created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(provider,object_type,external_id)
);
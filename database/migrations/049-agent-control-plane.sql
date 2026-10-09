-- 049 Agent control-plane primitives
-- DESIGN MIGRATION: source-controlled on research branch. Do not apply to production before architecture/security review.

CREATE TABLE IF NOT EXISTS wgos.agent_definitions(
 id text PRIMARY KEY,
 name text NOT NULL,
 domain text NOT NULL,
 purpose text NOT NULL,
 risk_class smallint NOT NULL CHECK(risk_class BETWEEN 0 AND 3),
 mode text NOT NULL CHECK(mode IN ('OBSERVE','PROPOSE','EXECUTE')),
 active boolean NOT NULL DEFAULT true,
 config jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wgos.agent_runs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 agent_id text NOT NULL REFERENCES wgos.agent_definitions(id),
 brand_id text REFERENCES wgos.brands(id),
 parent_run_id uuid REFERENCES wgos.agent_runs(id),
 requested_by text,
 status text NOT NULL CHECK(status IN ('QUEUED','RUNNING','WAITING_APPROVAL','WAITING_INPUT','SUCCEEDED','FAILED','CANCELLED')),
 risk_class smallint NOT NULL CHECK(risk_class BETWEEN 0 AND 3),
 objective text NOT NULL,
 provider text,
 model text,
 external_run_id text,
 started_at timestamptz,
 completed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_runs_brand_status_idx ON wgos.agent_runs(brand_id,status,created_at DESC);

CREATE TABLE IF NOT EXISTS wgos.agent_events(
 id bigserial PRIMARY KEY,
 run_id uuid NOT NULL REFERENCES wgos.agent_runs(id) ON DELETE CASCADE,
 event_type text NOT NULL,
 actor_type text NOT NULL CHECK(actor_type IN ('AGENT','USER','SYSTEM','TOOL')),
 actor_id text,
 payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_events_run_idx ON wgos.agent_events(run_id,id);

CREATE TABLE IF NOT EXISTS wgos.agent_decisions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 run_id uuid NOT NULL REFERENCES wgos.agent_runs(id) ON DELETE CASCADE,
 brand_id text REFERENCES wgos.brands(id),
 decision text NOT NULL CHECK(decision IN ('APPROVE','MODIFY','REJECT','ASK_WHY')),
 decided_by text NOT NULL,
 rationale text,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wgos.agent_artifacts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 run_id uuid NOT NULL REFERENCES wgos.agent_runs(id) ON DELETE CASCADE,
 artifact_type text NOT NULL CHECK(artifact_type IN ('REPORT','PREVIEW','DIFF','SCREENSHOT','VIDEO','LOG','TEST','DOCUMENT')),
 label text NOT NULL,
 uri text,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wgos.agent_metrics(
 id bigserial PRIMARY KEY,
 run_id uuid NOT NULL REFERENCES wgos.agent_runs(id) ON DELETE CASCADE,
 metric_name text NOT NULL,
 metric_value numeric,
 unit text,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);

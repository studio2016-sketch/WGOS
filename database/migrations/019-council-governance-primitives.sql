-- 019 Council governance primitives
-- Additive/idempotent only. Apply through the WGOS migration process after review.
CREATE TABLE IF NOT EXISTS wgos.audit_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 occurred_at timestamptz NOT NULL DEFAULT now(),
 actor_subject text,
 actor_mode text NOT NULL CHECK(actor_mode IN ('HUMAN','SERVICE','AI','SYSTEM')),
 brand_id text,
 legal_entity_id uuid,
 action text NOT NULL,
 entity_type text NOT NULL,
 entity_id text,
 request_id text,
 correlation_id text,
 source text,
 change_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS audit_events_entity_idx ON wgos.audit_events(entity_type,entity_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_brand_time_idx ON wgos.audit_events(brand_id,occurred_at DESC);

CREATE TABLE IF NOT EXISTS wgos.integration_registry(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 brand_id text,
 provider text NOT NULL,
 capability text NOT NULL,
 external_account_ref text,
 status text NOT NULL DEFAULT 'DISCONNECTED' CHECK(status IN ('DISCONNECTED','CONNECTED','DEGRADED','ERROR','DISABLED')),
 last_success_at timestamptz,
 last_error_at timestamptz,
 last_error_code text,
 sync_cursor text,
 config jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(brand_id,provider,capability)
);

CREATE TABLE IF NOT EXISTS wgos.webhook_receipts(
 provider text NOT NULL,
 external_event_id text NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now(),
 processed_at timestamptz,
 status text NOT NULL DEFAULT 'RECEIVED',
 payload_hash text,
 error_code text,
 PRIMARY KEY(provider,external_event_id)
);

CREATE TABLE IF NOT EXISTS wgos.approval_requests(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 brand_id text,
 action_type text NOT NULL,
 entity_type text,
 entity_id text,
 requested_by text,
 requested_at timestamptz NOT NULL DEFAULT now(),
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED','CANCELLED','EXPIRED')),
 decided_by text,
 decided_at timestamptz,
 expires_at timestamptz,
 request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 decision_note text
);
CREATE INDEX IF NOT EXISTS approval_requests_pending_idx ON wgos.approval_requests(status,requested_at);

CREATE TABLE IF NOT EXISTS wgos.ai_action_policies(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 brand_id text,
 action_type text NOT NULL,
 authority text NOT NULL CHECK(authority IN ('READ','DRAFT','PROPOSE_ACTION','EXECUTE_LOW_RISK','EXECUTE_APPROVED')),
 requires_approval boolean NOT NULL DEFAULT false,
 enabled boolean NOT NULL DEFAULT true,
 constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(brand_id,action_type)
);

CREATE TABLE IF NOT EXISTS wgos.document_versions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 brand_id text,
 document_type text NOT NULL,
 document_id text NOT NULL,
 version integer NOT NULL,
 content_hash text NOT NULL,
 storage_ref text NOT NULL,
 immutable boolean NOT NULL DEFAULT true,
 created_by text,
 created_at timestamptz NOT NULL DEFAULT now(),
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 UNIQUE(document_id,version)
);
CREATE INDEX IF NOT EXISTS document_versions_lookup_idx ON wgos.document_versions(document_id,version DESC);

CREATE TABLE IF NOT EXISTS wgos.notification_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 brand_id text,
 recipient_subject text,
 channel text NOT NULL,
 template_key text,
 status text NOT NULL DEFAULT 'QUEUED',
 dedupe_key text,
 payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 scheduled_at timestamptz,
 sent_at timestamptz,
 failed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS notification_events_dedupe_idx ON wgos.notification_events(dedupe_key) WHERE dedupe_key IS NOT NULL;

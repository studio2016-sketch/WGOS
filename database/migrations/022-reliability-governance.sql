-- 022 Lifecycle idempotency, data classification and recovery metadata
CREATE TABLE IF NOT EXISTS wgos.idempotency_keys(
 scope text NOT NULL,key text NOT NULL,request_hash text,response_code integer,response_body jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz,PRIMARY KEY(scope,key)
);
CREATE TABLE IF NOT EXISTS wgos.data_governance_policies(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),data_class text NOT NULL,record_type text NOT NULL,
 retention_days integer,legal_hold_supported boolean NOT NULL DEFAULT false,exportable boolean NOT NULL DEFAULT true,
 deletion_mode text NOT NULL DEFAULT 'REVIEW' CHECK(deletion_mode IN ('REVIEW','ANONYMIZE','DELETE','RETAIN')),
 notes text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(data_class,record_type)
);
CREATE TABLE IF NOT EXISTS wgos.system_health_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),component text NOT NULL,status text NOT NULL,
 correlation_id text,details jsonb NOT NULL DEFAULT '{}'::jsonb,occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS system_health_component_idx ON wgos.system_health_events(component,occurred_at DESC);
INSERT INTO wgos.data_governance_policies(data_class,record_type,retention_days,legal_hold_supported,exportable,deletion_mode,notes) VALUES
('BUSINESS','opportunity',2555,true,true,'REVIEW','Commercial history; retention subject to legal/accounting requirements.'),
('LEGAL','contract',NULL,true,true,'RETAIN','Signed legal artifacts require explicit retention review.'),
('FINANCIAL','payment',NULL,true,true,'RETAIN','Provider/accounting records govern retention.'),
('PERSONAL','person',NULL,true,true,'REVIEW','Deletion requests require relationship/legal review.'),
('SECURITY','audit_event',2555,true,true,'RETAIN','Append-only security and material mutation history.')
ON CONFLICT(data_class,record_type) DO NOTHING;
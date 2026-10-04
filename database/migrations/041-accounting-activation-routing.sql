-- 041 Multi-entity accounting activation and routing
CREATE TABLE IF NOT EXISTS wgos.accounting_entity_profiles(
 brand_id text PRIMARY KEY REFERENCES wgos.brands(id) ON DELETE CASCADE,
 provider text NOT NULL DEFAULT 'QUICKBOOKS',
 plan_target text NOT NULL DEFAULT 'LITE',
 activation_policy text NOT NULL DEFAULT 'FIRST_DEPOSIT' CHECK(activation_policy IN ('FIRST_DEPOSIT','MANUAL','IMMEDIATE')),
 activation_status text NOT NULL DEFAULT 'NOT_FUNDED' CHECK(activation_status IN ('NOT_FUNDED','READY_TO_ACTIVATE','CONNECTED','PAUSED')),
 first_deposit_payment_id uuid REFERENCES wgos.payments(id) ON DELETE SET NULL,
 first_deposit_amount numeric(12,2),
 first_deposit_at timestamptz,
 reserve_mode text NOT NULL DEFAULT 'FIXED' CHECK(reserve_mode IN ('FIXED','PERCENT')),
 reserve_value numeric(12,2) NOT NULL DEFAULT 20,
 reserve_amount numeric(12,2),
 provider_company_id text,
 provider_company_name text,
 connected_at timestamptz,
 last_sync_at timestamptz,
 sync_enabled boolean NOT NULL DEFAULT false,
 notes text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS accounting_entity_profiles_status_idx ON wgos.accounting_entity_profiles(activation_status,provider);

CREATE TABLE IF NOT EXISTS wgos.accounting_routing_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 payment_id uuid REFERENCES wgos.payments(id) ON DELETE SET NULL,
 event_type text NOT NULL CHECK(event_type IN ('FIRST_DEPOSIT_DETECTED','ACTIVATION_READY','PROVIDER_CONNECTED','SYNC_ENABLED','SYNC_DISABLED','ROUTING_CHANGED')),
 provider text,
 amount numeric(12,2),
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_by text REFERENCES wgos.app_users(auth_user_id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS accounting_routing_events_brand_idx ON wgos.accounting_routing_events(brand_id,created_at DESC);

INSERT INTO wgos.accounting_entity_profiles(brand_id)
SELECT id FROM wgos.brands
ON CONFLICT(brand_id) DO NOTHING;

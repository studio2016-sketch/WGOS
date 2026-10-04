-- 046 Virtual cash envelopes and allocation policies
CREATE TABLE IF NOT EXISTS wgos.cash_allocation_policies(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 bucket_name text NOT NULL,
 bucket_type text NOT NULL DEFAULT 'CUSTOM' CHECK(bucket_type IN ('TAX_RESERVE','OPERATING_RESERVE','OWNER_PAY','PROFIT','MARKETING','EQUIPMENT','PAYROLL','CUSTOM')),
 allocation_pct numeric(6,3) NOT NULL DEFAULT 0 CHECK(allocation_pct BETWEEN 0 AND 100),
 active boolean NOT NULL DEFAULT false,
 priority integer NOT NULL DEFAULT 100,
 notes text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(brand_id,bucket_name)
);
CREATE INDEX IF NOT EXISTS cash_allocation_policy_brand_idx ON wgos.cash_allocation_policies(brand_id,active,priority);

CREATE TABLE IF NOT EXISTS wgos.cash_allocations(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 payment_id uuid REFERENCES wgos.payments(id) ON DELETE CASCADE,
 policy_id uuid REFERENCES wgos.cash_allocation_policies(id) ON DELETE SET NULL,
 bucket_name text NOT NULL,
 source_amount_cents bigint NOT NULL,
 allocated_amount_cents bigint NOT NULL,
 allocation_pct numeric(6,3) NOT NULL,
 status text NOT NULL DEFAULT 'EARMARKED' CHECK(status IN ('EARMARKED','RELEASED','USED','VOID')),
 notes text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(payment_id,policy_id)
);
CREATE INDEX IF NOT EXISTS cash_allocations_brand_idx ON wgos.cash_allocations(brand_id,status,created_at DESC);

CREATE OR REPLACE VIEW wgos.cash_envelope_summary AS
SELECT p.brand_id,p.bucket_name,p.bucket_type,p.active,p.allocation_pct,
 COALESCE(sum(CASE WHEN a.status='EARMARKED' THEN a.allocated_amount_cents ELSE 0 END),0)::bigint earmarked_cents,
 COALESCE(sum(CASE WHEN a.status='USED' THEN a.allocated_amount_cents ELSE 0 END),0)::bigint used_cents,
 COALESCE(sum(CASE WHEN a.status='RELEASED' THEN a.allocated_amount_cents ELSE 0 END),0)::bigint released_cents
FROM wgos.cash_allocation_policies p
LEFT JOIN wgos.cash_allocations a ON a.policy_id=p.id
GROUP BY p.brand_id,p.bucket_name,p.bucket_type,p.active,p.allocation_pct;

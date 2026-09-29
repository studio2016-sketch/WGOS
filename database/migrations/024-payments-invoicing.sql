-- 024 Payments, invoices and provider-neutral financial execution
CREATE TABLE IF NOT EXISTS wgos.invoices(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),brand_id text NOT NULL REFERENCES wgos.brands(id),opportunity_id uuid REFERENCES wgos.opportunities(id),
 contract_id uuid REFERENCES wgos.contracts(id),organization_id uuid REFERENCES wgos.organizations(id),
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','OPEN','PARTIALLY_PAID','PAID','VOID','UNCOLLECTIBLE')),
 invoice_number text,total_cents bigint NOT NULL DEFAULT 0,amount_due_cents bigint NOT NULL DEFAULT 0,currency char(3) NOT NULL DEFAULT 'USD',
 due_at timestamptz,issued_at timestamptz,paid_at timestamptz,external_provider text,external_invoice_id text,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS invoice_provider_id_idx ON wgos.invoices(external_provider,external_invoice_id) WHERE external_invoice_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS wgos.payment_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),brand_id text NOT NULL REFERENCES wgos.brands(id),invoice_id uuid REFERENCES wgos.invoices(id),
 provider text NOT NULL,external_payment_id text,event_type text NOT NULL,amount_cents bigint NOT NULL,currency char(3) NOT NULL DEFAULT 'USD',
 status text NOT NULL,occurred_at timestamptz NOT NULL DEFAULT now(),metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_external_event_idx ON wgos.payment_events(provider,external_payment_id,event_type) WHERE external_payment_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS wgos.refund_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),payment_event_id uuid NOT NULL REFERENCES wgos.payment_events(id),
 provider text NOT NULL,external_refund_id text,amount_cents bigint NOT NULL,status text NOT NULL,reason text,
 occurred_at timestamptz NOT NULL DEFAULT now(),metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE UNIQUE INDEX IF NOT EXISTS refund_external_idx ON wgos.refund_events(provider,external_refund_id) WHERE external_refund_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS wgos.brand_payment_profiles(
 brand_id text PRIMARY KEY REFERENCES wgos.brands(id),provider text NOT NULL,external_account_ref text,status text NOT NULL DEFAULT 'DISCONNECTED',
 currency char(3) NOT NULL DEFAULT 'USD',updated_at timestamptz NOT NULL DEFAULT now()
);
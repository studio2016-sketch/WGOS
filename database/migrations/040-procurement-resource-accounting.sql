-- 040 Procurement, resource conflicts and contract accounting subledger
CREATE TABLE IF NOT EXISTS wgos.vendor_profiles(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 organization_id uuid REFERENCES wgos.organizations(id) ON DELETE SET NULL,
 contact_id uuid REFERENCES wgos.contacts(id) ON DELETE SET NULL,
 vendor_name text NOT NULL,
 category text,
 status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','ON_HOLD','INACTIVE')),
 payment_terms text,
 tax_document_status text NOT NULL DEFAULT 'UNKNOWN' CHECK(tax_document_status IN ('UNKNOWN','REQUESTED','RECEIVED','APPROVED')),
 insurance_status text NOT NULL DEFAULT 'NOT_REQUIRED' CHECK(insurance_status IN ('NOT_REQUIRED','REQUESTED','RECEIVED','APPROVED','EXPIRED')),
 notes text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vendor_profiles_brand_idx ON wgos.vendor_profiles(brand_id,status,vendor_name);

CREATE TABLE IF NOT EXISTS wgos.purchase_orders(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 contract_control_id uuid NOT NULL REFERENCES wgos.contract_controls(id) ON DELETE CASCADE,
 project_id uuid REFERENCES wgos.projects(id) ON DELETE SET NULL,
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 vendor_profile_id uuid REFERENCES wgos.vendor_profiles(id) ON DELETE SET NULL,
 po_number text,
 title text NOT NULL,
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','REQUESTED','APPROVED','ISSUED','PARTIALLY_RECEIVED','RECEIVED','CANCELLED','CLOSED')),
 subtotal_cents bigint NOT NULL DEFAULT 0,
 tax_cents bigint NOT NULL DEFAULT 0,
 shipping_cents bigint NOT NULL DEFAULT 0,
 total_cents bigint NOT NULL DEFAULT 0,
 deposit_cents bigint NOT NULL DEFAULT 0,
 balance_due_cents bigint NOT NULL DEFAULT 0,
 ordered_at timestamptz,
 expected_at timestamptz,
 received_at timestamptz,
 payment_status text NOT NULL DEFAULT 'UNPAID' CHECK(payment_status IN ('UNPAID','PARTIALLY_PAID','PAID','DISPUTED','VOID')),
 external_ref text,
 notes text,
 created_by text REFERENCES wgos.app_users(auth_user_id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(brand_id,po_number)
);
CREATE INDEX IF NOT EXISTS purchase_orders_contract_idx ON wgos.purchase_orders(contract_control_id,status,expected_at);

CREATE TABLE IF NOT EXISTS wgos.purchase_order_items(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 purchase_order_id uuid NOT NULL REFERENCES wgos.purchase_orders(id) ON DELETE CASCADE,
 description text NOT NULL,
 quantity numeric(12,2) NOT NULL DEFAULT 1 CHECK(quantity>0),
 unit_cost_cents bigint NOT NULL DEFAULT 0,
 total_cents bigint NOT NULL DEFAULT 0,
 received_quantity numeric(12,2) NOT NULL DEFAULT 0,
 notes text
);

CREATE TABLE IF NOT EXISTS wgos.contract_ledger_entries(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 contract_control_id uuid NOT NULL REFERENCES wgos.contract_controls(id) ON DELETE CASCADE,
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 entry_date date NOT NULL DEFAULT current_date,
 entry_type text NOT NULL CHECK(entry_type IN ('REVENUE','RECEIVABLE','CASH_RECEIPT','COST_COMMITMENT','EXPENSE','PAYABLE','CASH_DISBURSEMENT','REFUND','ADJUSTMENT')),
 category text NOT NULL,
 description text NOT NULL,
 amount_cents bigint NOT NULL,
 source_type text,
 source_id text,
 posted boolean NOT NULL DEFAULT false,
 notes text,
 created_by text REFERENCES wgos.app_users(auth_user_id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contract_ledger_control_idx ON wgos.contract_ledger_entries(contract_control_id,entry_date,entry_type);

CREATE TABLE IF NOT EXISTS wgos.accounting_sync_queue(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 contract_control_id uuid REFERENCES wgos.contract_controls(id) ON DELETE CASCADE,
 provider text,
 object_type text NOT NULL,
 internal_id text NOT NULL,
 action text NOT NULL DEFAULT 'UPSERT',
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','READY','SYNCED','ERROR','SKIPPED')),
 external_id text,
 last_error text,
 payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS accounting_sync_queue_status_idx ON wgos.accounting_sync_queue(status,created_at);

CREATE OR REPLACE VIEW wgos.contract_financial_summary AS
SELECT cc.id contract_control_id,cc.brand_id,cc.agreement_id,cc.proposal_id,
 COALESCE(p.one_time_total,0)::numeric contract_value,
 COALESCE((SELECT sum(py.amount) FROM wgos.payments py WHERE py.proposal_id=cc.proposal_id AND py.status IN ('PAID','SUCCEEDED','COMPLETED')),0)::numeric collected,
 COALESCE((SELECT sum(i.due_cents)/100.0 FROM wgos.invoices i WHERE i.agreement_id=cc.agreement_id AND i.status NOT IN ('VOID','PAID')),0)::numeric accounts_receivable,
 COALESCE((SELECT sum(c.amount_cents)/100.0 FROM wgos.contract_costs c WHERE c.contract_control_id=cc.id AND c.payment_status<>'VOID'),0)::numeric entered_costs,
 COALESCE((SELECT sum(cb.rate_cents+cb.per_diem_cents)/100.0 FROM wgos.crew_bookings cb WHERE cb.contract_control_id=cc.id AND cb.booking_status NOT IN ('DECLINED','CANCELLED')),0)::numeric personnel_commitments,
 COALESCE((SELECT sum(po.balance_due_cents)/100.0 FROM wgos.purchase_orders po WHERE po.contract_control_id=cc.id AND po.status NOT IN ('CANCELLED','CLOSED') AND po.payment_status<>'PAID'),0)::numeric open_purchase_commitments,
 COALESCE((SELECT sum(c.amount_cents)/100.0 FROM wgos.contract_costs c WHERE c.contract_control_id=cc.id AND c.payment_status IN ('UNPAID','APPROVED','SCHEDULED','DISPUTED')),0)::numeric accounts_payable
FROM wgos.contract_controls cc JOIN wgos.proposals p ON p.id=cc.proposal_id;

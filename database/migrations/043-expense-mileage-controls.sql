-- 043 Expense, mileage, reimbursement, budget, forecast and matching
CREATE TABLE IF NOT EXISTS wgos.expense_claims(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 contract_control_id uuid REFERENCES wgos.contract_controls(id) ON DELETE SET NULL,
 project_id uuid REFERENCES wgos.projects(id) ON DELETE SET NULL,
 claimant_subject text REFERENCES wgos.app_users(auth_user_id) ON DELETE SET NULL,
 claimant_contact_id uuid REFERENCES wgos.contacts(id) ON DELETE SET NULL,
 merchant text,
 description text NOT NULL,
 category text NOT NULL DEFAULT 'MISC',
 amount_cents bigint NOT NULL CHECK(amount_cents>=0),
 expense_date date NOT NULL DEFAULT current_date,
 reimbursable boolean NOT NULL DEFAULT true,
 billable_to_client boolean NOT NULL DEFAULT false,
 receipt_ref text,
 receipt_capture_status text NOT NULL DEFAULT 'NOT_ATTACHED' CHECK(receipt_capture_status IN ('NOT_ATTACHED','ATTACHED','EXTRACT_PENDING','EXTRACTED','REVIEW_REQUIRED')),
 extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','SCHEDULED','REIMBURSED','VOID')),
 approver_subject text REFERENCES wgos.app_users(auth_user_id) ON DELETE SET NULL,
 approved_at timestamptz,
 reimbursed_at timestamptz,
 payment_ref text,
 duplicate_key text,
 notes text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS expense_claims_brand_status_idx ON wgos.expense_claims(brand_id,status,expense_date DESC);
CREATE INDEX IF NOT EXISTS expense_claims_contract_idx ON wgos.expense_claims(contract_control_id,status);

CREATE TABLE IF NOT EXISTS wgos.mileage_policies(
 brand_id text PRIMARY KEY REFERENCES wgos.brands(id) ON DELETE CASCADE,
 rate_cents_per_mile integer NOT NULL DEFAULT 0 CHECK(rate_cents_per_mile>=0),
 effective_date date NOT NULL DEFAULT current_date,
 require_origin_destination boolean NOT NULL DEFAULT true,
 require_business_purpose boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wgos.mileage_claims(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 contract_control_id uuid REFERENCES wgos.contract_controls(id) ON DELETE SET NULL,
 project_id uuid REFERENCES wgos.projects(id) ON DELETE SET NULL,
 claimant_subject text REFERENCES wgos.app_users(auth_user_id) ON DELETE SET NULL,
 claimant_contact_id uuid REFERENCES wgos.contacts(id) ON DELETE SET NULL,
 trip_date date NOT NULL DEFAULT current_date,
 origin text,
 destination text,
 business_purpose text NOT NULL,
 miles numeric(10,2) NOT NULL CHECK(miles>=0),
 rate_cents_per_mile integer NOT NULL DEFAULT 0 CHECK(rate_cents_per_mile>=0),
 reimbursement_cents bigint NOT NULL DEFAULT 0,
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','SCHEDULED','REIMBURSED','VOID')),
 approver_subject text REFERENCES wgos.app_users(auth_user_id) ON DELETE SET NULL,
 approved_at timestamptz,
 reimbursed_at timestamptz,
 payment_ref text,
 notes text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mileage_claims_brand_status_idx ON wgos.mileage_claims(brand_id,status,trip_date DESC);

CREATE TABLE IF NOT EXISTS wgos.spend_budgets(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 contract_control_id uuid REFERENCES wgos.contract_controls(id) ON DELETE CASCADE,
 project_id uuid REFERENCES wgos.projects(id) ON DELETE CASCADE,
 category text NOT NULL DEFAULT 'TOTAL',
 budget_cents bigint NOT NULL CHECK(budget_cents>=0),
 warning_pct integer NOT NULL DEFAULT 80 CHECK(warning_pct BETWEEN 1 AND 100),
 hard_stop_pct integer CHECK(hard_stop_pct IS NULL OR hard_stop_pct BETWEEN 1 AND 500),
 notes text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS spend_budgets_scope_unique ON wgos.spend_budgets(brand_id,COALESCE(contract_control_id,'00000000-0000-0000-0000-000000000000'::uuid),COALESCE(project_id,'00000000-0000-0000-0000-000000000000'::uuid),category);

CREATE TABLE IF NOT EXISTS wgos.spend_approval_rules(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 category text,
 threshold_cents bigint NOT NULL DEFAULT 0 CHECK(threshold_cents>=0),
 approver_subject text REFERENCES wgos.app_users(auth_user_id) ON DELETE SET NULL,
 active boolean NOT NULL DEFAULT true,
 notes text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS spend_approval_rules_brand_idx ON wgos.spend_approval_rules(brand_id,active,threshold_cents);

CREATE TABLE IF NOT EXISTS wgos.bank_transaction_inbox(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 provider text,
 external_account_id text,
 external_transaction_id text,
 posted_date date NOT NULL,
 description text NOT NULL,
 amount_cents bigint NOT NULL,
 direction text NOT NULL CHECK(direction IN ('INFLOW','OUTFLOW')),
 status text NOT NULL DEFAULT 'UNMATCHED' CHECK(status IN ('UNMATCHED','SUGGESTED','MATCHED','IGNORED')),
 matched_object_type text,
 matched_object_id text,
 confidence integer CHECK(confidence IS NULL OR confidence BETWEEN 0 AND 100),
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(provider,external_account_id,external_transaction_id)
);
CREATE INDEX IF NOT EXISTS bank_transaction_inbox_brand_idx ON wgos.bank_transaction_inbox(brand_id,status,posted_date DESC);

CREATE OR REPLACE VIEW wgos.cash_flow_forecast AS
SELECT x.brand_id,x.forecast_date,
 SUM(x.inflow_cents)::bigint inflow_cents,
 SUM(x.outflow_cents)::bigint outflow_cents,
 (SUM(x.inflow_cents)-SUM(x.outflow_cents))::bigint net_cents
FROM (
 SELECT p.brand_id,COALESCE(i.due_at::date,current_date) forecast_date,
  GREATEST(i.due_cents,0)::bigint inflow_cents,0::bigint outflow_cents
 FROM wgos.invoices i JOIN wgos.proposals p ON p.id=i.proposal_id
 WHERE i.status IN ('OPEN','PARTIALLY_PAID')
 UNION ALL
 SELECT c.brand_id,COALESCE(c.due_at::date,current_date),0::bigint,GREATEST(c.amount_cents,0)::bigint
 FROM wgos.contract_costs c WHERE c.payment_status IN ('UNPAID','APPROVED','SCHEDULED')
 UNION ALL
 SELECT cb.brand_id,COALESCE(cb.call_at::date,current_date),0::bigint,GREATEST(cb.rate_cents+cb.per_diem_cents,0)::bigint
 FROM wgos.crew_bookings cb WHERE cb.payment_status IN ('DUE','APPROVED','SCHEDULED')
 UNION ALL
 SELECT ec.brand_id,COALESCE(ec.expense_date,current_date),0::bigint,GREATEST(ec.amount_cents,0)::bigint
 FROM wgos.expense_claims ec WHERE ec.status IN ('APPROVED','SCHEDULED')
 UNION ALL
 SELECT mc.brand_id,COALESCE(mc.trip_date,current_date),0::bigint,GREATEST(mc.reimbursement_cents,0)::bigint
 FROM wgos.mileage_claims mc WHERE mc.status IN ('APPROVED','SCHEDULED')
) x
GROUP BY x.brand_id,x.forecast_date;

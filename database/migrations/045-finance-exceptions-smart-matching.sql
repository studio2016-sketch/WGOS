-- 045 Smart matching and finance exceptions
CREATE TABLE IF NOT EXISTS wgos.bank_match_suggestions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 bank_transaction_id uuid NOT NULL REFERENCES wgos.bank_transaction_inbox(id) ON DELETE CASCADE,
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 candidate_type text NOT NULL CHECK(candidate_type IN ('EXPENSE_CLAIM','MILEAGE_CLAIM','CONTRACT_COST','INVOICE','PAYMENT','PURCHASE_ORDER','PERSONNEL_PAYABLE')),
 candidate_id text NOT NULL,
 candidate_label text NOT NULL,
 candidate_amount_cents bigint NOT NULL,
 score integer NOT NULL CHECK(score BETWEEN 0 AND 100),
 amount_score integer NOT NULL DEFAULT 0,
 date_score integer NOT NULL DEFAULT 0,
 text_score integer NOT NULL DEFAULT 0,
 evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
 status text NOT NULL DEFAULT 'SUGGESTED' CHECK(status IN ('SUGGESTED','ACCEPTED','REJECTED','STALE')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(bank_transaction_id,candidate_type,candidate_id)
);
CREATE INDEX IF NOT EXISTS bank_match_suggestions_tx_idx ON wgos.bank_match_suggestions(bank_transaction_id,status,score DESC);

CREATE TABLE IF NOT EXISTS wgos.finance_exception_alerts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 contract_control_id uuid REFERENCES wgos.contract_controls(id) ON DELETE CASCADE,
 project_id uuid REFERENCES wgos.projects(id) ON DELETE SET NULL,
 alert_type text NOT NULL CHECK(alert_type IN ('BUDGET_WARNING','BUDGET_EXCEEDED','APPROVAL_REQUIRED','DUPLICATE_EXPENSE','MISSING_RECEIPT','STALE_RECEIVABLE','OVERDUE_PAYABLE','UNMATCHED_BANK','NEGATIVE_CASH_WINDOW','MARGIN_RISK','OTHER')),
 severity text NOT NULL DEFAULT 'INFO' CHECK(severity IN ('INFO','WATCH','HIGH','CRITICAL')),
 title text NOT NULL,
 detail text,
 source_type text,
 source_id text,
 amount_cents bigint,
 due_at timestamptz,
 status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','ACKNOWLEDGED','RESOLVED','DISMISSED')),
 resolution_notes text,
 resolved_by text REFERENCES wgos.app_users(auth_user_id) ON DELETE SET NULL,
 resolved_at timestamptz,
 fingerprint text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(fingerprint)
);
CREATE INDEX IF NOT EXISTS finance_exception_alerts_open_idx ON wgos.finance_exception_alerts(brand_id,status,severity,created_at DESC);

CREATE TABLE IF NOT EXISTS wgos.finance_automation_policies(
 brand_id text PRIMARY KEY REFERENCES wgos.brands(id) ON DELETE CASCADE,
 auto_accept_match_score integer NOT NULL DEFAULT 98 CHECK(auto_accept_match_score BETWEEN 90 AND 100),
 suggest_match_score integer NOT NULL DEFAULT 70 CHECK(suggest_match_score BETWEEN 1 AND 100),
 missing_receipt_threshold_cents bigint NOT NULL DEFAULT 7500,
 stale_receivable_days integer NOT NULL DEFAULT 15,
 overdue_payable_days integer NOT NULL DEFAULT 1,
 negative_cash_window_days integer NOT NULL DEFAULT 30,
 margin_warning_pct numeric(6,2) NOT NULL DEFAULT 25,
 updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO wgos.finance_automation_policies(brand_id)
SELECT id FROM wgos.brands
ON CONFLICT(brand_id) DO NOTHING;

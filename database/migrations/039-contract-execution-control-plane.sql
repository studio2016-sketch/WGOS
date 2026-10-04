-- 039 Contract execution control plane
CREATE TABLE IF NOT EXISTS wgos.contract_controls(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 agreement_id uuid NOT NULL UNIQUE REFERENCES wgos.agreements(id) ON DELETE CASCADE,
 proposal_id uuid NOT NULL REFERENCES wgos.proposals(id) ON DELETE CASCADE,
 project_id uuid REFERENCES wgos.projects(id) ON DELETE SET NULL,
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','AT_RISK','COMPLETE','CANCELLED')),
 owner_subject text REFERENCES wgos.app_users(auth_user_id) ON DELETE SET NULL,
 started_at timestamptz NOT NULL DEFAULT now(),
 target_complete_at timestamptz,
 completed_at timestamptz,
 closeout_status text NOT NULL DEFAULT 'OPEN' CHECK(closeout_status IN ('OPEN','READY','CLOSED')),
 notes text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contract_controls_brand_idx ON wgos.contract_controls(brand_id,status,updated_at DESC);

CREATE TABLE IF NOT EXISTS wgos.contract_obligations(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 contract_control_id uuid NOT NULL REFERENCES wgos.contract_controls(id) ON DELETE CASCADE,
 agreement_id uuid NOT NULL REFERENCES wgos.agreements(id) ON DELETE CASCADE,
 project_id uuid REFERENCES wgos.projects(id) ON DELETE SET NULL,
 task_id uuid REFERENCES wgos.tasks(id) ON DELETE SET NULL,
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 title text NOT NULL,
 description text,
 obligation_type text NOT NULL DEFAULT 'SERVICE' CHECK(obligation_type IN ('SERVICE','DELIVERABLE','PAYMENT','CLIENT_INPUT','STAFFING','TRAVEL','DOCUMENT','APPROVAL','COMPLIANCE','OTHER')),
 responsible_party text NOT NULL DEFAULT 'US' CHECK(responsible_party IN ('US','CLIENT','VENDOR','SHARED')),
 owner_subject text REFERENCES wgos.app_users(auth_user_id) ON DELETE SET NULL,
 due_at timestamptz,
 status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','IN_PROGRESS','WAITING','BLOCKED','SATISFIED','WAIVED','BREACHED','CANCELLED')),
 priority text NOT NULL DEFAULT 'MEDIUM' CHECK(priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
 source_clause text,
 source_ref text,
 evidence_ref text,
 financial_impact_cents bigint NOT NULL DEFAULT 0,
 dependency_notes text,
 satisfied_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contract_obligations_control_idx ON wgos.contract_obligations(contract_control_id,status,due_at);
CREATE INDEX IF NOT EXISTS contract_obligations_due_idx ON wgos.contract_obligations(due_at,status);

CREATE TABLE IF NOT EXISTS wgos.contract_deliverables(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 contract_control_id uuid NOT NULL REFERENCES wgos.contract_controls(id) ON DELETE CASCADE,
 obligation_id uuid REFERENCES wgos.contract_obligations(id) ON DELETE SET NULL,
 project_id uuid REFERENCES wgos.projects(id) ON DELETE SET NULL,
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 title text NOT NULL,
 owner_subject text REFERENCES wgos.app_users(auth_user_id) ON DELETE SET NULL,
 client_input_due_at timestamptz,
 internal_due_at timestamptz,
 client_approval_due_at timestamptz,
 final_due_at timestamptz,
 status text NOT NULL DEFAULT 'PLANNED' CHECK(status IN ('PLANNED','WAITING_INPUT','IN_PROGRESS','CLIENT_REVIEW','APPROVED','DELIVERED','BLOCKED','CANCELLED')),
 acceptance_criteria text,
 artifact_ref text,
 notes text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contract_deliverables_due_idx ON wgos.contract_deliverables(contract_control_id,final_due_at,status);

CREATE TABLE IF NOT EXISTS wgos.crew_bookings(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 contract_control_id uuid NOT NULL REFERENCES wgos.contract_controls(id) ON DELETE CASCADE,
 project_id uuid REFERENCES wgos.projects(id) ON DELETE SET NULL,
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 crew_profile_id uuid REFERENCES wgos.crew_profiles(id) ON DELETE SET NULL,
 contact_id uuid REFERENCES wgos.contacts(id) ON DELETE SET NULL,
 role_name text NOT NULL,
 booking_status text NOT NULL DEFAULT 'PROPOSED' CHECK(booking_status IN ('PROPOSED','INVITED','HELD','CONFIRMED','DECLINED','CANCELLED','COMPLETED')),
 call_at timestamptz,
 release_at timestamptz,
 rehearsal_at timestamptz,
 rate_type text NOT NULL DEFAULT 'FLAT' CHECK(rate_type IN ('FLAT','HOURLY','DAY','WEEKLY')),
 rate_cents bigint NOT NULL DEFAULT 0,
 overtime_rate_cents bigint NOT NULL DEFAULT 0,
 travel_required boolean NOT NULL DEFAULT false,
 hotel_required boolean NOT NULL DEFAULT false,
 per_diem_cents bigint NOT NULL DEFAULT 0,
 paperwork_status text NOT NULL DEFAULT 'NOT_REQUIRED' CHECK(paperwork_status IN ('NOT_REQUIRED','REQUESTED','RECEIVED','APPROVED')),
 payment_status text NOT NULL DEFAULT 'NOT_DUE' CHECK(payment_status IN ('NOT_DUE','DUE','APPROVED','SCHEDULED','PAID','DISPUTED')),
 notes text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crew_bookings_contract_idx ON wgos.crew_bookings(contract_control_id,booking_status,call_at);

CREATE TABLE IF NOT EXISTS wgos.time_entries(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 contract_control_id uuid NOT NULL REFERENCES wgos.contract_controls(id) ON DELETE CASCADE,
 project_id uuid REFERENCES wgos.projects(id) ON DELETE SET NULL,
 crew_booking_id uuid REFERENCES wgos.crew_bookings(id) ON DELETE SET NULL,
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 worker_subject text REFERENCES wgos.app_users(auth_user_id) ON DELETE SET NULL,
 contact_id uuid REFERENCES wgos.contacts(id) ON DELETE SET NULL,
 work_type text NOT NULL DEFAULT 'LABOR',
 started_at timestamptz NOT NULL,
 ended_at timestamptz NOT NULL,
 break_minutes integer NOT NULL DEFAULT 0 CHECK(break_minutes>=0),
 hours numeric(8,2) NOT NULL DEFAULT 0,
 hourly_rate_cents bigint NOT NULL DEFAULT 0,
 labor_cost_cents bigint NOT NULL DEFAULT 0,
 status text NOT NULL DEFAULT 'SUBMITTED' CHECK(status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED')),
 approved_by text REFERENCES wgos.app_users(auth_user_id) ON DELETE SET NULL,
 approved_at timestamptz,
 notes text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS time_entries_contract_idx ON wgos.time_entries(contract_control_id,status,started_at);

CREATE TABLE IF NOT EXISTS wgos.contract_costs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 contract_control_id uuid NOT NULL REFERENCES wgos.contract_controls(id) ON DELETE CASCADE,
 project_id uuid REFERENCES wgos.projects(id) ON DELETE SET NULL,
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 cost_type text NOT NULL CHECK(cost_type IN ('LABOR','RENTAL','EQUIPMENT','TRAVEL','HOTEL','PER_DIEM','FREIGHT','VENDOR','SUBCONTRACTOR','PERMIT','INSURANCE','MEALS','MISC')),
 vendor_name text,
 description text NOT NULL,
 amount_cents bigint NOT NULL CHECK(amount_cents>=0),
 committed boolean NOT NULL DEFAULT true,
 incurred_at timestamptz,
 due_at timestamptz,
 payment_status text NOT NULL DEFAULT 'UNPAID' CHECK(payment_status IN ('UNPAID','APPROVED','SCHEDULED','PAID','DISPUTED','VOID')),
 receipt_ref text,
 external_ref text,
 notes text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contract_costs_control_idx ON wgos.contract_costs(contract_control_id,payment_status,cost_type);

CREATE TABLE IF NOT EXISTS wgos.change_orders(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 contract_control_id uuid NOT NULL REFERENCES wgos.contract_controls(id) ON DELETE CASCADE,
 agreement_id uuid NOT NULL REFERENCES wgos.agreements(id) ON DELETE CASCADE,
 project_id uuid REFERENCES wgos.projects(id) ON DELETE SET NULL,
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 title text NOT NULL,
 request_source text NOT NULL DEFAULT 'CLIENT' CHECK(request_source IN ('CLIENT','INTERNAL','VENDOR','CONDITION')),
 description text NOT NULL,
 reason text,
 schedule_impact text,
 amount_delta_cents bigint NOT NULL DEFAULT 0,
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PENDING_CLIENT','APPROVED','DECLINED','CANCELLED','IMPLEMENTED')),
 requested_at timestamptz NOT NULL DEFAULT now(),
 approved_at timestamptz,
 approval_evidence_ref text,
 created_by text REFERENCES wgos.app_users(auth_user_id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS change_orders_contract_idx ON wgos.change_orders(contract_control_id,status,created_at DESC);

CREATE TABLE IF NOT EXISTS wgos.contract_records(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 contract_control_id uuid NOT NULL REFERENCES wgos.contract_controls(id) ON DELETE CASCADE,
 agreement_id uuid NOT NULL REFERENCES wgos.agreements(id) ON DELETE CASCADE,
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 record_type text NOT NULL CHECK(record_type IN ('AGREEMENT','SOW','CHANGE_ORDER','INVOICE','PAYMENT','RECEIPT','W9','COI','PERMIT','RIDER','STAGE_PLOT','INPUT_LIST','SCHEDULE','APPROVAL','DELIVERABLE','PHOTO','VIDEO','EMAIL','OTHER')),
 title text NOT NULL,
 artifact_ref text,
 external_ref text,
 immutable boolean NOT NULL DEFAULT false,
 notes text,
 created_by text REFERENCES wgos.app_users(auth_user_id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contract_records_control_idx ON wgos.contract_records(contract_control_id,record_type,created_at DESC);

CREATE TABLE IF NOT EXISTS wgos.contract_closeouts(
 contract_control_id uuid PRIMARY KEY REFERENCES wgos.contract_controls(id) ON DELETE CASCADE,
 final_deliverables_complete boolean NOT NULL DEFAULT false,
 final_invoice_complete boolean NOT NULL DEFAULT false,
 client_balance_zero boolean NOT NULL DEFAULT false,
 personnel_paid boolean NOT NULL DEFAULT false,
 vendor_balances_zero boolean NOT NULL DEFAULT false,
 rentals_returned boolean NOT NULL DEFAULT false,
 damage_resolved boolean NOT NULL DEFAULT false,
 records_archived boolean NOT NULL DEFAULT false,
 testimonial_requested boolean NOT NULL DEFAULT false,
 referral_requested boolean NOT NULL DEFAULT false,
 satisfaction_recorded boolean NOT NULL DEFAULT false,
 lessons_recorded boolean NOT NULL DEFAULT false,
 renewal_opportunity_reviewed boolean NOT NULL DEFAULT false,
 notes text,
 closed_by text REFERENCES wgos.app_users(auth_user_id) ON DELETE SET NULL,
 closed_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);

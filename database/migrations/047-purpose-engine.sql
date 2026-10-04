-- 047 Purpose Engine
CREATE TABLE IF NOT EXISTS wgos.purpose_profiles(
 brand_id text PRIMARY KEY REFERENCES wgos.brands(id) ON DELETE CASCADE,
 purpose_statement text,
 mission_statement text,
 vision_statement text,
 primary_beneficiary text,
 core_promise text,
 definition_of_excellence text,
 north_star_metric text,
 planning_horizon text,
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','ACTIVE','ARCHIVED')),
 minimum_alignment_score integer NOT NULL DEFAULT 65 CHECK(minimum_alignment_score BETWEEN 0 AND 100),
 override_below_score integer NOT NULL DEFAULT 45 CHECK(override_below_score BETWEEN 0 AND 100),
 require_override_reason boolean NOT NULL DEFAULT true,
 version integer NOT NULL DEFAULT 1,
 approved_by text REFERENCES wgos.app_users(auth_user_id) ON DELETE SET NULL,
 approved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wgos.purpose_principles(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 principle_type text NOT NULL CHECK(principle_type IN ('VALUE','NON_NEGOTIABLE','SERVICE_STANDARD','FINANCIAL_PRINCIPLE','BRAND_STANDARD','OPERATING_PRINCIPLE')),
 title text NOT NULL,
 description text,
 priority integer NOT NULL DEFAULT 100,
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS purpose_principles_brand_idx ON wgos.purpose_principles(brand_id,active,principle_type,priority);

CREATE TABLE IF NOT EXISTS wgos.strategic_priorities(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 title text NOT NULL,
 description text,
 priority integer NOT NULL DEFAULT 100,
 weight integer NOT NULL DEFAULT 10 CHECK(weight BETWEEN 1 AND 100),
 status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('PLANNED','ACTIVE','PAUSED','COMPLETE','CANCELLED')),
 start_date date,
 target_date date,
 success_metric text,
 target_value numeric,
 current_value numeric,
 owner_subject text REFERENCES wgos.app_users(auth_user_id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS strategic_priorities_brand_idx ON wgos.strategic_priorities(brand_id,status,priority);

CREATE TABLE IF NOT EXISTS wgos.purpose_decision_criteria(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 criterion_key text NOT NULL,
 title text NOT NULL,
 description text,
 weight integer NOT NULL CHECK(weight BETWEEN 1 AND 100),
 hard_gate boolean NOT NULL DEFAULT false,
 minimum_score integer NOT NULL DEFAULT 0 CHECK(minimum_score BETWEEN 0 AND 100),
 active boolean NOT NULL DEFAULT true,
 priority integer NOT NULL DEFAULT 100,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(brand_id,criterion_key)
);
CREATE INDEX IF NOT EXISTS purpose_decision_criteria_brand_idx ON wgos.purpose_decision_criteria(brand_id,active,priority);

CREATE TABLE IF NOT EXISTS wgos.purpose_evaluations(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 subject_type text NOT NULL CHECK(subject_type IN ('OPPORTUNITY','PROPOSAL','AGREEMENT','PROJECT','PURCHASE','HIRE','VENDOR','CAMPAIGN','INITIATIVE','OTHER')),
 subject_id text,
 subject_title text NOT NULL,
 decision_question text,
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','REVIEW','ALIGNED','CONDITIONAL','MISALIGNED','OVERRIDDEN','CANCELLED')),
 weighted_score numeric(6,2),
 hard_gate_failed boolean NOT NULL DEFAULT false,
 recommendation text,
 expected_outcome text,
 assumptions text,
 tradeoffs text,
 override_reason text,
 evaluated_by text REFERENCES wgos.app_users(auth_user_id) ON DELETE SET NULL,
 evaluated_at timestamptz,
 decided_by text REFERENCES wgos.app_users(auth_user_id) ON DELETE SET NULL,
 decided_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS purpose_evaluations_brand_idx ON wgos.purpose_evaluations(brand_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS purpose_evaluations_subject_idx ON wgos.purpose_evaluations(subject_type,subject_id);

CREATE TABLE IF NOT EXISTS wgos.purpose_evaluation_scores(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 evaluation_id uuid NOT NULL REFERENCES wgos.purpose_evaluations(id) ON DELETE CASCADE,
 criterion_id uuid NOT NULL REFERENCES wgos.purpose_decision_criteria(id) ON DELETE CASCADE,
 score integer NOT NULL CHECK(score BETWEEN 0 AND 100),
 evidence text,
 risk text,
 mitigation text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(evaluation_id,criterion_id)
);

CREATE TABLE IF NOT EXISTS wgos.purpose_outcomes(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 evaluation_id uuid NOT NULL REFERENCES wgos.purpose_evaluations(id) ON DELETE CASCADE,
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 expected_result text,
 actual_result text,
 outcome_status text NOT NULL DEFAULT 'PENDING' CHECK(outcome_status IN ('PENDING','SUCCESS','PARTIAL','MISS','CANCELLED')),
 financial_result_cents bigint,
 strategic_result text,
 beneficiary_result text,
 lessons text,
 policy_recommendation text,
 reviewed_by text REFERENCES wgos.app_users(auth_user_id) ON DELETE SET NULL,
 reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(evaluation_id)
);
CREATE INDEX IF NOT EXISTS purpose_outcomes_brand_idx ON wgos.purpose_outcomes(brand_id,outcome_status,updated_at DESC);

INSERT INTO wgos.purpose_profiles(brand_id)
SELECT id FROM wgos.brands
ON CONFLICT(brand_id) DO NOTHING;

INSERT INTO wgos.purpose_decision_criteria(brand_id,criterion_key,title,description,weight,priority)
SELECT b.id,v.criterion_key,v.title,v.description,v.weight,v.priority
FROM wgos.brands b
CROSS JOIN (VALUES
 ('purpose_alignment','Purpose alignment','Directly advances the entity purpose and serves its intended beneficiary.',30,10),
 ('strategic_value','Strategic value','Advances an active strategic priority or strengthens long-term positioning.',20,20),
 ('financial_sustainability','Financial sustainability','Economically responsible and supportive of durable operations.',15,30),
 ('capacity_fit','Capacity and resource fit','Can be executed excellently without damaging higher-priority commitments.',15,40),
 ('brand_reputation','Brand and reputation','Strengthens trust, standards, positioning and relationship quality.',10,50),
 ('learning_scalability','Learning and scalability','Creates reusable learning, systems, assets, relationships or leverage.',10,60)
) AS v(criterion_key,title,description,weight,priority)
ON CONFLICT(brand_id,criterion_key) DO NOTHING;

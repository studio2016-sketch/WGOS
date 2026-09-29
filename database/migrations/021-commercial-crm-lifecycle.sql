-- 021 Commercial CRM and lifecycle
-- Additive/idempotent. Extends live wgos namespace.
CREATE TABLE IF NOT EXISTS wgos.people(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),first_name text NOT NULL,last_name text NOT NULL,
 email text,phone text,title text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS people_email_unique_idx ON wgos.people(lower(email)) WHERE email IS NOT NULL;
CREATE TABLE IF NOT EXISTS wgos.person_brand_relationships(
 person_id uuid NOT NULL REFERENCES wgos.people(id) ON DELETE CASCADE,brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 relationship_type text NOT NULL DEFAULT 'CONTACT',status text NOT NULL DEFAULT 'ACTIVE',owner_subject text REFERENCES wgos.app_users(auth_user_id),
 private_notes text,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(person_id,brand_id)
);
CREATE TABLE IF NOT EXISTS wgos.organization_brand_relationships(
 organization_id uuid NOT NULL REFERENCES wgos.organizations(id) ON DELETE CASCADE,brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 relationship_type text NOT NULL DEFAULT 'CLIENT',status text NOT NULL DEFAULT 'ACTIVE',owner_subject text REFERENCES wgos.app_users(auth_user_id),
 created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(organization_id,brand_id)
);
CREATE TABLE IF NOT EXISTS wgos.opportunities(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),brand_id text NOT NULL REFERENCES wgos.brands(id),organization_id uuid REFERENCES wgos.organizations(id),
 primary_person_id uuid REFERENCES wgos.people(id),title text NOT NULL,stage text NOT NULL DEFAULT 'LEAD' CHECK(stage IN ('LEAD','DISCOVERY','QUALIFIED','PROPOSAL','NEGOTIATION','WON','LOST')),
 value_cents bigint NOT NULL DEFAULT 0 CHECK(value_cents>=0),currency char(3) NOT NULL DEFAULT 'USD',owner_subject text REFERENCES wgos.app_users(auth_user_id),
 source text,next_action text,next_action_at timestamptz,lost_reason text,won_at timestamptz,closed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS opportunities_brand_stage_idx ON wgos.opportunities(brand_id,stage,updated_at DESC);
CREATE TABLE IF NOT EXISTS wgos.proposals(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),opportunity_id uuid NOT NULL REFERENCES wgos.opportunities(id),brand_id text NOT NULL REFERENCES wgos.brands(id),
 version integer NOT NULL DEFAULT 1,status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','READY','SENT','VIEWED','ACCEPTED','DECLINED','EXPIRED','SUPERSEDED')),
 public_path text,total_cents bigint NOT NULL DEFAULT 0,currency char(3) NOT NULL DEFAULT 'USD',content_hash text,expires_at timestamptz,
 sent_at timestamptz,accepted_at timestamptz,created_by text REFERENCES wgos.app_users(auth_user_id),created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(opportunity_id,version)
);
CREATE TABLE IF NOT EXISTS wgos.contracts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),opportunity_id uuid REFERENCES wgos.opportunities(id),proposal_id uuid REFERENCES wgos.proposals(id),
 brand_id text NOT NULL REFERENCES wgos.brands(id),legal_entity_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','READY','SENT','PARTIALLY_SIGNED','SIGNED','VOID','EXPIRED')),
 version integer NOT NULL DEFAULT 1,content_hash text,signature_provider text,external_signature_id text,signed_artifact_ref text,
 sent_at timestamptz,signed_at timestamptz,created_by text REFERENCES wgos.app_users(auth_user_id),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS contracts_external_signature_idx ON wgos.contracts(signature_provider,external_signature_id) WHERE external_signature_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS wgos.commercial_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),brand_id text NOT NULL REFERENCES wgos.brands(id),opportunity_id uuid REFERENCES wgos.opportunities(id),
 event_type text NOT NULL,actor_subject text,occurred_at timestamptz NOT NULL DEFAULT now(),metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS commercial_events_opportunity_idx ON wgos.commercial_events(opportunity_id,occurred_at DESC);
ALTER TABLE wgos.projects ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES wgos.opportunities(id);

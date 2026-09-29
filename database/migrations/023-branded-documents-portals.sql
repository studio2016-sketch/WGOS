-- 023 Branded proposal and contract engine
CREATE TABLE IF NOT EXISTS wgos.brand_experience_profiles(
 brand_id text PRIMARY KEY REFERENCES wgos.brands(id) ON DELETE CASCADE,
 public_domain text NOT NULL,logo_ref text,primary_color text,accent_color text,
 sender_name text,sender_email text,reply_to_email text,
 proposal_path_prefix text NOT NULL DEFAULT '/proposal',contract_path_prefix text NOT NULL DEFAULT '/sign',
 portal_path_prefix text NOT NULL DEFAULT '/client',payment_path_prefix text NOT NULL DEFAULT '/pay',
 theme jsonb NOT NULL DEFAULT '{}'::jsonb,updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS wgos.document_templates(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),brand_id text NOT NULL REFERENCES wgos.brands(id),
 kind text NOT NULL CHECK(kind IN ('PROPOSAL','SOW','CONTRACT','INVOICE','RECEIPT','OTHER')),
 name text NOT NULL,version integer NOT NULL DEFAULT 1,status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','ACTIVE','RETIRED')),
 body_schema jsonb NOT NULL DEFAULT '{}'::jsonb,legal_entity_snapshot_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
 effective_from timestamptz,effective_to timestamptz,created_by text REFERENCES wgos.app_users(auth_user_id),created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(brand_id,kind,name,version)
);
CREATE TABLE IF NOT EXISTS wgos.proposal_sections(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),proposal_id uuid NOT NULL REFERENCES wgos.proposals(id) ON DELETE CASCADE,
 position integer NOT NULL DEFAULT 0,section_type text NOT NULL,title text,content jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS proposal_sections_order_idx ON wgos.proposal_sections(proposal_id,position);
CREATE TABLE IF NOT EXISTS wgos.proposal_line_items(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),proposal_id uuid NOT NULL REFERENCES wgos.proposals(id) ON DELETE CASCADE,
 position integer NOT NULL DEFAULT 0,name text NOT NULL,description text,quantity numeric(12,3) NOT NULL DEFAULT 1,
 unit_amount_cents bigint NOT NULL DEFAULT 0,tax_cents bigint NOT NULL DEFAULT 0,optional boolean NOT NULL DEFAULT false,
 selected boolean NOT NULL DEFAULT true,metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS proposal_line_items_order_idx ON wgos.proposal_line_items(proposal_id,position);
CREATE TABLE IF NOT EXISTS wgos.signature_envelopes(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),contract_id uuid NOT NULL REFERENCES wgos.contracts(id) ON DELETE CASCADE,
 provider text NOT NULL,external_envelope_id text,status text NOT NULL DEFAULT 'DRAFT',
 signing_url_ref text,provider_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 sent_at timestamptz,completed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(provider,external_envelope_id)
);
CREATE TABLE IF NOT EXISTS wgos.client_portal_access(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),brand_id text NOT NULL REFERENCES wgos.brands(id),
 organization_id uuid REFERENCES wgos.organizations(id),person_id uuid REFERENCES wgos.people(id),
 access_subject text NOT NULL,status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','SUSPENDED','REVOKED')),
 last_access_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(brand_id,access_subject)
);

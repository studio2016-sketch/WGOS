-- 029 Reconciled WGOS commissioning migration
-- Extends the live canonical schema. Contacts remain the canonical person model; agreements remain canonical contracts.

CREATE TABLE IF NOT EXISTS wgos.brand_memberships(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),auth_user_id text NOT NULL REFERENCES wgos.app_users(auth_user_id) ON DELETE CASCADE,
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,membership_role text NOT NULL DEFAULT 'MEMBER' CHECK(membership_role IN ('BRAND_ADMIN','MANAGER','MEMBER','VIEWER')),
 active boolean NOT NULL DEFAULT true,granted_by text REFERENCES wgos.app_users(auth_user_id) ON DELETE SET NULL,granted_at timestamptz NOT NULL DEFAULT now(),revoked_at timestamptz,
 UNIQUE(auth_user_id,brand_id));
CREATE INDEX IF NOT EXISTS brand_memberships_user_active_idx ON wgos.brand_memberships(auth_user_id,active);

CREATE TABLE IF NOT EXISTS wgos.approval_requests(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),brand_id text REFERENCES wgos.brands(id),entity_type text NOT NULL,entity_id text NOT NULL,
 action text NOT NULL,status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
 requested_by text REFERENCES wgos.app_users(auth_user_id),decided_by text REFERENCES wgos.app_users(auth_user_id),reason text,
 requested_at timestamptz NOT NULL DEFAULT now(),decided_at timestamptz,metadata jsonb NOT NULL DEFAULT '{}'::jsonb);
CREATE TABLE IF NOT EXISTS wgos.integration_registry(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),brand_id text REFERENCES wgos.brands(id),provider text NOT NULL,capability text NOT NULL,
 status text NOT NULL DEFAULT 'NOT_CONNECTED',last_verified_at timestamptz,last_error text,metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(brand_id,provider,capability));
CREATE TABLE IF NOT EXISTS wgos.document_versions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),brand_id text REFERENCES wgos.brands(id),entity_type text NOT NULL,entity_id text NOT NULL,
 version integer NOT NULL,content_hash text NOT NULL,artifact_ref text,status text NOT NULL DEFAULT 'DRAFT',immutable boolean NOT NULL DEFAULT false,
 created_by text REFERENCES wgos.app_users(auth_user_id),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(entity_type,entity_id,version));
CREATE TABLE IF NOT EXISTS wgos.notification_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),brand_id text REFERENCES wgos.brands(id),recipient_subject text,channel text NOT NULL,event_type text NOT NULL,
 status text NOT NULL DEFAULT 'PENDING',payload jsonb NOT NULL DEFAULT '{}'::jsonb,created_at timestamptz NOT NULL DEFAULT now(),sent_at timestamptz);
CREATE TABLE IF NOT EXISTS wgos.idempotency_keys(scope text NOT NULL,key text NOT NULL,request_hash text,response_code integer,response_body jsonb,created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz,PRIMARY KEY(scope,key));
CREATE TABLE IF NOT EXISTS wgos.data_governance_policies(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),data_class text NOT NULL,record_type text NOT NULL,retention_days integer,legal_hold_supported boolean NOT NULL DEFAULT false,
 exportable boolean NOT NULL DEFAULT true,deletion_mode text NOT NULL DEFAULT 'REVIEW' CHECK(deletion_mode IN ('REVIEW','ANONYMIZE','DELETE','RETAIN')),
 notes text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(data_class,record_type));
CREATE TABLE IF NOT EXISTS wgos.system_health_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),component text NOT NULL,status text NOT NULL,correlation_id text,details jsonb NOT NULL DEFAULT '{}'::jsonb,occurred_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS wgos.brand_experience_profiles(
 brand_id text PRIMARY KEY REFERENCES wgos.brands(id) ON DELETE CASCADE,public_domain text,logo_ref text,primary_color text,accent_color text,
 sender_name text,sender_email text,reply_to_email text,proposal_path_prefix text NOT NULL DEFAULT '/proposal',contract_path_prefix text NOT NULL DEFAULT '/sign',
 portal_path_prefix text NOT NULL DEFAULT '/client',payment_path_prefix text NOT NULL DEFAULT '/pay',theme jsonb NOT NULL DEFAULT '{}'::jsonb,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS wgos.document_templates(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),brand_id text NOT NULL REFERENCES wgos.brands(id),kind text NOT NULL,version integer NOT NULL DEFAULT 1,
 status text NOT NULL DEFAULT 'DRAFT',title text NOT NULL,body_schema jsonb NOT NULL DEFAULT '{}'::jsonb,legal_snapshot_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
 effective_from timestamptz,effective_to timestamptz,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(brand_id,kind,version));
CREATE TABLE IF NOT EXISTS wgos.proposal_sections(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),proposal_id uuid NOT NULL REFERENCES wgos.proposals(id) ON DELETE CASCADE,position integer NOT NULL DEFAULT 0,
 section_type text NOT NULL,title text,content jsonb NOT NULL DEFAULT '{}'::jsonb);
CREATE TABLE IF NOT EXISTS wgos.proposal_line_items(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),proposal_id uuid NOT NULL REFERENCES wgos.proposals(id) ON DELETE CASCADE,position integer NOT NULL DEFAULT 0,
 name text NOT NULL,description text,quantity numeric NOT NULL DEFAULT 1,unit_amount_cents bigint NOT NULL DEFAULT 0,tax_cents bigint NOT NULL DEFAULT 0,
 optional boolean NOT NULL DEFAULT false,selected boolean NOT NULL DEFAULT true,metadata jsonb NOT NULL DEFAULT '{}'::jsonb);
CREATE TABLE IF NOT EXISTS wgos.signature_envelopes(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),agreement_id uuid NOT NULL REFERENCES wgos.\"agreements\"(id) ON DELETE CASCADE,provider text NOT NULL,
 external_envelope_id text,status text NOT NULL DEFAULT 'DRAFT',metadata jsonb NOT NULL DEFAULT '{}'::jsonb,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS signature_provider_external_idx ON wgos.signature_envelopes(provider,external_envelope_id) WHERE external_envelope_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS wgos.client_portal_access(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),brand_id text NOT NULL REFERENCES wgos.brands(id),contact_id uuid REFERENCES wgos.contacts(id),
 organization_id uuid REFERENCES wgos.organizations(id),token_hash text NOT NULL UNIQUE,status text NOT NULL DEFAULT 'ACTIVE',expires_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),last_accessed_at timestamptz);

CREATE TABLE IF NOT EXISTS wgos.invoices(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),brand_id text NOT NULL REFERENCES wgos.brands(id),opportunity_id uuid REFERENCES wgos.opportunities(id),
 agreement_id uuid REFERENCES wgos.\"agreements\"(id),organization_id uuid REFERENCES wgos.organizations(id),invoice_number text NOT NULL,
 status text NOT NULL DEFAULT 'DRAFT',total_cents bigint NOT NULL DEFAULT 0,due_cents bigint NOT NULL DEFAULT 0,currency char(3) NOT NULL DEFAULT 'USD',
 issued_at timestamptz,due_at timestamptz,external_provider text,external_id text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(brand_id,invoice_number));
CREATE TABLE IF NOT EXISTS wgos.refund_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),payment_id uuid REFERENCES wgos.payments(id),provider text,external_refund_id text,amount_cents bigint NOT NULL,
 currency char(3) NOT NULL DEFAULT 'USD',status text NOT NULL,metadata jsonb NOT NULL DEFAULT '{}'::jsonb,created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS refund_provider_external_idx ON wgos.refund_events(provider,external_refund_id) WHERE external_refund_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS wgos.communication_threads(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),brand_id text NOT NULL REFERENCES wgos.brands(id),organization_id uuid REFERENCES wgos.organizations(id),
 contact_id uuid REFERENCES wgos.contacts(id),channel text NOT NULL CHECK(channel IN ('EMAIL','SMS','PHONE','PORTAL','OTHER')),subject text,external_thread_ref text,
 status text NOT NULL DEFAULT 'OPEN',created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS wgos.communication_messages(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),thread_id uuid NOT NULL REFERENCES wgos.communication_threads(id) ON DELETE CASCADE,direction text NOT NULL CHECK(direction IN ('INBOUND','OUTBOUND')),
 sender_ref text,recipient_refs jsonb NOT NULL DEFAULT '[]'::jsonb,body_ref text,external_message_ref text,occurred_at timestamptz NOT NULL DEFAULT now(),metadata jsonb NOT NULL DEFAULT '{}'::jsonb);
CREATE UNIQUE INDEX IF NOT EXISTS communication_external_msg_idx ON wgos.communication_messages(external_message_ref) WHERE external_message_ref IS NOT NULL;
CREATE TABLE IF NOT EXISTS wgos.calendar_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),brand_id text NOT NULL REFERENCES wgos.brands(id),project_id uuid REFERENCES wgos.projects(id),title text NOT NULL,
 start_at timestamptz NOT NULL,end_at timestamptz NOT NULL,timezone text NOT NULL DEFAULT 'America/Chicago',external_provider text,external_event_ref text,
 status text NOT NULL DEFAULT 'CONFIRMED',metadata jsonb NOT NULL DEFAULT '{}'::jsonb);
CREATE UNIQUE INDEX IF NOT EXISTS calendar_external_event_idx ON wgos.calendar_events(external_provider,external_event_ref) WHERE external_event_ref IS NOT NULL;
CREATE TABLE IF NOT EXISTS wgos.crew_profiles(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),contact_id uuid NOT NULL REFERENCES wgos.contacts(id),brand_id text REFERENCES wgos.brands(id),
 disciplines jsonb NOT NULL DEFAULT '[]'::jsonb,status text NOT NULL DEFAULT 'ACTIVE',day_rate_cents bigint,notes text,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS wgos.equipment_assets(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),brand_id text REFERENCES wgos.brands(id),owner_organization_id uuid REFERENCES wgos.organizations(id),asset_tag text,
 category text NOT NULL,manufacturer text,model text,serial_number text,status text NOT NULL DEFAULT 'AVAILABLE',replacement_value_cents bigint,location_text text,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS equipment_asset_tag_idx ON wgos.equipment_assets(asset_tag) WHERE asset_tag IS NOT NULL;
CREATE TABLE IF NOT EXISTS wgos.project_crew_assignments(
 project_id uuid NOT NULL REFERENCES wgos.projects(id) ON DELETE CASCADE,crew_profile_id uuid NOT NULL REFERENCES wgos.crew_profiles(id),role_name text NOT NULL,
 call_at timestamptz,release_at timestamptz,status text NOT NULL DEFAULT 'PROPOSED',rate_cents bigint,PRIMARY KEY(project_id,crew_profile_id,role_name));
CREATE TABLE IF NOT EXISTS wgos.project_equipment_assignments(
 project_id uuid NOT NULL REFERENCES wgos.projects(id) ON DELETE CASCADE,equipment_asset_id uuid NOT NULL REFERENCES wgos.equipment_assets(id),quantity integer NOT NULL DEFAULT 1 CHECK(quantity>0),
 notes text,PRIMARY KEY(project_id,equipment_asset_id));
CREATE TABLE IF NOT EXISTS wgos.ai_action_executions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),brand_id text REFERENCES wgos.brands(id),actor_subject text,requested_action text NOT NULL,
 authority_level text NOT NULL CHECK(authority_level IN ('READ','DRAFT','PROPOSE_ACTION','EXECUTE_LOW_RISK','EXECUTE_APPROVED')),approval_request_id uuid REFERENCES wgos.approval_requests(id),
 status text NOT NULL DEFAULT 'REQUESTED',request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,result_payload jsonb NOT NULL DEFAULT '{}'::jsonb,correlation_id text,
 created_at timestamptz NOT NULL DEFAULT now(),completed_at timestamptz);

CREATE TABLE IF NOT EXISTS wgos.workflow_definitions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),brand_id text REFERENCES wgos.brands(id),key text NOT NULL,version integer NOT NULL DEFAULT 1,name text NOT NULL,
 trigger_type text NOT NULL,definition jsonb NOT NULL DEFAULT '{}'::jsonb,status text NOT NULL DEFAULT 'DRAFT',created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(brand_id,key,version));
CREATE TABLE IF NOT EXISTS wgos.workflow_runs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workflow_definition_id uuid NOT NULL REFERENCES wgos.workflow_definitions(id),brand_id text REFERENCES wgos.brands(id),
 trigger_ref text,status text NOT NULL DEFAULT 'QUEUED',correlation_id text,input jsonb NOT NULL DEFAULT '{}'::jsonb,output jsonb NOT NULL DEFAULT '{}'::jsonb,
 started_at timestamptz,completed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS wgos.outbox_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),brand_id text REFERENCES wgos.brands(id),topic text NOT NULL,dedupe_key text,payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 status text NOT NULL DEFAULT 'PENDING',attempt_count integer NOT NULL DEFAULT 0,next_attempt_at timestamptz NOT NULL DEFAULT now(),last_error text,created_at timestamptz NOT NULL DEFAULT now(),processed_at timestamptz);
CREATE UNIQUE INDEX IF NOT EXISTS outbox_dedupe_idx ON wgos.outbox_events(topic,dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE TABLE IF NOT EXISTS wgos.dead_letter_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),outbox_event_id uuid REFERENCES wgos.outbox_events(id),topic text NOT NULL,payload jsonb NOT NULL,error text NOT NULL,
 failed_at timestamptz NOT NULL DEFAULT now(),resolved_at timestamptz,resolution text);
CREATE TABLE IF NOT EXISTS wgos.external_object_mappings(
 provider text NOT NULL,object_type text NOT NULL,external_id text NOT NULL,internal_type text NOT NULL,internal_id text NOT NULL,brand_id text REFERENCES wgos.brands(id),
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(provider,object_type,external_id));

CREATE TABLE IF NOT EXISTS wgos.custom_field_definitions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),brand_id text REFERENCES wgos.brands(id),entity_type text NOT NULL,key text NOT NULL,label text NOT NULL,field_type text NOT NULL,
 options jsonb NOT NULL DEFAULT '[]'::jsonb,required boolean NOT NULL DEFAULT false,active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(brand_id,entity_type,key));
CREATE TABLE IF NOT EXISTS wgos.custom_field_values(definition_id uuid NOT NULL REFERENCES wgos.custom_field_definitions(id) ON DELETE CASCADE,entity_id text NOT NULL,value jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(definition_id,entity_id));
CREATE TABLE IF NOT EXISTS wgos.tags(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),brand_id text REFERENCES wgos.brands(id),name text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(brand_id,name));
CREATE TABLE IF NOT EXISTS wgos.entity_tags(tag_id uuid NOT NULL REFERENCES wgos.tags(id) ON DELETE CASCADE,entity_type text NOT NULL,entity_id text NOT NULL,PRIMARY KEY(tag_id,entity_type,entity_id));
CREATE TABLE IF NOT EXISTS wgos.saved_views(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_subject text NOT NULL REFERENCES wgos.app_users(auth_user_id),brand_id text REFERENCES wgos.brands(id),entity_type text NOT NULL,
 name text NOT NULL,filters jsonb NOT NULL DEFAULT '{}'::jsonb,sort jsonb NOT NULL DEFAULT '[]'::jsonb,columns jsonb NOT NULL DEFAULT '[]'::jsonb,is_shared boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS wgos.data_jobs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),brand_id text REFERENCES wgos.brands(id),job_type text NOT NULL CHECK(job_type IN ('IMPORT','EXPORT')),entity_type text NOT NULL,status text NOT NULL DEFAULT 'QUEUED',
 requested_by text REFERENCES wgos.app_users(auth_user_id),source_ref text,result_ref text,row_count integer,error_count integer,metadata jsonb NOT NULL DEFAULT '{}'::jsonb,created_at timestamptz NOT NULL DEFAULT now(),completed_at timestamptz);
CREATE TABLE IF NOT EXISTS wgos.cross_brand_referrals(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),contact_id uuid REFERENCES wgos.contacts(id),organization_id uuid REFERENCES wgos.organizations(id),source_brand_id text NOT NULL REFERENCES wgos.brands(id),
 destination_brand_id text NOT NULL REFERENCES wgos.brands(id),source_opportunity_id uuid REFERENCES wgos.opportunities(id),destination_opportunity_id uuid REFERENCES wgos.opportunities(id),
 reason text,status text NOT NULL DEFAULT 'REFERRED',created_by text REFERENCES wgos.app_users(auth_user_id),created_at timestamptz NOT NULL DEFAULT now(),CHECK(source_brand_id<>destination_brand_id));

CREATE TABLE IF NOT EXISTS wgos.production_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid NOT NULL REFERENCES wgos.projects(id) ON DELETE CASCADE,brand_id text NOT NULL REFERENCES wgos.brands(id),event_name text NOT NULL,
 venue_name text,venue_address text,event_start timestamptz,event_end timestamptz,load_in_at timestamptz,doors_at timestamptz,timezone text NOT NULL DEFAULT 'America/Chicago',
 status text NOT NULL DEFAULT 'ADVANCING',metadata jsonb NOT NULL DEFAULT '{}'::jsonb);
CREATE TABLE IF NOT EXISTS wgos.production_departments(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),production_event_id uuid NOT NULL REFERENCES wgos.production_events(id) ON DELETE CASCADE,department text NOT NULL,
 lead_crew_profile_id uuid REFERENCES wgos.crew_profiles(id),status text NOT NULL DEFAULT 'PLANNING',notes text,UNIQUE(production_event_id,department));
CREATE TABLE IF NOT EXISTS wgos.production_requirements(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),production_event_id uuid NOT NULL REFERENCES wgos.production_events(id) ON DELETE CASCADE,department text NOT NULL,category text NOT NULL,
 item text NOT NULL,quantity integer NOT NULL DEFAULT 1 CHECK(quantity>0),source text,status text NOT NULL DEFAULT 'NEEDED',notes text,metadata jsonb NOT NULL DEFAULT '{}'::jsonb);
CREATE TABLE IF NOT EXISTS wgos.run_of_show_items(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),production_event_id uuid NOT NULL REFERENCES wgos.production_events(id) ON DELETE CASCADE,position integer NOT NULL DEFAULT 0,cue_at timestamptz,
 duration_seconds integer,title text NOT NULL,department text,owner_subject text,notes text,status text NOT NULL DEFAULT 'PLANNED');
CREATE TABLE IF NOT EXISTS wgos.advancing_checkpoints(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),production_event_id uuid NOT NULL REFERENCES wgos.production_events(id) ON DELETE CASCADE,checkpoint text NOT NULL,owner_subject text,due_at timestamptz,
 status text NOT NULL DEFAULT 'OPEN',completed_at timestamptz,notes text);

INSERT INTO wgos.data_governance_policies(data_class,record_type,retention_days,legal_hold_supported,exportable,deletion_mode,notes) VALUES
('BUSINESS','opportunity',2555,true,true,'REVIEW','Commercial history; retention subject to legal/accounting requirements.'),
('LEGAL','agreement',NULL,true,true,'RETAIN','Signed legal artifacts require explicit retention review.'),
('FINANCIAL','payment',NULL,true,true,'RETAIN','Provider/accounting records govern retention.'),
('PERSONAL','contact',NULL,true,true,'REVIEW','Deletion requests require relationship/legal review.'),
('SECURITY','audit_event',2555,true,true,'RETAIN','Append-only security and material mutation history.')
ON CONFLICT(data_class,record_type) DO NOTHING;
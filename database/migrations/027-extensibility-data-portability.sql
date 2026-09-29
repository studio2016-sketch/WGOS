-- 027 Custom fields, tags, saved views, imports/exports and cross-brand referrals
CREATE TABLE IF NOT EXISTS wgos.custom_field_definitions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),brand_id text REFERENCES wgos.brands(id),entity_type text NOT NULL,key text NOT NULL,label text NOT NULL,
 field_type text NOT NULL,options jsonb NOT NULL DEFAULT '[]'::jsonb,required boolean NOT NULL DEFAULT false,active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(brand_id,entity_type,key)
);
CREATE TABLE IF NOT EXISTS wgos.custom_field_values(
 definition_id uuid NOT NULL REFERENCES wgos.custom_field_definitions(id) ON DELETE CASCADE,entity_id text NOT NULL,value jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(definition_id,entity_id)
);
CREATE TABLE IF NOT EXISTS wgos.tags(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),brand_id text REFERENCES wgos.brands(id),name text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(brand_id,name)
);
CREATE TABLE IF NOT EXISTS wgos.entity_tags(
 tag_id uuid NOT NULL REFERENCES wgos.tags(id) ON DELETE CASCADE,entity_type text NOT NULL,entity_id text NOT NULL,
 PRIMARY KEY(tag_id,entity_type,entity_id)
);
CREATE TABLE IF NOT EXISTS wgos.saved_views(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_subject text NOT NULL REFERENCES wgos.app_users(auth_user_id),brand_id text REFERENCES wgos.brands(id),
 entity_type text NOT NULL,name text NOT NULL,filters jsonb NOT NULL DEFAULT '{}'::jsonb,sort jsonb NOT NULL DEFAULT '[]'::jsonb,
 columns jsonb NOT NULL DEFAULT '[]'::jsonb,is_shared boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS wgos.data_jobs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),brand_id text REFERENCES wgos.brands(id),job_type text NOT NULL CHECK(job_type IN ('IMPORT','EXPORT')),
 entity_type text NOT NULL,status text NOT NULL DEFAULT 'QUEUED',requested_by text REFERENCES wgos.app_users(auth_user_id),
 source_ref text,result_ref text,row_count integer,error_count integer,metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),completed_at timestamptz
);
CREATE TABLE IF NOT EXISTS wgos.cross_brand_referrals(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),person_id uuid REFERENCES wgos.people(id),organization_id uuid REFERENCES wgos.organizations(id),
 source_brand_id text NOT NULL REFERENCES wgos.brands(id),destination_brand_id text NOT NULL REFERENCES wgos.brands(id),
 source_opportunity_id uuid REFERENCES wgos.opportunities(id),destination_opportunity_id uuid REFERENCES wgos.opportunities(id),
 reason text,status text NOT NULL DEFAULT 'REFERRED',created_by text REFERENCES wgos.app_users(auth_user_id),created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(source_brand_id<>destination_brand_id)
);
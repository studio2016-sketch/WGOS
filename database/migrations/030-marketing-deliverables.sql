-- WGOS marketing material deliverables
create table if not exists wgos.marketing_deliverables(
 id uuid primary key default gen_random_uuid(),
 brand_id text not null references wgos.brands(id) on delete cascade,
 title text not null,
 deliverable_type text not null default 'OTHER',
 status text not null default 'NEEDED',
 priority text not null default 'MEDIUM',
 channel text,
 campaign text,
 needed_from text,
 due_at timestamptz,
 asset_url text,
 notes text,
 created_by text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint marketing_deliverables_status_chk check(status in('NEEDED','REQUESTED','RECEIVED','IN_PRODUCTION','READY','PUBLISHED','BLOCKED','CANCELLED')),
 constraint marketing_deliverables_priority_chk check(priority in('LOW','MEDIUM','HIGH','CRITICAL'))
);
create index if not exists marketing_deliverables_brand_due_idx on wgos.marketing_deliverables(brand_id,due_at);
create index if not exists marketing_deliverables_status_idx on wgos.marketing_deliverables(status,priority);

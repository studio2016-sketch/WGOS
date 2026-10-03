-- WGOS growth data-source registry
create table if not exists wgos.growth_data_sources(
 id uuid primary key default gen_random_uuid(),
 brand_id text not null references wgos.brands(id) on delete cascade,
 provider text not null,
 external_brand_id text,
 account_label text,
 status text not null default 'CONNECTED',
 networks jsonb not null default '[]'::jsonb,
 coverage_start_at timestamptz,
 last_sync_at timestamptz,
 sync_mode text not null default 'MANUAL',
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(brand_id,provider,external_brand_id),
 constraint growth_data_source_status_chk check(status in('CONNECTED','PARTIAL','NEEDS_CONNECTION','ERROR','DISABLED')),
 constraint growth_data_source_sync_mode_chk check(sync_mode in('MANUAL','CHATGPT_CONNECTOR','API','WEBHOOK'))
);
create index if not exists growth_data_sources_brand_idx on wgos.growth_data_sources(brand_id,provider);

-- WGOS growth campaigns, trackable links and attributed conversion events
create table if not exists wgos.growth_campaigns(
 id uuid primary key default gen_random_uuid(),
 brand_id text not null references wgos.brands(id) on delete cascade,
 name text not null,
 objective text,
 status text not null default 'ACTIVE',
 starts_on date,
 ends_on date,
 created_by text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint growth_campaign_status_chk check(status in('DRAFT','ACTIVE','PAUSED','COMPLETE','CANCELLED'))
);
create table if not exists wgos.growth_links(
 id uuid primary key default gen_random_uuid(),
 campaign_id uuid not null references wgos.growth_campaigns(id) on delete cascade,
 brand_id text not null references wgos.brands(id) on delete cascade,
 label text not null,
 destination_url text not null,
 source text not null,
 medium text not null,
 content text,
 term text,
 utm_campaign text not null,
 tagged_url text not null,
 created_by text,
 created_at timestamptz not null default now()
);
create table if not exists wgos.growth_events(
 id uuid primary key default gen_random_uuid(),
 brand_id text not null references wgos.brands(id) on delete cascade,
 campaign_id uuid references wgos.growth_campaigns(id) on delete set null,
 link_id uuid references wgos.growth_links(id) on delete set null,
 event_type text not null,
 value_cents bigint not null default 0,
 anonymous_id text,
 contact_id uuid,
 session_id text,
 referrer text,
 landing_url text,
 metadata jsonb not null default '{}'::jsonb,
 occurred_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 constraint growth_event_type_chk check(event_type in('CLICK','WEBSITE_VISIT','VIDEO_VIEW','LIST_SIGNUP','INQUIRY','SALE','RETURN_TO_SOCIAL','OTHER'))
);
create index if not exists growth_campaign_brand_idx on wgos.growth_campaigns(brand_id,status);
create index if not exists growth_links_campaign_idx on wgos.growth_links(campaign_id);
create index if not exists growth_events_campaign_time_idx on wgos.growth_events(campaign_id,occurred_at desc);
create index if not exists growth_events_brand_type_idx on wgos.growth_events(brand_id,event_type,occurred_at desc);

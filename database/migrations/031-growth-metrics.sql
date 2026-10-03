-- WGOS closed-loop growth analytics
create table if not exists wgos.growth_metric_snapshots(
 id uuid primary key default gen_random_uuid(),
 brand_id text not null references wgos.brands(id) on delete cascade,
 title text,
 platform text not null,
 account_label text,
 period_start date not null,
 period_end date not null,
 followers bigint not null default 0,
 impressions bigint not null default 0,
 reach bigint not null default 0,
 content_views bigint not null default 0,
 engagements bigint not null default 0,
 outbound_clicks bigint not null default 0,
 youtube_watch_minutes bigint not null default 0,
 website_sessions bigint not null default 0,
 list_signups bigint not null default 0,
 inquiries bigint not null default 0,
 sales_count bigint not null default 0,
 revenue_cents bigint not null default 0,
 notes text,
 source text not null default 'MANUAL',
 created_by text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint growth_metric_platform_chk check(platform in('INSTAGRAM','FACEBOOK','TIKTOK','YOUTUBE','WEBSITE','EMAIL_SMS','OTHER')),
 constraint growth_metric_period_chk check(period_end>=period_start)
);
create index if not exists growth_metric_brand_period_idx on wgos.growth_metric_snapshots(brand_id,period_end desc);
create index if not exists growth_metric_platform_period_idx on wgos.growth_metric_snapshots(platform,period_end desc);
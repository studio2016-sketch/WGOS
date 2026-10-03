-- WGOS sales learning engine
create table if not exists wgos.sales_learning_events(
 id uuid primary key default gen_random_uuid(),
 opportunity_id uuid not null references wgos.opportunities(id) on delete cascade,
 brand_id text not null references wgos.brands(id) on delete cascade,
 event_type text not null,
 event_label text,
 before_stage text,
 after_stage text,
 methodology_area text,
 action_taken text,
 outcome text,
 lesson text,
 confidence integer not null default 50,
 metadata jsonb not null default '{}'::jsonb,
 created_by text,
 created_at timestamptz not null default now(),
 constraint sales_learning_event_type_chk check(event_type in('DISCOVERY','OBJECTION','INSIGHT','NEXT_ACTION','STAGE_CHANGE','PROPOSAL','NEGOTIATION','WIN','LOSS','REFERRAL','FOLLOW_UP','OTHER')),
 constraint sales_learning_confidence_chk check(confidence between 0 and 100)
);
create index if not exists sales_learning_opportunity_idx on wgos.sales_learning_events(opportunity_id,created_at desc);
create index if not exists sales_learning_brand_idx on wgos.sales_learning_events(brand_id,event_type,created_at desc);

create table if not exists wgos.sales_deal_reviews(
 id uuid primary key default gen_random_uuid(),
 opportunity_id uuid not null unique references wgos.opportunities(id) on delete cascade,
 brand_id text not null references wgos.brands(id) on delete cascade,
 outcome text not null,
 primary_reason text,
 what_worked text,
 what_failed text,
 objections text,
 decisive_moment text,
 competitor_notes text,
 pricing_notes text,
 relationship_notes text,
 reusable_lesson text,
 would_pursue_again boolean,
 created_by text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint sales_review_outcome_chk check(outcome in('WON','LOST','NO_DECISION'))
);

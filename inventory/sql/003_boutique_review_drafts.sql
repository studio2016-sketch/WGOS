-- Run only after verifying WGOS brand authorization and database permissions.
-- Drafts are NOT authoritative inventory and cannot be consumed by checkout.
create table if not exists wgos.boutique_inventory_drafts (
 brand_id uuid not null references wgos.brands(id),
 sku text not null,
 stock integer not null check(stock >= 0),
 price_cents integer not null check(price_cents >= 0),
 revision integer not null default 1 check(revision > 0),
 updated_by text not null,
 updated_at timestamptz not null default now(),
 primary key(brand_id,sku)
);
create table if not exists wgos.boutique_inventory_draft_audit (
 id bigint generated always as identity primary key,
 brand_id uuid not null,
 sku text not null,
 previous_stock integer,
 previous_price_cents integer,
 next_stock integer not null,
 next_price_cents integer not null,
 actor text not null,
 created_at timestamptz not null default now()
);
-- Privilege and RLS review required prior to applying this migration.
-- No browser access or public role grants. Use only the authenticated WGOS server.

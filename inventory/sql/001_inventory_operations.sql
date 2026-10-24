-- Staged inventory module. Apply only after reviewing existing schema and tenant policies.
create table if not exists inventory_variants (
 id uuid primary key default gen_random_uuid(), entity_id uuid not null,
 product_external_id text not null, sku text not null, barcode text,
 supplier_id uuid, reorder_point integer not null default 0 check(reorder_point>=0),
 reorder_target integer not null default 0 check(reorder_target>=reorder_point),
 on_hand integer not null default 0 check(on_hand>=0),
 reserved integer not null default 0 check(reserved>=0 and reserved<=on_hand),
 image_url text, active boolean not null default true,
 unique(entity_id,sku), unique(entity_id,product_external_id)
);
create unique index if not exists inventory_barcode_unique on inventory_variants(entity_id,barcode) where barcode is not null;
create table if not exists inventory_suppliers (
 id uuid primary key default gen_random_uuid(), entity_id uuid not null,
 name text not null, contact jsonb not null default '{}'::jsonb, active boolean not null default true
);
create table if not exists inventory_movements (
 id uuid primary key default gen_random_uuid(), entity_id uuid not null,
 variant_id uuid not null references inventory_variants(id),
 delta integer not null, reason text not null, reference_id text not null,
 actor_id text, created_at timestamptz not null default now(),
 unique(entity_id,variant_id,reason,reference_id)
);
create table if not exists inventory_reservations (
 id uuid primary key default gen_random_uuid(), entity_id uuid not null,
 variant_id uuid not null references inventory_variants(id),
 order_id text not null, quantity integer not null check(quantity>0),
 status text not null check(status in ('held','fulfilled','released')),
 created_at timestamptz not null default now(),
 unique(entity_id,variant_id,order_id)
);
create table if not exists inventory_purchase_orders (
 id uuid primary key default gen_random_uuid(), entity_id uuid not null,
 supplier_id uuid not null references inventory_suppliers(id),
 status text not null check(status in ('draft','approved','ordered','partially_received','received','cancelled')),
 lines jsonb not null default '[]'::jsonb, created_at timestamptz not null default now()
);
create table if not exists inventory_stock_counts (
 id uuid primary key default gen_random_uuid(), entity_id uuid not null,
 variant_id uuid not null references inventory_variants(id),
 observed integer not null check(observed>=0), expected integer not null,
 status text not null check(status in ('pending','approved','rejected')),
 counted_by text, approved_by text, created_at timestamptz not null default now()
);
create table if not exists inventory_image_issues (
 id uuid primary key default gen_random_uuid(), entity_id uuid not null,
 variant_id uuid not null references inventory_variants(id),
 issue text not null, status text not null default 'open',
 proposed_url text, reviewed_by text, unique(entity_id,variant_id,issue)
);
-- SECURITY GATE: before applying, add RLS tenant policies matching WGOS's
-- authenticated entity membership model. No service-role exposure to browsers.

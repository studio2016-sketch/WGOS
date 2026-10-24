-- 049 Retail inventory shadow-control plane
-- Purpose: authoritative-ready retail inventory model that remains isolated from storefront checkout until explicit cutover.
CREATE TABLE IF NOT EXISTS wgos.inventory_locations(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 code text NOT NULL,
 name text NOT NULL,
 location_type text NOT NULL DEFAULT 'STOCKROOM' CHECK(location_type IN ('STOCKROOM','STORE','WAREHOUSE','TRANSIT','DAMAGED','OTHER')),
 active boolean NOT NULL DEFAULT true,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(brand_id,code)
);

CREATE TABLE IF NOT EXISTS wgos.inventory_products(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 external_key text,
 sku text,
 category text,
 manufacturer text,
 product_name text NOT NULL,
 variant_name text,
 condition_status text NOT NULL DEFAULT 'NEW' CHECK(condition_status IN ('NEW','OPEN_BOX','USED','DAMAGED','HOLD','UNKNOWN')),
 sellable boolean NOT NULL DEFAULT false,
 active boolean NOT NULL DEFAULT true,
 price_cents bigint NOT NULL DEFAULT 0 CHECK(price_cents>=0),
 cost_cents bigint CHECK(cost_cents IS NULL OR cost_cents>=0),
 image_url text,
 source_system text,
 source_record_id text,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS inventory_products_brand_external_key_uidx ON wgos.inventory_products(brand_id,external_key) WHERE external_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS inventory_products_brand_sku_uidx ON wgos.inventory_products(brand_id,sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS inventory_products_brand_idx ON wgos.inventory_products(brand_id,active,category,manufacturer,product_name);

CREATE TABLE IF NOT EXISTS wgos.inventory_stock_levels(
 product_id uuid NOT NULL REFERENCES wgos.inventory_products(id) ON DELETE CASCADE,
 location_id uuid NOT NULL REFERENCES wgos.inventory_locations(id) ON DELETE CASCADE,
 on_hand numeric(14,3) NOT NULL DEFAULT 0,
 reserved numeric(14,3) NOT NULL DEFAULT 0 CHECK(reserved>=0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(product_id,location_id),
 CHECK(on_hand>=0),
 CHECK(reserved<=on_hand)
);

CREATE TABLE IF NOT EXISTS wgos.inventory_movements(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 product_id uuid NOT NULL REFERENCES wgos.inventory_products(id) ON DELETE CASCADE,
 location_id uuid NOT NULL REFERENCES wgos.inventory_locations(id) ON DELETE CASCADE,
 movement_type text NOT NULL CHECK(movement_type IN ('OPENING','RECEIPT','SALE','RETURN','ADJUSTMENT','RESERVATION','RELEASE','TRANSFER_IN','TRANSFER_OUT','DAMAGE','WRITE_OFF')),
 quantity_delta numeric(14,3) NOT NULL,
 unit_cost_cents bigint CHECK(unit_cost_cents IS NULL OR unit_cost_cents>=0),
 source_system text,
 source_type text,
 source_id text,
 idempotency_key text,
 notes text,
 actor_subject text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS inventory_movements_idempotency_uidx ON wgos.inventory_movements(brand_id,idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS inventory_movements_product_idx ON wgos.inventory_movements(product_id,created_at DESC);

CREATE TABLE IF NOT EXISTS wgos.inventory_import_batches(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 source_system text NOT NULL,
 source_ref text,
 status text NOT NULL DEFAULT 'STAGED' CHECK(status IN ('STAGED','VALIDATED','RECONCILED','READY','APPLIED','REJECTED')),
 source_count integer NOT NULL DEFAULT 0,
 matched_count integer NOT NULL DEFAULT 0,
 discrepancy_count integer NOT NULL DEFAULT 0,
 payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 validation jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_by text,
 created_at timestamptz NOT NULL DEFAULT now(),
 validated_at timestamptz,
 reconciled_at timestamptz,
 applied_at timestamptz
);
CREATE INDEX IF NOT EXISTS inventory_import_batches_brand_idx ON wgos.inventory_import_batches(brand_id,created_at DESC);

CREATE TABLE IF NOT EXISTS wgos.inventory_control_state(
 brand_id text PRIMARY KEY REFERENCES wgos.brands(id) ON DELETE CASCADE,
 mode text NOT NULL DEFAULT 'SHADOW' CHECK(mode IN ('SHADOW','READ_ONLY','AUTHORITATIVE')),
 source_of_truth text,
 cutover_ready boolean NOT NULL DEFAULT false,
 reconciliation_status text NOT NULL DEFAULT 'NOT_STARTED' CHECK(reconciliation_status IN ('NOT_STARTED','IN_PROGRESS','MATCHED','DISCREPANCIES','APPROVED')),
 last_reconciled_at timestamptz,
 activated_at timestamptz,
 activated_by text,
 notes text,
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW wgos.inventory_position AS
SELECT p.id product_id,p.brand_id,p.external_key,p.sku,p.category,p.manufacturer,p.product_name,p.variant_name,p.condition_status,p.sellable,p.active,p.price_cents,p.cost_cents,p.image_url,
 COALESCE(sum(s.on_hand),0)::numeric(14,3) on_hand,
 COALESCE(sum(s.reserved),0)::numeric(14,3) reserved,
 COALESCE(sum(s.on_hand-s.reserved),0)::numeric(14,3) available,
 CASE WHEN p.cost_cents IS NULL THEN NULL ELSE (COALESCE(sum(s.on_hand),0)*p.cost_cents)::numeric END inventory_cost_cents,
 (COALESCE(sum(s.on_hand),0)*p.price_cents)::numeric retail_value_cents
FROM wgos.inventory_products p
LEFT JOIN wgos.inventory_stock_levels s ON s.product_id=p.id
GROUP BY p.id;

INSERT INTO wgos.inventory_control_state(brand_id,mode,source_of_truth,cutover_ready,reconciliation_status,notes)
VALUES('dionnesBoutique','SHADOW','DionnesBoutique site catalog / prior inventory process',false,'NOT_STARTED','WGOS shadow inventory. No storefront authority until reconciliation and explicit cutover approval.')
ON CONFLICT(brand_id) DO NOTHING;

INSERT INTO wgos.inventory_locations(brand_id,code,name,location_type)
VALUES('dionnesBoutique','MAIN','Dionne''s Boutique Main Inventory','STOCKROOM')
ON CONFLICT(brand_id,code) DO NOTHING;

CREATE TABLE IF NOT EXISTS wgos.boutique_commerce_settings(
 brand_id text PRIMARY KEY REFERENCES wgos.brands(id),
 settings jsonb NOT NULL DEFAULT '{}'::jsonb,
 version bigint NOT NULL DEFAULT 0,
 updated_by text,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO wgos.boutique_commerce_settings(brand_id) VALUES('dionnesBoutique') ON CONFLICT DO NOTHING;

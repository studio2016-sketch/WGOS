-- Private campaign history is imported separately, never committed as source data.
CREATE TABLE IF NOT EXISTS wgos.festival_campaign_imports (
 brand_id text PRIMARY KEY REFERENCES wgos.brands(id),
 source_text text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE wgos.festival_campaign_imports ENABLE ROW LEVEL SECURITY;
-- Only the trusted server connection reads this table after commandAccess and brand membership checks.

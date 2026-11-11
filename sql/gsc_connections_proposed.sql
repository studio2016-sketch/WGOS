-- Proposed migration; review against existing Neon schema and permissions before applying.
CREATE TABLE IF NOT EXISTS wgos.gsc_connections (
  brand_id uuid PRIMARY KEY REFERENCES wgos.brands(id) ON DELETE CASCADE,
  property_url text NOT NULL,
  refresh_token_ciphertext text NOT NULL,
  connected_by text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gsc_property_url_nonempty CHECK (length(trim(property_url)) > 0)
);

-- Server DB credentials are privileged. Application access MUST still be
-- checked by brand in every read/write path. Verify role grants and RLS
-- independently before any production migration.
REVOKE ALL ON wgos.gsc_connections FROM PUBLIC;

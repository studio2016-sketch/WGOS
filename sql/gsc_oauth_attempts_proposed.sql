-- Proposed migration only. Review Neon grants and RLS before applying.
CREATE TABLE IF NOT EXISTS wgos.gsc_oauth_attempts (
  state_hash text PRIMARY KEY,
  brand_id uuid NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
  auth_user_id text NOT NULL,
  redirect_uri text NOT NULL,
  verifier text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gsc_oauth_state_hash_length CHECK (length(state_hash) = 64)
);
CREATE INDEX IF NOT EXISTS gsc_oauth_attempts_expires_at_idx
  ON wgos.gsc_oauth_attempts(expires_at);
REVOKE ALL ON wgos.gsc_oauth_attempts FROM PUBLIC;
-- A trusted server job may purge expired attempts periodically.

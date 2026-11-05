-- Records are archived only by explicitly authorized cleanup, not by applying this migration.
ALTER TABLE wgos.organizations ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE wgos.opportunities ADD COLUMN IF NOT EXISTS archived_at timestamptz;

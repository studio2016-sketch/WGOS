-- Existing contact reset is a separately audited owner action, never repeated by migrations.
ALTER TABLE wgos.contacts ADD COLUMN IF NOT EXISTS archived_at timestamptz;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='wgos.contacts'::regclass AND conname='contacts_required_identity') THEN
 ALTER TABLE wgos.contacts ADD CONSTRAINT contacts_required_identity CHECK (
 archived_at IS NOT NULL OR (
 length(btrim(coalesce(first_name,'')))>0 AND length(btrim(coalesce(last_name,'')))>0
 AND coalesce(email,'') ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')) NOT VALID;
 END IF;
END $$;
ALTER TABLE wgos.contacts VALIDATE CONSTRAINT contacts_required_identity;

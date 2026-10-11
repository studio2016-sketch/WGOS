-- Verification for migration 049-agent-control-plane.sql
-- Read-only. Run after applying 049 to a temporary Neon branch and again after production commissioning.

SELECT to_regclass('wgos.agent_definitions') AS agent_definitions,
       to_regclass('wgos.agent_runs') AS agent_runs,
       to_regclass('wgos.agent_events') AS agent_events,
       to_regclass('wgos.agent_decisions') AS agent_decisions,
       to_regclass('wgos.agent_artifacts') AS agent_artifacts,
       to_regclass('wgos.agent_metrics') AS agent_metrics;

SELECT table_name,column_name,data_type,is_nullable
FROM information_schema.columns
WHERE table_schema='wgos'
  AND table_name IN ('agent_definitions','agent_runs','agent_events','agent_decisions','agent_artifacts','agent_metrics')
ORDER BY table_name,ordinal_position;

SELECT tc.table_name,tc.constraint_name,tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema='wgos'
  AND tc.table_name LIKE 'agent_%'
ORDER BY tc.table_name,tc.constraint_name;

SELECT a.attname AS column_name,format_type(a.atttypid,a.atttypmod) AS column_type
FROM pg_attribute a
JOIN pg_class c ON c.oid=a.attrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='wgos' AND c.relname='agent_runs' AND a.attname='brand_id' AND a.attnum>0;

SELECT COUNT(*) AS existing_brand_count FROM wgos.brands;

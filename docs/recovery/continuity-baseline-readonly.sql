-- WGOS read-only continuity baseline / restored-branch comparison
-- Tested against production 2026-10-28T04:50:23Z. No customer content, IDs, or financial amounts returned.
-- This query is NOT a backup, restore, or proof of cross-brand authorization.
-- Execute on production and an independently restored isolated branch; compare outputs
-- against a documented, consistent restore point. Differences can reflect legitimate writes.
WITH inventory AS (
 SELECT 'brands'::text AS metric, count(*)::bigint AS n FROM wgos.brands
 UNION ALL SELECT 'brand_memberships',count(*) FROM wgos.brand_memberships
 UNION ALL SELECT 'opportunities',count(*) FROM wgos.opportunities
 UNION ALL SELECT 'proposals',count(*) FROM wgos.proposals
 UNION ALL SELECT 'projects',count(*) FROM wgos.projects
 UNION ALL SELECT 'payments',count(*) FROM wgos.payments
 UNION ALL SELECT 'communication_threads',count(*) FROM wgos.communication_threads
 UNION ALL SELECT 'communication_messages',count(*) FROM wgos.communication_messages
 UNION ALL SELECT 'notification_events',count(*) FROM wgos.notification_events
 UNION ALL SELECT 'outbox_events',count(*) FROM wgos.outbox_events
), integrity AS (
 SELECT 'proposal_opportunity_brand_mismatch'::text AS metric,count(*)::bigint AS n
 FROM wgos.proposals p JOIN wgos.opportunities o ON o.id=p.opportunity_id WHERE p.brand_id IS DISTINCT FROM o.brand_id
 UNION ALL SELECT 'project_opportunity_brand_mismatch',count(*)
 FROM wgos.projects p JOIN wgos.opportunities o ON o.id=p.opportunity_id WHERE p.brand_id IS DISTINCT FROM o.brand_id
 UNION ALL SELECT 'project_proposal_brand_mismatch',count(*)
 FROM wgos.projects p JOIN wgos.proposals x ON x.id=p.proposal_id WHERE p.brand_id IS DISTINCT FROM x.brand_id
 UNION ALL SELECT 'thread_unknown_brand',count(*)
 FROM wgos.communication_threads t LEFT JOIN wgos.brands b ON b.id=t.brand_id WHERE b.id IS NULL
 UNION ALL SELECT 'notification_unknown_brand',count(*)
 FROM wgos.notification_events n LEFT JOIN wgos.brands b ON b.id=n.brand_id WHERE n.brand_id IS NOT NULL AND b.id IS NULL
 UNION ALL SELECT 'outbox_unknown_brand',count(*)
 FROM wgos.outbox_events e LEFT JOIN wgos.brands b ON b.id=e.brand_id WHERE e.brand_id IS NOT NULL AND b.id IS NULL
)
SELECT now() AS observed_at, current_database() AS database_name,
 (SELECT count(*) FROM information_schema.tables WHERE table_schema='wgos' AND table_type='BASE TABLE') AS application_tables,
 (SELECT jsonb_object_agg(metric,n) FROM inventory) AS table_counts,
 (SELECT jsonb_object_agg(metric,n) FROM integrity) AS integrity_counts;

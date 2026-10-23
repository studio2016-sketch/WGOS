-- WGOS read-only business-continuity check
-- Validated against WGOS production Neon on 2026-10-23 at 14:47 UTC.
-- No mutations, notifications, email sends, or cross-entity row-level data.
-- "OK without component outcomes" means the scheduler did not persist per-job
-- status evidence; it does NOT prove each underlying job failed.
WITH cron AS (
 SELECT count(*) AS executions_2h,
 count(*) FILTER (WHERE status='OK') AS marked_ok_2h,
 count(*) FILTER (WHERE status='OK' AND NOT (details ? 'jobOutcomes')) AS ok_without_component_outcomes_2h,
 max(occurred_at) AS last_health_at
 FROM wgos.system_health_events
 WHERE component='operations_cron' AND occurred_at >= now()-interval '2 hours'
), notices AS (
 SELECT count(*) FILTER (WHERE status='PENDING') AS pending_total,
 count(*) FILTER (WHERE status='PENDING' AND event_type='NEW_WEB_INQUIRY') AS pending_inquiries,
 count(*) FILTER (WHERE status='PENDING' AND event_type='DISCOVERY_AUTOMATION_FAILED') AS pending_discovery_failures,
 count(*) FILTER (WHERE event_type='DISCOVERY_AUTOMATION_FAILED' AND created_at >= now()-interval '1 hour') AS discovery_alerts_created_1h
 FROM wgos.notification_events
)
SELECT now() AS checked_at,
 (SELECT count(*) FROM pg_stat_activity WHERE wait_event_type='Lock') AS lock_waits,
 cron.*, notices.*
FROM cron CROSS JOIN notices;

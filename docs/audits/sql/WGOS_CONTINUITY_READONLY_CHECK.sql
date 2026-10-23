-- WGOS read-only business-continuity check
-- Revalidated against production Neon 2026-10-23 at 15:55 UTC.
-- Aggregate metrics only: no customer identifiers, email addresses or message bodies.
-- A health event marked OK without jobOutcomes is NOT proof of successful jobs.
-- Pending notifications are not necessarily unanswered authentic inquiries.
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
 count(*) FILTER (WHERE event_type='DISCOVERY_AUTOMATION_FAILED' AND created_at >= now()-interval '1 hour') AS discovery_alerts_created_1h,
 count(*) FILTER (WHERE status='PENDING' AND event_type='DISCOVERY_AUTOMATION_FAILED' AND created_at < now()-interval '24 hours') AS stale_discovery_alerts_24h,
 count(*) FILTER (WHERE status='PENDING' AND event_type='DISCOVERY_AUTOMATION_FAILED' AND coalesce(payload->>'error','') LIKE 'Invalid `to` field.%') AS invalid_to_field_alerts
 FROM wgos.notification_events
), affected AS (
 SELECT DISTINCT payload->>'opportunity_id' AS opportunity_id
 FROM wgos.notification_events
 WHERE status='PENDING' AND event_type='DISCOVERY_AUTOMATION_FAILED'
), affected_summary AS (
 SELECT count(*) AS distinct_failed_opportunities,
 count(*) FILTER (WHERE position('..' IN coalesce(o.contact_email,''))>0) AS double_dot_recipient_opportunities
 FROM affected a LEFT JOIN wgos.opportunities o ON o.id::text=a.opportunity_id
)
SELECT now() AS checked_at,
 (SELECT count(*) FROM pg_stat_activity WHERE wait_event_type='Lock') AS lock_waits,
 cron.*,notices.*,affected_summary.*
FROM cron CROSS JOIN notices CROSS JOIN affected_summary;

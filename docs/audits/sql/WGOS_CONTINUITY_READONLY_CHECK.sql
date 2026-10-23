-- WGOS read-only business-continuity check
-- Extended and revalidated against production Neon 2026-10-23 at 21:54 UTC.
-- Aggregate metrics only: no customer identifiers, email addresses or message bodies.
-- wgos is the application schema; public has zero application tables.
-- RLS coverage is a security posture metric, NOT evidence of an exploit.
-- The presence of app-layer authorization does not establish DB-layer RLS.
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
 count(DISTINCT payload->>'opportunity_id') FILTER (WHERE status='PENDING' AND event_type='NEW_WEB_INQUIRY') AS distinct_pending_inquiry_refs,
 count(*) FILTER (WHERE status='PENDING' AND event_type='NEW_WEB_INQUIRY' AND created_at<now()-interval '7 days') AS pending_inquiries_older_7d,
 max(created_at) FILTER (WHERE status='PENDING' AND event_type='NEW_WEB_INQUIRY') AS latest_pending_inquiry_at,
 count(*) FILTER (WHERE status='PENDING' AND event_type='DISCOVERY_AUTOMATION_FAILED') AS pending_discovery_failures,
 count(*) FILTER (WHERE event_type='DISCOVERY_AUTOMATION_FAILED' AND created_at >= now()-interval '1 hour') AS discovery_alerts_created_1h,
 count(DISTINCT payload->>'opportunity_id') FILTER (WHERE event_type='DISCOVERY_AUTOMATION_FAILED' AND created_at >= now()-interval '1 hour') AS distinct_discovery_opportunities_1h,
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
 , recent_inquiry_integrity AS (
 SELECT count(*) AS new_inquiries_2h,
 count(*) FILTER (WHERE o.id IS NOT NULL AND t.id IS NOT NULL AND o.brand_id=n.brand_id AND t.brand_id=n.brand_id AND EXISTS (SELECT 1 FROM wgos.communication_messages m WHERE m.thread_id=t.id AND m.direction='INBOUND')) AS brand_scoped_linked_inbound_2h,
 count(*) FILTER (WHERE t.id IS NOT NULL AND EXISTS (SELECT 1 FROM wgos.communication_messages m WHERE m.thread_id=t.id AND m.direction='OUTBOUND')) AS linked_outbound_logged_2h
 FROM wgos.notification_events n
 LEFT JOIN wgos.opportunities o ON o.id::text=n.payload->>'opportunity_id'
 LEFT JOIN wgos.communication_threads t ON t.id::text=n.payload->>'thread_id'
 WHERE n.event_type='NEW_WEB_INQUIRY' AND n.created_at>=now()-interval '2 hours'
)
, rls_summary AS (
 SELECT count(*) AS wgos_base_tables,
 count(*) FILTER (WHERE c.relrowsecurity) AS wgos_rls_enabled_tables,
 count(*) FILTER (WHERE c.relforcerowsecurity) AS wgos_rls_forced_tables
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='wgos' AND c.relkind='r'
)
, role_posture AS (
 SELECT r.rolbypassrls AS inspection_role_bypasses_rls,
 (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='wgos' AND c.relkind='r' AND pg_get_userbyid(c.relowner)=current_user) AS wgos_tables_owned_by_inspection_role
 FROM pg_roles r WHERE r.rolname=current_user
)
SELECT now() AS checked_at,
 (SELECT count(*) FROM pg_stat_activity WHERE wait_event_type='Lock') AS lock_waits,
 cron.*,notices.*,affected_summary.*,recent_inquiry_integrity.*,rls_summary.*,role_posture.*
FROM cron CROSS JOIN notices CROSS JOIN affected_summary CROSS JOIN recent_inquiry_integrity CROSS JOIN rls_summary CROSS JOIN role_posture;

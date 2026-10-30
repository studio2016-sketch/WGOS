# WGOS database continuity and recovery — controlled runbook

Status: **PREPARED, NOT RESTORE-VERIFIED**. Last evidence review: 2026-10-29 05:46 UTC.
Governing authority: WGOS autonomous enterprise directive and owner's master operating directive.

## Current baseline (read-only connector evidence)
- Neon project `bold-violet-26333921`, production branch `br-holy-glitter-b564xvey`; SQL connectivity passed 2026-10-29 05:44:35 UTC.
- Production branch protection is disabled. Snapshot inventory is empty and the branch snapshot schedule is empty.
- Project history retention is 21,600 seconds (six hours). Historical `restored_from` metadata exists, but **no current restore was tested**.
- 116 WGOS base tables, zero tables with PostgreSQL row-level security enabled, and zero policies in `pg_policies` for `wgos`. Application-level authorization must be audited separately; this is not proof of a cross-tenant data leak.
- Vercel production commit `895dbde10239652af11bf0806aee5ff7b2bf7c34` was READY; READY does not certify application health.

## Outage triage (read-only; no new spending)
1. Confirm the incident using a fresh Neon read-only SQL probe, project/branch state, Vercel production deployment and runtime error evidence. Distinguish quota errors, auth failures, connection errors and application exceptions.
2. Record UTC timestamp, affected business entities and routes, observed failures, most recent successful write and estimated data-loss exposure. Do not copy customer PII or secrets into logs/reports.
3. Preserve the current production branch and existing audit/outbox/notification records. Do not clear queues, retry bulk sends, modify stages or replay payments.
4. If a database outage is confirmed, communicate **DEGRADED / UNAVAILABLE** in the owner workspace where an authorized mechanism exists; do not report a healthy service from a build badge or scheduler `OK` alone.
5. Prepare a least-risk recovery plan for owner approval, including data freshness, dependency impact, service cost, rollback and business-by-business verification.

## Approval-gated recovery preparation
- Confirm Neon's actual backup and point-in-time restore entitlements, pricing, retention and current usage before configuring protection or snapshot schedules.
- Obtain approval for any production branch protection change, scheduled snapshots, paid compute/branch creation, restore, cutover or migration.
- In a disposable, explicitly authorized recovery branch, restore a known point, verify schema, counts, integrity, app login and entity-scoped access, then record the measured RPO/RTO. Never use a live production branch as the restore-test target.
- Independently verify that each business's customers, messages, contracts, inventory and financial records remain isolated. Evaluate whether database RLS is appropriate before adding policies; a direct RLS migration could break existing app access.
- Promote only after an owner-approved cutover plan, rollback plan and verified post-recovery workflows. Record actual restore evidence; do not substitute historical branch metadata.

## Safe verification queries
```sql
SELECT now() AT TIME ZONE 'UTC' AS observed_utc, current_database() AS database_name;
SELECT count(*) AS wgos_base_tables FROM information_schema.tables WHERE table_schema='wgos' AND table_type='BASE TABLE';
SELECT count(*) AS unresolved_dead_letters FROM wgos.dead_letter_events WHERE resolved_at IS NULL;
SELECT component, status, count(*) FROM wgos.system_health_events
 WHERE occurred_at >= now() - interval '2 hours' GROUP BY component, status;
```

## Open release gates
- No verified recent snapshot or scheduled backup.
- No measured restore success, RPO or RTO.
- Production branch protection off.
- Authenticated cross-entity access controls not independently tested.
- Production discovery email and cron health fixes are not deployed.

## Customer-delivery continuity gate — added 2026-10-29 06:53 UTC
- Source review of `lib/discovery.ts` confirms the Studio2016 transport call precedes the communication-message, opportunity-state and audit-event writes. If the provider accepts the email and a later database write fails, a retry could send again without a durable success record. **This is a plausible failure window, not proof of duplicate delivery.**
- Before release, inspect the actual Studio2016 endpoint for durable provider idempotency and request tracing. A stable idempotency key alone is not sufficient unless the receiver enforces it. Test the provider-accepted/database-write-failed scenario in isolated staging without sending to customers.
- Reconcile each candidate opportunity against provider delivery IDs, communication messages and audit events before any replay. Do not infer delivery from `DISCOVERY_EMAIL_SENT` audit entries alone, and do not bulk resend from notification counts.
- Verify the `operations_cron` health summary distinguishes rejected jobs and fulfilled jobs reporting `failed > 0`. A green scheduler event is not proof that individual emails succeeded.
- Release gates: (1) verified backup/restore entitlement and approved restore test, (2) authenticated entity-isolation tests, (3) staging delivery-idempotency fault injection, (4) verified per-brand sender and template, (5) owner-approved production promotion.

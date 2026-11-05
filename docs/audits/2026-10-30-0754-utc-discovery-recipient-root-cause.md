# Discovery delivery: verified invalid-recipient root cause (2026-10-30 07:54 UTC)

Status: **READ-ONLY VERIFIED; NONPRODUCTION DOCUMENTATION ONLY**. Governing directive: `docs/WGOS_AUTONOMOUS_ENTERPRISE_OPTIMIZATION_DIRECTIVE.md`.

## Evidence
- Neon production SQL responded at **2026-10-30 07:54:06.939 UTC**. Pending notification records: **337** (195 `NEW_WEB_INQUIRY`, 142 `DISCOVERY_AUTOMATION_FAILED`). Pending notifications are **not** equivalent to unserved customers.
- Across historical Studio2016 discovery-failure records, four opportunities matched the database: **three** in active discovery stages and **one** already at `PROPOSAL`. All **three active failed opportunities** have **consecutive dots in the local part** of their stored contact email. Only aggregate counts were retrieved; no addresses or customer identifiers are recorded here.
- A separate production read at 07:52 UTC showed 24 `operations_cron` health records marked `OK` in two hours. Provider API logs independently showed 100 most recent `POST /emails` requests returned HTTP 422, including three at **07:50:41 UTC**. Vercel grouped runtime errors identify invalid recipient formatting. A scheduler `OK` is not a delivery-success claim.
- Existing **draft** WGOS PR #32 already rejects `..` in `isPlausibleContactEmail`; its synthetic regression tests include `a..b@example.com`. Studio2016 draft PR #7 has its own strict recipient guard. Neither draft is promoted to production.
- Neon production remains reachable but **not restore-certified**. Snapshot inventory and schedule were empty; history retention is six hours and branch protection is off. No restore rehearsal was conducted.
- Resend provider idempotency retains keys for **24 hours** and requires the **same payload** for a repeated key. The current WGOS discovery token and message body are generated per attempt, so adding a stable key alone could yield a 409 payload conflict and does **not** solve the provider-accepted/DB-write-failed gap. See https://resend.com/changelog/idempotency-keys .

## Reusable read-only production probe
Returns **aggregate counts only**, no contact data or opportunity IDs. Executed successfully against the production database at 07:54:06 UTC.

```sql
WITH failed AS (
 SELECT DISTINCT brand_id, payload->>'opportunity_id' AS opportunity_id
 FROM wgos.notification_events
 WHERE event_type='DISCOVERY_AUTOMATION_FAILED' AND brand_id='studio2016'
), matched AS (
 SELECT o.stage, o.contact_email
 FROM failed f JOIN wgos.opportunities o
   ON o.id::text=f.opportunity_id AND o.brand_id=f.brand_id
)
SELECT clock_timestamp() AS observed_utc,
 (SELECT count(*) FROM wgos.notification_events WHERE status='PENDING')::int AS pending_total,
 (SELECT count(*) FROM wgos.notification_events WHERE status='PENDING' AND event_type='NEW_WEB_INQUIRY')::int AS pending_inquiries,
 (SELECT count(*) FROM wgos.notification_events WHERE status='PENDING' AND event_type='DISCOVERY_AUTOMATION_FAILED')::int AS pending_discovery_failures,
 (SELECT count(*) FROM matched WHERE stage IN ('NEW','QUALIFYING','DISCOVERY'))::int AS active_studio2016_failed_opportunities,
 (SELECT count(*) FROM matched WHERE stage IN ('NEW','QUALIFYING','DISCOVERY') AND position('..' in split_part(contact_email,'@',1))>0)::int AS active_local_part_double_dot,
 (SELECT count(*) FROM matched WHERE stage='PROPOSAL')::int AS proposal_stage_failed_opportunities,
 (SELECT count(*) FROM wgos.system_health_events WHERE component='operations_cron' AND status='OK' AND occurred_at>=now()-interval '2 hours')::int AS cron_ok_events_2h,
 (SELECT count(*) FROM wgos.outbox_events WHERE status='PENDING')::int AS pending_outbox_events;
```

## Release gates
1. Preserve production and customer records; do not correct or replay addresses without owner review.
2. Test the draft malformed-recipient guard against representative synthetic double-dot local parts; verify that no provider call occurs and exactly one owner-visible correction alert is produced.
3. Independently test authenticated business isolation and cron health degradation with fulfilled per-item failures.
4. Design a durable, immutable delivery intent/outbox and payload-stable retry strategy; test provider-accepted/database-write-failed, 409 conflicts, concurrency and >24-hour retries without sending real customer email.
5. Independently verify database recovery after explicit cost and authorization review; obtain approval before any production promotion.

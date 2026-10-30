# WGOS enterprise audit — 2026-10-29 10:50 UTC

Status: **P1 customer delivery / P1 recovery assurance / security review pending**.
Scope: read-only GitHub, Neon, Vercel, Resend and attempted Stripe inspection. No production mutations or customer messages.

## Evidence and interpretation

1. **Neon SQL is responding, but restore readiness remains unverified.** SQL probe at 10:48:59 UTC succeeded against project `bold-violet-26333921`, default production branch `br-holy-glitter-b564xvey`. The branch is READY but unprotected. Project history retention is 21,600 seconds (six hours). Snapshot inventory is empty and branch schedule returns `[]`. Zero active queries over 30 seconds in the sampled compute check. These checks do **not** certify recoverability.
2. **Customer-delivery retries continue despite green scheduler telemetry.** The latest Resend sample returned 100 API logs, including repeated `POST /emails` HTTP 422 responses, commonly three requests every five minutes through 10:45:41 UTC. One sampled provider response explicitly reports an invalid `to` address. This sample is not proof that every rejection belongs to WGOS or the same opportunities; provider-to-opportunity correlation remains outstanding. In contrast, `wgos.system_health_events` records 24 `operations_cron/OK` events in the last two hours. The production scheduler code has not received the draft PR #32 health fix.
3. **Notification counters conceal repeat attempts.** `wgos.notification_events` contains 325 pending records: 195 `NEW_WEB_INQUIRY` and 130 `DISCOVERY_AUTOMATION_FAILED`. The latter concern six distinct opportunities (127 Studio2016, two Charmin Greene, one Charmin & Jermaine), with zero new discovery-failure notifications in the past two hours. No notification growth is **not** evidence of email success. One historical dead-letter event exists and zero are unresolved.
4. **Entity security requires explicit review.** Neon reports 116 WGOS base tables, none with PostgreSQL RLS enabled. Application-level authorization may still enforce isolation; this does not establish leakage. GitHub's `get_repo` reports repository `studio2016-sketch/WGOS` has `visibility: public`. The owner's requirement to keep WGOS operationally private warrants a review of whether source and internal audit documentation are intended to be public. Do not change repository visibility or RLS autonomously.
5. **Vercel and release.** The latest production-target deployment is READY at commit `895dbde10239652af11bf0806aee5ff7b2bf7c34`. Grouped production runtime errors and error/fatal logs returned no matches for the last two hours. A READY build and empty log result do not certify the entire app. Draft PR #32 remains unmerged; latest preview READY at `02ea901137af55acabc6000546db88b5888b0e52`.
6. **Stripe account inspection blocked.** `list_available_accounts_or_orgs` required interactive account selection; no account-level Stripe data, payments or reconciliation were verified.

## Priority decisions and safe next work

- **P1 recovery:** verify snapshot entitlement, retention, cost and approval; perform a controlled restore on an isolated disposable branch only after authorization. Measure actual RPO/RTO, entity integrity and app login.
- **P1 delivery:** finish PR #32 integrated checks, confirm provider-enforced idempotency, and test the accepted-email/database-write-failed window without sending customer messages. Correlate provider logs, delivery IDs, database messages and audit events before any replay. Do not equate unchanged notifications with delivery.
- **P1 source confidentiality review:** inspect whether public GitHub visibility is deliberate; check exposed internal operational documents and secret-scanning status without copying secrets into audit logs. Require approval before changing visibility or access.
- **P2 observability:** distinguish per-job and provider failures from scheduler transport success; preserve privacy-safe counts and correlation IDs.

## Verification ladder

| Stage | Evidence |
|---|---|
| Planned | Approved restore drill, provider idempotency and authenticated entity isolation, source visibility review |
| Coded | Existing PR #32 guards and cron-health policy; this report only is new |
| Tested | Fresh read-only Neon SQL, Vercel and provider API observations; no new integration tests |
| Deployed | Production remains `895dbde1`; draft preview READY |
| Verified | SQL responsiveness, current backup metadata, notification counts, provider 422 samples, GitHub visibility and deployment metadata; **not** live email delivery or restore |

No production code, records, customer communications, permissions, payments, configuration or paid resources were changed in this audit.

## Post-report verification (same audit run)

- Added a synthetic regression case to `tests/discovery-delivery-policy.test.ts` for Resend's observed invalid-recipient error shape; GitHub commit `ac9816077a76f9a3e77dc5b1c47b4bfed6fc7e06`, file readback confirmed.
- An independently reconstructed, isolated Node.js 22.16.0 policy harness executed **7/7 passing cases**. This was **not** the repository's CI run or a production email test; the GitHub-hosted source could not be downloaded into the isolated test container because external DNS access was unavailable.
- Vercel reported the report-commit preview READY. The new regression-test commit preview was BUILDING when checked; do not mark it deployed/verified until ready.

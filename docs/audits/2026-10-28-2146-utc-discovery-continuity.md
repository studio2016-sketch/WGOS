# WGOS enterprise audit — 2026-10-28 21:46 UTC

**Scope:** Read-only Neon, Vercel, GitHub and attempted Stripe account discovery. No production configuration or data mutation. Owner's permanent directive and full project safety constraints apply.

## Reliability
- Neon WGOS project `bold-violet-26333921`: live SQL query succeeded at **21:46:05 UTC**, database `neondb`, 116 `wgos` base tables. No sampled active queries older than 30 seconds.
- Project reports owner subscription `launch_v3` and usage counters, but no reliable quota-headroom calculation was obtained. Historical 402 outage remains a continuity risk; a successful SELECT does not certify all routes.
- Vercel WGOS runtime error clustering: no errors returned for previous 24h; production warning/error log search returned no entries for preceding 2h. These are limited observability checks, not end-to-end workflow tests.
- `operations_cron`: 288 `OK` health records in 24h, last at 21:45:41 UTC. Job source invokes recurring, decisions, discovery, proposal drafts and Gmail jobs on a five-minute schedule. An OK status reflects job promises settling, not individual email delivery.

## Business continuity and customer communications
- 318 pending notifications: 194 `NEW_WEB_INQUIRY` (194 distinct opportunities, across 4 brands) and 124 `DISCOVERY_AUTOMATION_FAILED` (only **6 distinct opportunities**, across 3 brands). 5 READ notifications.
- The 124 failures have one distinct error message, consistently related to an invalid email address. Raw addresses were intentionally not copied into this report.
- Follow-up SQL cross-check: **all 6 affected opportunities** have contact email values that fail the proposed format guard; 0 of 6 passed. This validates that the proposed guard addresses the currently observed malformed-address cohort without exposing any customer addresses. It is not a runtime execution test.
- Discovery failure cadence: 12 notifications on Oct 24, 25, 26 and 27 UTC; 9 on Oct 28 at observation. Source code `lib/discovery.ts` attempts delivery for eligible opportunities and deduplicates failure notifications only within 6h. This explains why the same six opportunities can generate repeated failures. It does not prove the clients were otherwise uncontacted.
- Outbox: 1 PROCESSED; unresolved dead letters: 0. No bulk status changes, outbound sends, or deletion authorized.
- **Action:** Owner/team should reconcile 194 inquiries with communication threads and contact records before sending, marking read, or resetting anything. Validate invalid email addresses from authenticated records rather than copying customer data into audit artifacts.

## Safe development on isolated branch
- Branch `audit/discovery-email-guard-20261028`, based on `main`.
- **Coded:** pure plausible-email check; discovery sender skips obviously malformed addresses and records a single owner-facing `INVALID_CONTACT_EMAIL` failure notification per opportunity; delivery errors redact email addresses before audit notification/log output.
- **Test definitions committed:** `tests/discovery-delivery-policy.test.ts`. No execution evidence yet; not certified TESTED.
- **Not deployed to production**; changes are reversible by not merging branch. Even after merge, provider-rejected but syntactically plausible addresses require additional policy and verification.
- **Review required:** verify behavior against production-compatible schema, run tests/build, test contact correction and per-brand visibility in staging, and inspect preview runtime.

## External integration and authorization
- Stripe account listing required interactive user input, unavailable during this noninteractive audit. No Stripe account/payment status is claimed.
- Google Search Console branch remains separate, incomplete, and preview-only. No migration, OAuth credential, payment or production change in this run.

## Priority queue
1. **P1:** Review six distinct failed discovery contacts, correct addresses via authorized workflow, and prevent repetitive failures.
2. **P1:** Reconcile 194 distinct inquiry opportunities with real communications before client-facing action.
3. **P1:** Verify Neon quota headroom and business continuity plan; historical outage remains unresolved as a risk.
4. **P2:** Execute tests and review the isolated delivery guard before promotion; improve per-job outcome observability.
5. **Blocked:** Stripe verification requires account selection in an interactive session.

**Stages:** planned (continuity and reconciliation), coded (delivery guard), test cases authored (not run), preview deployment pending verification, production unchanged, DB probe verified only.

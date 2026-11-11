# WGOS enterprise continuity audit — 2026-10-29 08:50 UTC

Status: **P1 — provider-confirmed recurring rejected discovery email requests**. Read-only infrastructure/provider checks and a reversible regression-test addition. No production or customer mutations.

## Governing authority and evidence scope
- Reviewed the canonical `docs/WGOS_AUTONOMOUS_ENTERPRISE_OPTIMIZATION_DIRECTIVE.md` on `main`, plus the owner's master operating directive and authorization limits.
- Source: GitHub `studio2016-sketch/WGOS`; preview PR #32 (`audit/discovery-email-guard-20261028`). Production `main` at `895dbde10239652af11bf0806aee5ff7b2bf7c34`.
- Neon project `bold-violet-26333921`, default production branch `br-holy-glitter-b564xvey`; read-only SQL at 08:49 UTC.
- Vercel `wgos` project `prj_9tufokCYhR2p0U9jcr9wOAD2c0Wz`; production deployment READY on `895dbde1`; preview build success does not establish functional correctness.
- Resend account inspected using read-only metrics, domain metadata, and API request logs at 08:50 UTC. No recipient, request body, credentials, or personal contact details are reproduced.
- Stripe account enumeration requires interactive selection; no Stripe account or payment state verified.

## New independent provider evidence — P1
1. Resend's most recent **100 API logs** contained **96 POST /emails requests, all HTTP 422**, spanning 2026-10-29 06:15:41 to 08:50:42 UTC. The other four entries were not email-send requests. The sampled cadence is approximately three rejected requests every five minutes. The sample is not the total historical count.
2. A single read-only provider-log detail inspection classified a sampled 422 as an invalid email/address validation error. Do not reproduce provider request/response bodies or customer addresses.
3. Resend reports one verified sending domain, `send.studio2016.com`; sending enabled. Account-level metrics for 2026-10-28 00:00 through 2026-10-29 08:50 UTC returned 0 sent, 0 delivered, 0 failed, 0 bounced. These metrics do not count rejected HTTP 422 API requests and do not establish all external transports.
4. Neon shows **three distinct Studio2016 opportunities** with pending discovery-failure notifications. Aggregate, privacy-preserving validation confirms **3/3 contain consecutive dots in the contact email address**; all three are still in eligible stages and carry immediate urgency. The provider-log pattern is strongly consistent with these records, but a direct provider-request-to-opportunity ID correlation was not available.
5. The `main` source `lib/discovery.ts` lacks the malformed-email preflight guard and continues to attempt delivery for immediate-urgency inquiries outside normal hours. PR #32 includes a guard rejecting consecutive dots before delivery, suppresses repeated invalid-contact alerts, and restricts Studio2016 transport to the correct brand. **Do not infer that PR #32 is already live.**

## Fresh continuity and entity-isolation evidence
- Neon SQL responded at 2026-10-29 08:49 UTC; `wgos` schema has 116 base tables, `neon_auth` has nine, and `public` has zero. No sampled active query exceeded 30 seconds and no lock waiter was observed.
- `wgos` has 0/116 tables with RLS enabled; independent authenticated cross-entity access testing remains necessary. Aggregate linked communication records showed 0 brand mismatches out of 436, but this is not proof of authorization isolation.
- 325 pending notifications: 195 `NEW_WEB_INQUIRY` and 130 `DISCOVERY_AUTOMATION_FAILED`. Pending failures cover six distinct opportunities: Studio2016 3, Charmin Greene 2, Charmin & Jermaine 1. Pending status does not establish unanswered customers.
- 24 `operations_cron` health records marked OK over two hours; production health detail lacks the proposed `reportedFailures` field. Vercel returned no grouped production runtime errors and no matching error/fatal logs over two hours. These observations do not negate the provider's 422s.
- Zero unresolved dead letters (one historical resolved record).
- Neon production branch `protected=false`; no listed snapshots or scheduled snapshots; project history retention 21,600 seconds (six hours). A current restore, recovery time, and recovery point have **not** been verified. Historical restore metadata is not a current recovery test.
- GitHub comparison before this audit's new test: PR #32 diverged from `main`, 33 commits ahead and one behind; no merge authorized.

## Reversible improvement and verification
- Added synthetic consecutive-dot domain-address regression coverage in `tests/discovery-delivery-policy.test.ts` on PR #32 at commit `923067614efcc00b3fdb34d3aa386761c118c735`.
- Independently ran five isolated Node.js 22.16.0 policy tests in a local harness reconstructed from the fetched policy and test source: **5 passed, 0 failed**. This is not a full repository CI run, Next.js build, integrated provider test, or production verification.
- Existing policy in PR #32 would reject the observed malformed-address class without attempting provider delivery. Actual suppression in production is **not yet verified**.

## Release gates and next actions
1. Keep PR #32 in draft until reconciled with `main`; verify the actual CI workflow, preview build, authenticated entity isolation, and provider integration in non-customer staging. No bulk retries or customer sends.
2. Before any production promotion, review the operational consequence that the Studio2016-only sender guard intentionally stops cross-brand delivery until brand-specific transport is verified. This requires owner authorization.
3. Reconcile failed opportunities with provider request logs and communication records without exposing contact details. Correct contact information only through an authorized customer/owner workflow.
4. Obtain approval for a safe, disposable Neon restore drill and confirm backup entitlement/cost before changing protection or retention. Do not perform live restore, branch cutover, paid upgrade, or permissions changes autonomously.
5. Verify sender-side idempotency under provider-accepted/database-write-failed staging fault injection before enabling retries.

## Stage ledger
- **Planned:** recovery drill, provider idempotency verification, authenticated entity isolation, cross-brand transport validation, notification reconciliation.
- **Coded:** existing PR #32 protections plus new regression test; this audit report.
- **Tested:** five isolated policy tests passed; read-only Neon/Resend/Vercel/GitHub probes succeeded where described.
- **Deployed:** production remains `895dbde1`; PR #32 is preview-only, with latest test-commit preview status to be checked separately.
- **Verified:** provider 422 API rejections, database connectivity and aggregate counts, backup metadata, production deployment metadata. **Not verified:** live email delivery, restore, Stripe, complete entity isolation, production effectiveness of PR #32.

No production changes, paid resources, customer communications, payment actions, record edits, or database migrations were executed.

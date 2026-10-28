# WGOS database continuity: isolated restore rehearsal (DRAFT — approval required)

**Status:** Prepared and source-controlled; NOT an executed recovery or certified backup.  
**Priority:** P0. Related issue: #18.  
**Governing documents:** `docs/WGOS_AUTONOMOUS_ENTERPRISE_OPTIMIZATION_DIRECTIVE.md` and owner's full Master Operating Directive.  
**Evidence captured:** 2026-10-28 04:49–04:50 UTC; read-only Neon SQL and API responses.

## What was actually verified
- Production PostgreSQL connection succeeded to `neondb`; `wgos` contains 116 base tables. No active query older than 30 seconds or waiting lock was observed at the sampled instant.
- Production branch was ready but **unprotected**. Current snapshots list was empty; snapshot schedule was empty. Project history retention was reported as **21,600 seconds (six hours)**.
- A prior branch record refers to a finalized historical restore, but this does **not** certify a current, recoverable backup or an RTO/RPO.
- The read-only SQL in `continuity-baseline-readonly.sql` executed successfully. At the sample time: 8 brand rows, 12 brand memberships, 196 opportunities, 3 proposals, 0 projects, 0 payments, 196 communication threads, 433 communication messages, 315 notifications, 1 outbox event. Six scoped relationship-integrity checks returned zero exceptions.
- The baseline is a **sample**, not a transactionally synchronized production-to-restore comparison. It does not prove that communications, payment systems, auth, scheduler, or customer-facing workflows work.

## Release and authority gates
**STOP:** Do not create a paid resource, alter retention, create/restore snapshots, change production compute or branch protection, rotate credentials, change DNS, or write production data without owner approval and an explicit cost/impact review. Do not test customer messaging or payments without separate authorization. Never merge or deploy this document as evidence of recovery.

Before rehearsal, document:
1. Authorized owner, provider plan and estimated marginal charges for branch, compute, snapshot and retention; acceptable cleanup/teardown.
2. Recovery objectives: business-approved **RPO** (maximum tolerable data loss) and **RTO** (maximum tolerable restoration time). Neither is established by a six-hour history setting.
3. Exact source branch, timestamp/LSN, authorized recovery mechanism, expected recovery coverage and retention window; confirm through provider documentation and account-specific capabilities.
4. Isolation: no production DNS, webhook, email, Stripe, scheduler, external API side effects, or shared secrets in the restored environment. Prefer restricted network access and non-production credentials.
5. A stop/rollback procedure, responsible operator and evidence log location.

## Approved rehearsal sequence (not yet executed)
1. Capture preflight timestamp, source commit/deployment identity, schema inventory, `continuity-baseline-readonly.sql` result, and available provider recovery metadata. Store counts only; no customer PII in GitHub or audit logs.
2. After explicit authorization, provision an **isolated** recovery target using a supported provider method. Record start time, restore point, operations and actual cost/usage. Never overwrite the production branch.
3. Verify database opens using least-privileged test credentials; compare schema, critical row counts, representative referential checks and entity boundaries to the chosen consistent source point. Differences need investigation, not automatic correction.
4. Independently test authorized single-brand, unauthorized other-brand and multi-brand access using synthetic identities/data. Preserve nonprofit and personal-trading boundaries.
5. Check application read-only startup and representative non-sending workflows in an isolated preview; disable jobs and outbound effects. Payment and delivery simulations must be sandboxed.
6. Record elapsed restoration time, recovered source point, actual RPO/RTO, observed failures, costs and data-integrity results. If any required check fails, mark **NOT CERTIFIED**.
7. Teardown only the expressly authorized isolated test resources, after confirming no production dependency. Keep evidence, not secrets or client records.

## Evidence gate
Mark **VERIFIED** only when a restore to an isolated environment has actually succeeded, critical data and authorization checks have passed, provider recovery coverage is documented, measured RPO/RTO meet approved targets, and cleanup/continuity ownership are recorded. An HTTP 200, production SQL read, historical restore metadata, or a green deployment is insufficient.

## Other unresolved blockers
- Scheduler's `OK` health can coexist with nested discovery failures; PR #15 remains open. See issue #22.
- Independent authenticated entity isolation remains unverified. See issues #20, #21, #25 and #27.
- Stripe account-specific verification requires interactive account selection and was not completed during this run.

**Change record:** Documentation and read-only SQL only, on a non-production GitHub branch. No database, configuration, billing, communication or deployment mutation.

# WGOS — Entity-boundary negative-test matrix (draft; staging only)

**Purpose:** Define an independent, reproducible authorization test for business continuity rehearsals. This is a test specification, **not** evidence of passing isolation, a production security control, or authorization to deploy. It complements `CONTINUITY-EVIDENCE-GATE.md`.

## Preconditions (all required)

- Use an explicitly approved isolated staging environment with **synthetic** customers, payments, trades, personnel and documents; no production database copies unless separately authorized and safely sanitized.
- Disable outbound email/SMS, real Stripe charges/refunds, trading, webhooks, scheduled jobs and any irreversible integrations. Use mocks and non-live credentials.
- Provision synthetic identities: platform owner; member of entity A only; member of entity B only; revoked member; unauthenticated visitor; and service account with a single scoped purpose.
- Label A and B as **distinct** business entities, not two brands under the same entity. Include WGOS business workspaces, TradeOS, Dionne's Boutique and Sound Legacy Institute in the coverage plan without mixing their records.
- Record test build SHA, environment, test-data version, timestamp, authenticated actor, expected authorization result, actual status, returned data scope, side-effect count, and independent reviewer.
- Do not publish tokens, emails, customer IDs, row-level data, role grants or exploitable route details to a public repository.

## Minimum negative and positive cases

| ID | Scenario | Expected result |
|---|---|---|
| E01 | A member reads A's permitted customer/inventory/booking data | Allowed, only within the authorized role and entity |
| E02 | A member requests B's same resource by direct identifier or URL | Denied; no B data or existence leak |
| E03 | A member changes an A-scoped query/filter/body to B | Denied; server does not trust caller-provided entity |
| E04 | A member requests a global report/search/export containing A and B | Only authorized entity rows, aggregates and files |
| E05 | A member attempts B create/update/delete or assignment | Denied; no database or external side effect |
| E06 | Revoked member reuses an existing session/token | Denied after documented revocation window; no stale access |
| E07 | Unauthenticated caller invokes business APIs or downloads | Denied; no private content |
| E08 | A-scoped service/cron job attempts B data or notifications | Denied or skipped with accurate failure classification |
| E09 | A and B requests share cache/CDN/server-rendered route | No cross-entity cache key or response contamination |
| E10 | A's document/media link or signed URL is reused by B | Denied or expires per policy; no B data exposure |
| E11 | A's commerce operation references B's catalog/payment context | Denied; no cross-entity charges, refunds, inventory mutation |
| E12 | TradeOS or nonprofit identity accesses another business's records | Denied; financial, trading and nonprofit boundaries preserved |
| E13 | Owner switches explicitly between A and B | Each request uses freshly authorized scope; no residual data |
| E14 | Restored isolated environment repeats E01–E13 | Same results after recovery, with no live outbound side effects |

## Independent verification and fail-closed rule

Run every case through the **actual authenticated application/API path** and inspect synthetic database state plus mock-provider call counts. Verify both positive and negative cases: blanket 403 responses are not proof of correct authorization. A read-only database metadata check (including row-level-security flags) is **not** an application isolation test; if enforcement is application-layer, test every query, background job and export path. A test is not passed solely because a preview is READY or an endpoint returns 200.

Fail the rehearsal if any wrong-entity read, write, aggregate, cache response, file access or provider call succeeds; if evidence is missing; or if a required identity cannot be exercised. Store detailed signed evidence in an access-controlled per-entity location and only sanitized outcomes in GitHub. Require independent reviewer sign-off, separately approved cost/restore scope and explicit owner approval before any production promotion.

**Status:** PLANNED test specification only. No authenticated execution, production change, live send, charge, trade, database migration, or failover certification is implied.

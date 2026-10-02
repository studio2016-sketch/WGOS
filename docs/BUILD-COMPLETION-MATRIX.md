# WGOS Build Completion Matrix

Status legend: BUILT = code/schema exists; ACTIVATE = requires production migration, credential, provider authorization, or consequential verification.

| Capability | Status | Completion gate |
|---|---|---|
| Multi-brand control plane | VERIFIED FOUNDATION | Production control plane, brand scoping and command views are live |
| Authentication | VERIFIED FOUNDATION | Owner authentication and unauthenticated route protections are live |
| Server-side brand authorization | ACTIVE | Scoped authorization helpers protect brand/project/task/commercial routes; real non-owner role-matrix acceptance awaits a scoped Auth identity |
| Operations/projects/tasks | BUILT | Live and regression-tested |
| Recurring work/comments/dependencies | BUILT | Live and regression-tested |
| CRM contacts/organizations/relationships | ACTIVE | Canonical contact/organization graph is live; public inquiries now deduplicate into it |
| Opportunity pipeline | ACTIVE | Manual and public-site opportunity creation are live with Sales Autopilot signals |
| Public web inquiry capture | ACTIVE | All six configured brand sites submit directly into WGOS CRM, communications and notification workflows |
| Proposal engine | BUILT | Live schema present; brand templates |
| Contract/e-sign abstraction | TEST COMMISSIONED | SignWell authenticated (HTTP 200), WGOS webhook registered/verified, secure agreement/signature lifecycle built; promotion from TEST to LIVE remains intentional |
| Client portal identity model | VERIFIED FOUNDATION | Token-gated brand-native workspaces live across configured brands; valid-token end-to-end test still required |
| Invoicing/payments/refunds | PROVIDER-READY | Independent per-brand Stripe checkout/webhook architecture built; brand credentials + commissioning remain |
| Communications | ACTIVE / CONNECTED | Google Gmail connection is verified; governed send, reply threading and reply synchronization are built and active |
| Calendar | ACTIVE / CONNECTED | Google Calendar connection is verified; native schedule records and governed synchronization controls are live |
| Crew/equipment | BUILT | Live schema present + populate inventory |
| Global search/reporting | ACTIVE | Global search and exact-record routing are deployed; permission regression remains part of final acceptance |
| Workflow/retry/dead-letter | ACTIVE FOUNDATION | Recurring worker + governed client-decision workflow processing active; retry/dead-letter failure test remains |
| AI authority/execution ledger | BUILT | Apply migrations + action policy seeds |
| Audit/approvals/document versions | ACTIVE | Governance schema live; client approvals audited and surfaced in Autopilot |
| Data governance/idempotency/health | RESTORE VERIFIED | Reconciled schema live, authenticated export built; production snapshot restore validated on an isolated Neon branch |
| Accounting | ACTIVATE | Provider decision + mapping |
| Production schema | VERIFIED | Reconciled contacts/agreements/payments model is live; future changes require branch test and explicit production approval |
| Branded public proposal/sign/pay/portal UI | BUILT / DOMAIN COMMISSIONING | Proposal, agreement, payment handoff/return, client workspace and direct inquiry capture are built across all six configured brands; four custom domains still need Vercel attachment |

## Definition of platform completion
WGOS is production-complete only when the full sandbox lifecycle succeeds under each relevant permission class and the backup/restore/export tests pass. A successful Vercel build alone is not completion.

## Client experience commissioning update
- Secure proposal access uses opaque token validation; UUID knowledge alone is insufficient.
- Secure post-sale client access is brand + organization scoped and revocable.
- Configured public brands now render native client workspaces from the canonical WGOS API.
- Client approval / revision actions are validated, audited, published to the workflow outbox, and surfaced in Executive Autopilot.
- Approval-gated client-visible tasks are the only task records exposed publicly until a dedicated client-visibility field is explicitly approved and migrated.
- Public portal payloads deliberately omit internal task priority, approval metadata, and document storage references.
- Proposal public paths are canonicalized by proposal ID.

## Automated commercial handoff
- Proposal acceptance now stays on the originating brand for all six configured public brands while WGOS remains the authority underneath.
- Accepted proposals publish a `PROPOSAL_ACCEPTED` outbox event.
- Agreement creation is idempotent by proposal and may be prepared automatically when approved brand terms exist.
- If approved terms are missing, WGOS raises an internal `AGREEMENT_SETUP_REQUIRED` signal instead of fabricating legal terms.
- Agreement preparation does not send a signature request; provider dispatch remains a governed SignWell commissioning step.


## Production completion boundary
Autonomous software work is no longer the primary blocker for the configured commercial lifecycle. Remaining gates are external commissioning or operator-controlled infrastructure:
- Custom-domain attachment is incomplete for Jermaine Williams, Charmin Greene, Sound Legacy Institute and CG Success.
- Per-brand Stripe payment profiles remain DISABLED until each independent account's key and webhook secret are configured and verified.
- SignWell is authenticated and webhook-commissioned in TEST mode; intentional TEST→LIVE promotion remains before client signature traffic.
- A real provider-backed sandbox lifecycle remains an acceptance test before declaring the platform production-complete. Backup/restore has been validated independently.

## Backup / restore validation — 2026-10-02
- Production snapshot/restore behavior was validated without changing business records.
- Verified matching counts for brands (8), app users (1), organizations (0), contacts (0), opportunities (0), proposals (0), agreements (0), projects (0), tasks (0), and the then-current audit ledger.
- Neon restore/finalization changed branch identities during validation. Current branch identity must be discovered from Neon instead of hardcoded: `br-holy-glitter-b564xvey` is now the primary/default production branch; `br-icy-wind-b5i0u5t3` is the isolated restore-validation branch.
- The validation branch remains isolated and should be deleted only after explicit operator approval because branch deletion is destructive.

## Public inquiry commissioning update
- Studio2016, Jermaine Williams, Charmin Greene, Charmin & Jermaine, CG Success and Sound Legacy Institute now submit website inquiries directly into WGOS rather than relying on mail-client handoffs.
- WGOS unifies contacts by email, associates brand relationships, creates NEW opportunities, records discovery context, creates an inbound communication thread, raises a `NEW_WEB_INQUIRY` notification and writes an audit event.
- Exact browser retries are deduplicated for 15 minutes through the existing idempotency primitive; materially different follow-up inquiries are retained.
- Studio2016 retains supplemental Resend delivery when configured, but WGOS is now the authoritative intake path.

## Authentication custom-domain commissioning — 2026-10-02
- The production “Invalid origin” login failure was reproduced through a temporary commissioning probe against the exact Neon Auth endpoint used by deployed WGOS.
- WGOS now owns the browser-origin security boundary: state-changing auth requests reject cross-site or mismatched origins before proxying upstream.
- After that validation, WGOS forwards the fixed internal origin `https://wgos.vercel.app`, which the live Neon Auth endpoint already trusts. This decouples canonical `wgos.app` login from branch-specific Neon trusted-domain drift.
- Password-reset requests are similarly normalized to the trusted internal reset URL before being handed to Neon Auth.
- A live dummy-credential probe through `https://wgos.app/api/auth/sign-in/email` changed from `403 Invalid origin` to the expected `401 Invalid email or password`, proving the origin defect is resolved without using or altering the owner account.
- The temporary public probe route was removed after verification.
- Current production deployment and six configured brand deployments were rechecked; all were READY and no runtime error groups were present in the selected two-hour window.

## SignWell provider commissioning — 2026-10-02
- Verified the configured SignWell API key against the live provider `/me` endpoint: HTTP 200.
- Confirmed WGOS remained in `TEST` mode during commissioning.
- Registered `https://wgos.app/api/webhooks/signwell` with SignWell and re-read provider hooks to verify it persisted.
- Persisted `signwell / esign / CONNECTED` in `wgos.integration_registry` with TEST-mode and webhook metadata.
- No agreement was sent and no client was contacted. LIVE promotion remains a deliberate operational gate.
- WGOS production Stripe credentials were also checked during this pass and are not configured; per-brand payment profiles remain correctly DISABLED.

## Production hardening update — 2026-10-02
- Public payment-status reads now require explicit brand scope before querying a merchant account.
- Public web inquiries reject oversized request bodies, deduplicate exact retries, limit repeated submissions by brand/email and apply a high-water brand flood guard before creating CRM records.
- Current production integration registry confirms Google Gmail, Google Calendar and SignWell TEST-mode connectivity; per-brand Stripe remains intentionally uncommissioned.

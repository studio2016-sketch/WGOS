# WGOS Council Architecture Review

Status: REQUIRED BUILD STANDARD
Reviewed disciplines: platform architecture, security, legal/entity governance, finance, operations, production, CRM, data, UX/accessibility, integrations, automation/AI, observability, continuity.

## Council decisions

### 1. Legal/entity isolation
Every revenue-bearing record must resolve to both a brand and contracting legal entity. Entity form changes (sole proprietor -> LLC, partnership changes, nonprofit status) are effective-dated; historical contracts never silently inherit a later entity identity. Bass One Basses is a partner/client relationship and is never represented as an owned WGOS entity.

### 2. Authorization
Brand selection is not authorization. All protected reads/writes require server-side membership checks. Global access is an explicit permission, not an implied consequence of seeing the Global UI. Sensitive finance, legal, HR/crew and nonprofit records support narrower scopes than general brand membership.

### 3. Canonical identity
People and organizations remain canonical global identities, but brand relationships and private notes are scoped. Merge operations must be auditable and reversible. Never expose cross-brand relationships to a public portal unless expressly permitted.

### 4. Financial integrity
Store money in integer minor units plus ISO currency. Payments, refunds, fees and allocations are ledger events; do not overwrite settled history. Payment provider IDs are idempotency keys. Accounting remains a specialized integration.

### 5. Contracts and documents
Proposals, SOWs, contracts and signed artifacts require immutable versions, hashes, timestamps, signer identity/provider references and retention state. Legal templates are effective-dated by entity/brand. E-sign infrastructure remains replaceable behind a provider adapter.

### 6. Workflow/approval engine
Automations are event-driven, idempotent and retryable. High-impact actions (contract send, payment/refund, destructive changes, public publishing, external bulk communication, permission changes) can require approval. Every execution records trigger, actor, inputs, outputs and status.

### 7. AI authority
AI permission is explicit per action: READ, DRAFT, PROPOSE_ACTION, EXECUTE_LOW_RISK, EXECUTE_APPROVED. AI never derives authority from UI visibility. High-impact actions require deterministic policy checks and, where configured, human approval.

### 8. Integrations
Google Workspace, e-sign, payments, accounting, GitHub/Vercel and future providers are adapters in an integration registry. Store external object mappings, sync cursors, health, last success/error and webhook deduplication keys. Failures go to a retry/dead-letter path.

### 9. Audit/event ledger
Material mutations produce append-only audit events including actor, acting mode (human/service/AI), brand/entity context, request/correlation ID, before/after or change summary, timestamp and source. Security events have dedicated retention.

### 10. Data lifecycle
Define classification, retention, archival and deletion policies. Soft deletion does not satisfy a legal deletion request by itself. Backups must have tested restore procedures. Export is a first-class capability to avoid vendor lock-in.

### 11. Reliability/security
Separate production/preview data. Secrets never enter Git. Use least privilege, CSRF/session protections, rate limits, input validation, secure headers, webhook signature verification, dependency scanning, database constraints, observability and alerting. Establish RPO/RTO targets before critical financial/legal workflows depend on WGOS.

### 12. UX/accessibility/mobile
Keyboard access, focus states, semantic labels, contrast and responsive workflows are release requirements. Destructive and high-impact actions need clear confirmation and undo/recovery where feasible.

### 13. Search/reporting/customization
Global search must respect authorization. Saved views, tags and custom fields are metadata, not ad-hoc schema mutations. Reporting uses governed definitions for revenue, pipeline, utilization and conversion.

### 14. Public brand continuity
Client-facing URLs stay on the originating brand domain. Hostname resolves brand context. Public forms/portals receive only explicitly published fields. Cross-brand referrals create explicit relationship events rather than silently changing brand ownership.

## Release gates
No production feature is complete until: authorization is enforced server-side; audit event exists; validation and idempotency are defined; error/retry behavior is defined; sensitive data classification is known; observability exists; export/recovery path is known; and brand/legal-entity context is unambiguous.

## Database note
database/schema.sql is historical bootstrap only. Applied migrations and the live dedicated WGOS database are authoritative. New changes must be forward migrations under database/migrations and must not destructively rewrite production history.

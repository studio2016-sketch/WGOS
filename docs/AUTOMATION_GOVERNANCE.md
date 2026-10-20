# WGOS Automation Control Standard — 2026-10-19

Authority: WGOS Master Operating Directive (foundational). Scope: all businesses, including jointly owned brands and nonprofit entities.

## Autonomous operations (low risk)
- Monitor operational records for overdue and blocked work.
- Prepare internal reminders and summaries with direct record references and brand-specific scope.
- Create routine draft tasks and follow-ups only after their workflow definitions and permissions are verified.
- Retry idempotent technical operations within controlled limits; isolate failures and surface exceptions.

## Approval-required actions
Contract terms, signatures, binding proposals, disbursements, purchases, payments, refunds, pricing changes, personnel decisions, credentials, brokerage trades, customer-facing promises and messages with material impact require explicit authorization in the relevant legal entity. Absence of approval means no execution.

## Multi-agent governance
An orchestrator routes read-only analyses to specialized Finance, Commercial, Delivery, Security, and Compliance reviewers. A critical reviewer checks factual provenance, conflicts, permissions and risks. The Decision Council synthesizes recommendations; it does not grant authority. Executor agents may act only on permitted operations, with least privilege, audited intent, idempotency and reversible retry rules.

## Evidence and lifecycle
States are PLANNED -> CODED -> TESTED -> DEPLOYED -> VERIFIED. Never equate them. Every alert links to an actual brand-scoped record. Report confirmed revenue, receipts, expenses and profit separately from forecasts or unvalidated estimates. Keep nonprofit, personal-investment and commercial funds separate.

## Release stages
1. Exception watch (tasks overdue or blocked): read-only observations plus brand-scoped in-app alerts. Enabled ONLY after `WGOS_EXCEPTION_AUTOMATIONS_ENABLED=true` and production checks.
2. Receivables, project handoff, staffing availability and business-specific follow-ups: add individually with schema review, privacy evaluation and evidence-linked alerts.
3. Approved low-risk execution: authenticated owner-configured policies, dry runs, holdbacks, kill switch, rate limits, audit events and rollback.
4. Executive council: independent analysis and adversarial verification, with human final approval on consequential decisions.

## Acceptance tests
- No cross-brand data surfaced to users lacking membership; existing dashboard filter must remain enforced.
- Repeated cron runs do not create duplicate alerts within the configured 24-hour window.
- Cron cannot run without CRON_SECRET. Feature flag disabled means no observer queries.
- Observer cannot send email, alter tasks, create payments, change contracts or execute trades.
- Verify actual successful Vercel deployment and end-to-end app behavior before production completion is claimed.

Note: the existing production cron runs other jobs; this change must not block them on a disabled observer.

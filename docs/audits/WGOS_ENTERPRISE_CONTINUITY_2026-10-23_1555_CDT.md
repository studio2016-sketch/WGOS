# WGOS Enterprise Continuity Audit — 2026-10-23 15:55 CDT

**Authority:** canonical WGOS directive and owner's Project directive. Read-only inspections of production Neon, Vercel, GitHub, and live WGOS Stripe. Two reversible communications code corrections committed exclusively to `audit/enterprise-continuity-20261022-2150`. No production configuration, database mutations, customer communications, financial operations, or new infrastructure resources.

## P0 — Database availability and recovery
- SQL responded at **2026-10-23 20:52:58.490 UTC**, `neondb`, **0 lock waits**, **3 sessions**. This is point-in-time connectivity, not an uptime certification.
- Production branch `br-holy-glitter-b564xvey`: **ready, primary, unprotected**.
- Project `bold-violet-26333921` reports **21,600 seconds (6 hours) recovery history**. Production snapshot schedule **[]**; snapshot list **[]**. An older archived restoration branch exists, but no independent current restore drill was executed.
- Network metadata: `block_public_connections:false`, no allowed IP entries; authentication/permissions still apply. No changes made.
- **Recovery readiness remains unverified**; any protection, backup schedule, retention, resource or restore changes require explicit cost/impact assessment and approval.

## P1 — NEW: brand-filter / selected-thread mismatch in communications
- **Root cause confirmed by source inspection:** `app/admin/communications/page.tsx` loaded message bodies for `?thread=` before applying `?brand=` to the available threads. `CommunicationWorkspace` then fell back to the first filtered thread if the selected thread was not in that brand, while still receiving message bodies loaded from the other thread. A crafted or stale brand/thread combination could therefore display an incorrectly labeled conversation's contents to a user already authorized to view the underlying thread. This is a **brand-context isolation defect**, not evidence of unauthorized external access or a confirmed data breach.
- Fresh production read-only aggregate: **190** threads across **4** brands, **22,438** ordered cross-brand thread combinations; these are theoretical mismatches, not confirmed user incidents.
- **Fixed in audit branch** `d8c34b25d4d364428f979e4fb72cb246ced3f6e5`: apply authorized brand filter before selecting the thread or fetching message bodies, pass the validated selected ID to the workspace, clear messages on load failure.
- **Additional UI isolation** `256d56320fb58bbb1ddf434f1b8ca6982fc045a5`: organization and contact choices are restricted to the selected brand, and switching brands clears stale organization/contact selections. The server-side brand-association guards committed earlier remain the authoritative enforcement.
- **Tests:** updated source independently fetched and inspected; isolated four-case selection fixture passed. Both commit-specific Vercel preview builds were independently observed **READY**. These are source/fixture/build checks, **not authenticated browser/API negative tests**. Production still uses earlier code.

## P1 — Automation, client queue, and payment event delivery
- Fresh SQL at **2026-10-23 20:53:26.804 UTC**: 24 `operations_cron` events in prior 2h, 24 `OK`, **24 lacking `jobOutcomes`**; component success unverified. Development health instrumentation not in production.
- **250** pending notifications = **186** inquiry notices + **64** discovery failure notices; **0** new discovery-failure notices in prior hour; **108** inquiry notices now older than 7 days. Authenticity and reply state unverified.
- Stripe live WGOS account `acct_1UL6u4Bd3Iqgj7TF`: `GET /v1/webhook_endpoints` returned **0**; `GET /v2/core/event_destinations` returned **0**. No verified event-driven reconciliation.
- Latest observed production Vercel deployment `dpl_5SJfsMp69RXt7g3fNfiVSyU5z3jh` **READY**, main commit `dbb5394effb6db8894dd060ade73c6925b5f9406` (legibility and contrast changes). READY is not end-to-end verification.

## Stage gates

| Workstream | Planned | Coded | Tested | Deployed | Verified |
|---|---|---|---|---|---|
| Brand/thread selection consistency | Yes | Audit branch `d8c34b2` | Source and 4-case isolated fixture | Preview READY; not production | Source, fixture and preview build only |
| New-thread brand-scoped dropdowns | Yes | Audit branch `256d563` | Source checks | Preview READY; not production | Source and preview build only |
| Recovery | Yes | No production changes | Connectivity, metadata, snapshot/schedule reads | No | Point-in-time SQL only; restore **unverified** |
| Scheduler observability | Yes | Prior audit-branch changes | Production event inspection | Not production | Job-level success **unverified** |
| Stripe event destinations | Yes | No new code | Live v1 and v2 list | None | **0** endpoints/destinations |

## Next authorized work
1. Assess database recovery options and costs before requesting approval for a nonproduction restore drill and durable backup/branch protection.
2. Run authenticated preview browser tests for brand/thread mismatch, unauthorized brand access, contact persistence, and negative cross-brand API calls; preserve entity boundaries.
3. Integrate the corrected communications code with newer main changes only after regression checks and approved production promotion.
4. Verify scheduler job outcomes and discovery-recipient handling without sending live customer messages.
5. Design entity-specific payment event ingestion with signatures, idempotency and reconciliation; no Stripe writes without approval.

**No production application, database, financial, or identity changes.** Preview builds were triggered by branch commits; associated resource usage/cost was not independently assessed.

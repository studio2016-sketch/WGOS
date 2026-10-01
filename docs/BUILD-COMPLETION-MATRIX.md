# WGOS Build Completion Matrix

Status legend: BUILT = code/schema exists; ACTIVATE = requires production migration, credential, provider authorization, or consequential verification.

| Capability | Status | Completion gate |
|---|---|---|
| Multi-brand control plane | BUILT | Production verification |
| Authentication | BUILT | Account verification |
| Server-side brand authorization | BUILT | Apply membership migration + role tests |
| Operations/projects/tasks | BUILT | Live and regression-tested |
| Recurring work/comments/dependencies | BUILT | Live and regression-tested |
| CRM people/organizations/relationships | BUILT | Apply migration |
| Opportunity pipeline | BUILT | Apply migration + lifecycle test |
| Proposal engine | BUILT | Apply migration + brand templates |
| Contract/e-sign abstraction | BUILT | Choose/connect provider |
| Client portal identity model | BUILT | Apply migration + public UI |
| Invoicing/payments/refunds | BUILT | Connect merchant account(s) |
| Communications | BUILT | Google/email adapter activation |
| Calendar | BUILT | Google Calendar adapter activation |
| Crew/equipment | BUILT | Apply migration + populate inventory |
| Global search/reporting | BUILT | Apply migrations + permission tests |
| Workflow/retry/dead-letter | BUILT | Worker activation + failure test |
| AI authority/execution ledger | BUILT | Apply migrations + action policy seeds |
| Audit/approvals/document versions | BUILT | Apply governance migration |
| Data governance/idempotency/health | BUILT | Apply migration + restore/export test |
| Accounting | ACTIVATE | Provider decision + mapping |
| Production DB migrations 019-028 | ACTIVATE | Review/test/explicit production approval; exclude archived migration 029 |
| Branded public proposal/sign/pay/portal UI | BUILT FOUNDATION | Wire each public site after DB activation |

## Definition of platform completion
WGOS is production-complete only when the full sandbox lifecycle succeeds under each relevant permission class and the backup/restore/export tests pass. A successful Vercel build alone is not completion.

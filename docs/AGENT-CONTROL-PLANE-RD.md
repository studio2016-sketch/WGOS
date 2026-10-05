# WGOS Agent Control Plane — Competitive R&D Blueprint

Status: research branch; no production behavior changed.

## Objective

Make WGOS the owner-facing control plane for safe, persistent, multi-agent operation across websites and eventually broader business workflows. Adopt strong public patterns from Fimo, Lovable, Vercel, GitHub, Replit and similar systems without coupling WGOS to any one vendor.

## Architectural principle

Own the business intelligence, brand context, governance, approval policy, audit history and user experience. Prefer commodity infrastructure for model execution, sandboxes, deployment, queues and source control when it is reliable and economical.

## Patterns worth adopting

### 1. Proposal-first autonomous work
Inspired by Fimo's public workflow:
- one branch per agent run
- isolated execution environment
- report + preview + diff
- no production mutation before policy/approval
- resumable human questions when business judgment is required
- reversible history

WGOS adaptation:
- every run is brand-scoped
- every run declares risk class and approval policy
- owner sees Before / After / Why / Expected Impact / Confidence / Preview / Diff
- approval options: Approve, Modify, Reject, Ask Why

### 2. Durable agent control plane
Inspired by Lovable's published agent architecture:
- append-only event history
- separate durable inbox from execution history
- activation/wake-up as a signal, not the payload
- parent/child delegation with durable result messages
- suspend/resume at safe iteration boundaries
- context rendered from history rather than treating raw history as the prompt
- forkable work without rewriting prior history

WGOS adaptation:
- AgentRun is the business object
- AgentEvent is immutable audit history
- AgentInboxMessage carries instructions, questions and results
- AgentActivation wakes/resumes work
- AgentDecision records human approvals/rejections/edits
- AgentArtifact points to preview, diff, report, screenshot, document or other output
- brand context and authorization are resolved before every action

### 3. Agent-as-code and portable skills
Use repository-defined skills/instructions rather than hidden prompts.
Candidate layout:

```
.wgos/
  agents/
    web-director/
    seo/
    geo-aeo/
    accessibility/
    performance/
    conversion/
    content/
    visual-qa/
    security/
  skills/
  policies/
  brand-rules/
```

Each agent should declare:
- goal
- allowed tools
- allowed brands
- model/routing preference
- trigger
- risk class
- approval requirements
- completion checks
- escalation conditions

Use open/portable skill formats where practical so skills can run across Codex, GitHub Copilot and other compatible agent hosts.

### 4. Model routing
Do not bind WGOS to one model.
Route by job:
- high reasoning for architecture, legal-sensitive workflow design and difficult debugging
- strong coding model for implementation
- fast/low-cost model for routine audits, classification and monitoring
- vision/browser-capable model for visual QA

Record model, cost, latency and outcome per run so routing can improve from evidence.

### 5. Browser-based self-verification
Borrow the strongest Replit/GitHub agent pattern:
- agent must test what it changes
- browser smoke test after implementation
- responsive checks
- console/network error checks
- accessibility checks
- critical user-flow tests
- screenshot/visual regression evidence

"Code compiled" is not completion.

### 6. Integration abstraction
Borrow Lovable's deterministic connector philosophy:
- credentials stay outside prompts
- OAuth/permissions handled by connector layer
- tools expose narrow typed actions
- agent receives only authorized capabilities
- brand/user permissions filter tool availability

WGOS should expose its own actions through MCP/API over time so ChatGPT and other approved agents can operate WGOS without bypassing authorization.

## Initial agent roster

### Web Director
Supervises website work, decomposes tasks, delegates, gathers results and prepares owner review.

### Visual/UX QA
Checks layout, responsiveness, consistency, interaction, readability and brand rules.

### Technical QA
Runs build/type checks, route checks, browser smoke tests and error inspection.

### SEO / AEO / GEO
Audits metadata, structured content, internal links, indexability, entity clarity, answer-engine readiness and content gaps.

### Accessibility
Checks semantic structure, keyboard use, contrast, labels, focus behavior and common WCAG failures.

### Performance
Measures loading/runtime behavior, asset weight and likely Core Web Vitals regressions.

### Conversion
Reviews calls to action, friction, trust, lead paths and proposal/booking continuity. Changes with business impact require approval.

### Content Steward
Detects stale content, inconsistent facts, broken assets and brand-language drift.

### Security Reviewer
Reviews dependency/code/config changes and blocks unsafe autonomous publishing.

## Risk and approval classes

- Class 0 — Observe/report only. May run automatically.
- Class 1 — Safe reversible proposal. May create branch/preview automatically; merge requires policy.
- Class 2 — Business-facing change. Owner/authorized brand owner approval required.
- Class 3 — Money, contracts, permissions, credentials, destructive schema/data, production security. Explicit human approval always required.

Autonomy should be earned per agent/action based on observed reliability, not granted globally.

## Owner experience

Primary dashboard concept:

Website Health: 96/100

Dimensions:
Design | Conversion | Performance | Accessibility | SEO | AEO/GEO | Content | Analytics | Brand Compliance | Technical Health | Security

Daily/overnight summary:
- improvements identified
- automatically verified
- awaiting approval
- blocked on decision
- failed/retried
- estimated/observed impact
- agent cost

Review card:
Before | After | Why | Expected impact | Confidence | Preview | Diff
Actions: Approve | Modify | Reject | Ask Why

## Data model additions — design target

Do not migrate production until reviewed.

- agent_definitions
- agent_runs
- agent_events
- agent_inbox_messages
- agent_activations
- agent_decisions
- agent_artifacts
- agent_metrics
- agent_policy_rules
- agent_skill_versions

All records must carry tenant/brand scope where applicable and respect existing server-side authorization.

## Infrastructure fit

Existing WGOS remains:
- Next.js application
- GitHub source of truth
- Vercel runtime/deployments
- Neon Postgres operational source of truth

Candidate commodity infrastructure:
- Vercel Sandbox for isolated execution
- Vercel preview deployments
- GitHub branches/PRs/diffs
- Vercel AI Gateway or equivalent routing where advantageous
- durable workflow/queue infrastructure selected after cost/reliability evaluation

Do not replace WGOS with Fimo/Lovable/Replit. Use them as benchmarks and optional components only where the economics beat ownership.

## Implementation sequence

Phase 0 — Competitive benchmark and architecture
- map Fimo, Lovable, Vercel, GitHub, Replit, Codex and other strong systems
- define WGOS primitives and vendor boundaries
- define risk/approval matrix

Phase 1 — Read-only intelligence
- website health model
- audit agents
- owner inbox
- run/event history
- no code mutation

Phase 2 — Safe proposal mode
- branch per run
- sandbox
- implementation agent
- automated tests
- preview + diff + report
- owner approval

Phase 3 — Controlled autonomy
- policy-based auto-merge for proven Class 1 actions
- scheduled/event-driven agents
- performance/outcome feedback
- model/cost routing

Phase 4 — Business-wide control plane
- reuse the same primitives for CRM, proposals, fulfillment, accounting preparation, marketing and operations
- preserve brand-specific permissions and human approval gates

## Evaluation metrics

Track per agent:
- successful completion rate
- regression rate
- human acceptance rate
- revision rate
- false-positive rate
- average time saved
- model/tool cost
- latency
- business impact when measurable

Promote autonomy only when metrics justify it.

## Competitive rule

For every external platform capability:
1. Is it strategically differentiating for WGOS?
2. Can a vendor provide it more safely/cheaply?
3. Can we keep our data, policy and audit trail portable?
4. Can we swap the provider later?
5. Does it strengthen or weaken the owner experience?

Build what differentiates WGOS. Integrate commodity infrastructure. Preserve portability.

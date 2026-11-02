# WGOS continuity evidence gate (draft-only)

This standalone Node 22 tool evaluates a **sanitized evidence manifest**. It has no network calls, credentials, database writes, provider sends, or deployment hooks.

## Run locally

```sh
node --test scripts/continuity-evidence-gate.test.mjs
node scripts/continuity-evidence-gate.mjs /path/to/sanitized-evidence.json
```

The command exits with status 1 and `BLOCKED` if required evidence is missing, stale, contradictory, or fails thresholds. A complete synthetic manifest returns `EVIDENCE_COMPLETE_HUMAN_REVIEW_REQUIRED`, **not** permission to release. Exit 2 indicates malformed JSON or invocation.

## Evidence contract

- Manifest `observed_at_utc` and each database `sql_checked_at_utc` must be within two hours of evaluation.
- All evidence timestamps must be explicit UTC ISO-8601 with a trailing `Z` (seconds or up to three fractional digits); local-time strings, offsets and impossible calendar dates fail closed.
- **Restore rehearsals do not need to repeat every two hours.** A reviewer-attested `restore.review_valid_until_utc` must be later than the completed rehearsal and still valid at evaluation. The draft gate caps attestation validity at 30 days after completion; this is a **proposed ceiling, not an approved recovery policy**. Any schema, credential, topology or access-control change affecting recovery requires independent re-review even if the date has not expired. The manifest alone cannot detect such changes; a human must verify this before accepting evidence.
- Cover all three named systems: WGOS, TradeOS, DionnesBoutique. A partial or duplicate set fails closed.
- Each system requires a SQL query evidence reference, protected default branch, and isolated restore record containing approval, cost review, independent review, source snapshot, restore receipt, critical-record and schema matches, authenticated isolation test, and measured RPO/RTO within stated targets.
- Record `incident_at_utc`, `recovered_data_at_utc` (last recovered data timestamp), and `first_authenticated_operation_at_utc`. The gate rejects a claimed RPO shorter than incident-to-recovered-data or a claimed RTO shorter than incident-to-first-authenticated-application-operation. Database restore completion alone is not full application recovery. These checks only establish internal manifest consistency, not the truth of its timestamps or independent recovery certification.
- Cross-entity authentication must have a test evidence reference.
- Delivery must have provider receipt evidence, zero observed recipient errors, and explicit passing idempotency, due-first, business-hours and sender-scope tests.
- Production promotion requires a separate owner approval reference.
- Evidence references must be genuine, reviewable identifiers. **A non-empty reference alone is not proof.** Human reviewers must independently inspect source records.

Do not commit a live evidence manifest containing customer information, tokens, connection strings, recipient addresses, security internals or private provider identifiers. Keep live evidence in a restricted evidence store.

## Evidence-sharing and repository-visibility preflight

Before publishing an audit result, independently verify the repository's current visibility and the intended audience. Treat issue comments, pull requests, CI logs and code as potentially public. Never publish raw production telemetry, customer or recipient identifiers, internal security details, credentials, live evidence manifests, private restore receipts, or unredacted provider identifiers to these surfaces. Record only sanitized status, counts, timestamps and reviewable non-sensitive references.

Keep detailed recovery receipts in an independently access-controlled evidence store with explicit per-entity permissions. Verify that a reviewer can inspect them without cross-business access. Repository visibility alone does not establish application access or prove credential exposure. Changing repository visibility, access permissions or production settings requires separate owner approval.

## Release boundaries

This tool is not wired to Vercel, Neon, GitHub Actions or production. Do not merge, schedule, deploy or promote it automatically. In particular, the tool does not create a backup, perform a restore, verify a provider receipt, establish a legal entity's access rights, or authorize costs. Those require independent tests and owner approvals under the canonical WGOS directive.

Existing production code and all business records remain unchanged by this draft.

## Isolated recovery rehearsal — operator checklist

**Status:** Preparation only. This is not authorization to provision resources, alter production, send customer communications, or incur charges. A successful offline manifest classification is not an application failover certificate.

1. **Approve scope and budget separately for each legal/business system.** Record owner authorization, provider cost estimate, maximum permitted spend, expiry/teardown deadline, rollback contact, and acceptable RTO/RPO. If approval or cost visibility is missing, stop before creating snapshots, branches, computes, or deployments.
2. **Record current provider evidence.** Capture timestamped project/branch identity, available recovery window, actual provider snapshots/schedules, protection status, source deployment commit, and read-only SQL results. Neon point-in-time history metadata is not a durable independent backup. Historical `restored_from` branch metadata does not establish that a snapshot is currently available.
3. **Keep rehearsal isolated.** Use an approved temporary recovery branch and separately protected nonproduction application environment, never production credentials, domains, customer notification routes, or live payment/trade execution. Disable scheduled jobs, external sends, billing/webhooks, and other side effects in the rehearsal environment before connecting it to restored data. Do not cross-connect WGOS, TradeOS and Dionne's Boutique data.
4. **Measure restoration, not just connection.** Record incident simulation time, recoverable data timestamp, restore start/end, first successful authenticated application operation, and the formula/clock source for measured RPO and RTO. Verify critical table counts and schema fingerprints against the approved source. Record provider receipts and independent reviewer evidence without secrets or customer data.
5. **Prove authenticated entity boundaries.** Exercise owner, authorized business member, wrong-business member and unauthenticated sessions against permitted and forbidden resources. Verify that denied access produces no data disclosure or side effect. Database connectivity or an empty RLS inventory alone is not a substitute for application-level authorization testing.
6. **Verify business continuity end to end.** Test sign-in, entity selection, read-only customer/inventory/operations views, error reporting and degraded-mode behavior on the isolated environment. Validate notification idempotency and sender scope with mocks, not real recipients. Verify that no live provider requests or customer messages occurred.
7. **Teardown and independent attestation.** Record resource termination, cost review, retained evidence location, RPO/RTO results, exceptions and reviewer sign-off. Do not promote a restore, change DNS, rotate credentials, merge a PR, or certify failover without separate owner approval and real-world verification.

### Fail-closed evidence classification

- **PLANNED:** rehearsal plan and approvals prepared, no restore attempted.
- **CODED:** offline gate/runbook changed in a feature branch; not a production safeguard.
- **TESTED:** isolated synthetic tests and/or approved restore rehearsal, explicitly named.
- **DEPLOYED:** separately approved production recovery controls actually enabled.
- **VERIFIED:** authenticated end-to-end restoration/failover, measured RPO/RTO, entity isolation and provider receipts independently reviewed. Never infer this stage from a successful preview build, SQL ping, or branch existence.

**November 2, 2026 evidence boundary:** Read-only inspection showed three responding databases, no listed snapshots or automatic snapshot schedules, unprotected primary branches and no certified application failover. These observations are time-limited and must be refreshed before any rehearsal or release decision.

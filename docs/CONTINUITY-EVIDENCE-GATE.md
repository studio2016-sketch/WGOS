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
- **Restore rehearsals do not need to repeat every two hours.** A reviewer-attested `restore.review_valid_until_utc` must be later than the completed rehearsal and still valid at evaluation. The draft gate caps attestation validity at 30 days after completion; this is a **proposed ceiling, not an approved recovery policy**. Any schema, credential, topology or access-control change affecting recovery requires independent re-review even if the date has not expired. The manifest alone cannot detect such changes; a human must verify this before accepting evidence.
- Cover all three named systems: WGOS, TradeOS, DionnesBoutique. A partial or duplicate set fails closed.
- Each system requires a SQL query evidence reference, protected default branch, and isolated restore record containing approval, cost review, independent review, source snapshot, restore receipt, critical-record and schema matches, authenticated isolation test, and measured RPO/RTO within stated targets.
- Cross-entity authentication must have a test evidence reference.
- Delivery must have provider receipt evidence, zero observed recipient errors, and explicit passing idempotency, due-first, business-hours and sender-scope tests.
- Production promotion requires a separate owner approval reference.
- Evidence references must be genuine, reviewable identifiers. **A non-empty reference alone is not proof.** Human reviewers must independently inspect source records.

Do not commit a live evidence manifest containing customer information, tokens, connection strings, recipient addresses, security internals or private provider identifiers. Keep live evidence in a restricted evidence store.

## Release boundaries

This tool is not wired to Vercel, Neon, GitHub Actions or production. Do not merge, schedule, deploy or promote it automatically. In particular, the tool does not create a backup, perform a restore, verify a provider receipt, establish a legal entity's access rights, or authorize costs. Those require independent tests and owner approvals under the canonical WGOS directive.

Existing production code and all business records remain unchanged by this draft.

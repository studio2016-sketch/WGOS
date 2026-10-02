# WGOS Production Commissioning Runbook

## Database prerequisite
The Neon connector currently requires the dedicated WGOS Neon project ID. Never infer or substitute another project.

## Migration commissioning
1. Identify the dedicated WGOS Neon project ID.
2. Inspect default branch/database and current wgos schema.
3. Compare the applied schema to the WGOS schema manifest before preparing any migration.
4. Prepare only genuinely outstanding migrations on a temporary Neon branch.
5. Run structural and lifecycle tests on the temporary branch.
6. Present test results and exact production migration for explicit approval.
7. Only after approval, complete the prepared migration on production.
8. Record migration completion in audit/system health history.

## Schema manifest
The dedicated WGOS production project uses the reconciled `contacts / agreements / payments` data model represented by `029-reconciled-commissioning.sql`. Do not apply migrations `019` through `028` to that project: they model an earlier `people / contracts / payment_events` shape and would introduce a parallel, incompatible schema.

Before any future database release, inspect the production branch and produce a migration that extends the live reconciled model. Test that exact migration on a temporary Neon branch, then obtain explicit production approval.

## Provider commissioning
Google Workspace, e-sign, payments and accounting are activated independently. Each adapter must prove a real authenticated round trip before integration_registry may show CONNECTED.

## Go-live acceptance
- Owner/admin and brand-scoped permission tests pass.
- Unauthorized cross-brand access fails.
- Inquiry -> opportunity -> proposal -> contract -> invoice/payment -> project -> task completes.
- Provider webhook replay is idempotent.
- Failed integration event retries and reaches dead-letter when exhausted.
- Signed document version/hash and legal-entity snapshot are retained.
- Export succeeds.
- Backup/restore test succeeds.
- Public proposal/sign/pay/client URLs remain on originating brand domains.

## Client experience readiness ladder
For every client-facing capability, use: Configured -> Published -> Reachable -> Functionally Tested -> Provider Verified -> Client-Ready.

Current secure client experience status:
- Studio2016, Jermaine Williams, Charmin Greene, Charmin & Jermaine, CG Success and Sound Legacy Institute: proposal and client-workspace routes published on their native sites.
- WGOS public client API rejects missing access with 401 and invalid/revoked access with 403.
- Client decisions are restricted to pending approvals within the token's brand + organization scope and are audit logged.
- Client decision events feed the workflow outbox, internal notification queue and Executive Autopilot.
- Approval-gated tasks may auto-complete only when the task itself requires approval; waiting dependents release to READY only when all dependencies are DONE.
- Do not expose arbitrary internal task records, document storage references or internal approval metadata to public clients.
- SignWell authenticated provider verification remains a separate commissioning gate; no test signature should be sent solely for commissioning.
- Stripe payment verification remains a separate commissioning gate; no test charge should be created against a real client solely for commissioning.

## Backup and restore validation
On 2026-10-02, production snapshot restore was tested without modifying production. Snapshot `wgos-prod-validation-20261002` from the production branch was restored into isolated branch `wgos-restore-validation-20261002`. Core record counts and the latest audit timestamp matched production exactly. The test snapshot expires automatically; the isolated restore branch remains only for controlled validation/cleanup.

## Runtime database target verification — 2026-10-02
- After the Neon restore operation changed branch identities, a temporary marker was placed only on non-primary branches and a temporary WGOS runtime probe checked for it.
- Deployed WGOS returned no non-primary marker while successfully querying the current schema. The remaining legacy Vercel-dev branch lacks the current audit schema and therefore could not be the responding runtime.
- Result: the production WGOS runtime is not connected to the restore-validation, migration, preview, or legacy Vercel-dev branch. The temporary probe route was removed immediately after verification.

## Isolated lifecycle acceptance — 2026-10-02
- Synthetic fixture records were created only on the isolated restore-validation branch, never on the production branch.
- The reconciled schema successfully linked a prospect organization/contact through a WON opportunity, ACCEPTED proposal and immutable accepted snapshot, SIGNED agreement, COMPLETED signature envelope, provider-attributed PAID deposit, ACTIVE project, and DONE delivery task.
- The fixture also created an inbound communication thread and audit record, validating the canonical relationship path without contacting SignWell, Stripe, Gmail, or a real client.
- This validates the internal database lifecycle. A provider-backed sandbox round trip remains required before the commercial lifecycle is declared fully client-ready.

# WGOS Production Commissioning Runbook

## Database prerequisite
The Neon connector currently requires the dedicated WGOS Neon project ID. Never infer or substitute another project.

## Migration commissioning
1. Identify the dedicated WGOS Neon project ID.
2. Inspect default branch/database and current wgos schema.
3. Compare applied schema to migrations 019-027.
4. Prepare outstanding migrations on a temporary Neon branch.
5. Run structural and lifecycle tests on the temporary branch.
6. Present test results and exact production migration for explicit approval.
7. Only after approval, complete the prepared migration on production.
8. Record migration completion in audit/system health history.

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

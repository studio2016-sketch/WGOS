# External Integration Activation Checklist

WGOS remains provider-neutral at its core. External providers are adapters and may be changed without rewriting canonical business records.

## Required activation sequence
1. Apply reviewed migrations 019-024 to the dedicated WGOS production database.
2. Verify OWNER identity and brand memberships.
3. Configure each brand experience profile: public domain, sender identity, proposal/sign/client/pay paths and theme.
4. Connect Google Workspace for authorized email/calendar/document workflows.
5. Select and connect one e-sign provider; map provider envelope IDs to wgos.signature_envelopes.
6. Connect payment provider account(s) per contracting brand; never assume one merchant account is valid for every legal entity.
7. Configure signed webhook verification, idempotency and retry/dead-letter handling.
8. Connect accounting only after payment/legal-entity mappings are verified.
9. Run sandbox lifecycle test: lead -> opportunity -> proposal -> contract -> payment -> project -> task -> completion.
10. Run authorization tests for global owner, brand admin, member and unauthorized user.
11. Run backup/restore and export test before relying on WGOS as sole system of record.

## Activation rule
No external provider is marked CONNECTED until a real authenticated round-trip succeeds and the result is recorded in integration_registry.

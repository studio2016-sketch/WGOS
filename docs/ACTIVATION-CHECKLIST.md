# External Integration Activation Checklist

WGOS remains provider-neutral at its core. External providers are adapters and may be changed without rewriting canonical business records.

## Required activation sequence
1. Verify the reconciled production schema represented by migration 029 is present. Do not apply superseded migrations 019-028 to the current WGOS production project.
2. Verify OWNER identity and brand memberships.
3. Configure each brand experience profile: public domain, sender identity, proposal/sign/client/pay paths and theme.
4. Connect Google Workspace for authorized email/calendar/document workflows.
5. Verify the selected SignWell account from an authenticated WGOS admin session; keep TEST mode until provider commissioning is intentionally promoted to LIVE.
6. Connect the independent Stripe account for each contracting brand using that brand's configured secret/webhook environment-variable names, then switch its payment profile from DISABLED to DIRECT_STRIPE_ACCOUNT only after verification.
7. Configure signed webhook verification, idempotency and retry/dead-letter handling.
8. Connect accounting only after payment/legal-entity mappings are verified.
9. Run sandbox lifecycle test: lead -> opportunity -> proposal -> contract -> payment -> project -> task -> completion.
10. Run authorization tests for global owner, brand admin, member and unauthorized user.
11. Run backup/restore and export test before relying on WGOS as sole system of record.

## Activation rule
No external provider is marked CONNECTED until a real authenticated round-trip succeeds and the result is recorded in integration_registry.


## Current external blockers
The application code does not require additional creative approval for these items, but production completion still requires operator/provider configuration:
- Attach the intended custom domains to the matching Vercel projects for Jermaine Williams, Charmin Greene, Sound Legacy Institute and CG Success. Charmin & Jermaine and Studio2016 are already attached to their production projects.
- Configure each brand's independent Stripe secret and webhook secret in Vercel, register the brand webhook endpoint `/api/webhooks/stripe/{brandId}` in that Stripe account, verify the account, then commission that brand's payment profile.
- Run the authenticated SignWell Verify Connection action in WGOS. Signature creation is built and remains governed; do not release live signature traffic until the provider is intentionally in LIVE mode.
- Choose/account-map the accounting provider after legal-entity payment mappings are verified.

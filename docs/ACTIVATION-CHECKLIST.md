# External Integration Activation Checklist

WGOS remains provider-neutral at its core. External providers are adapters and may be changed without rewriting canonical business records.

## Required activation sequence
1. Verify the reconciled production schema represented by migration 029 is present. Do not apply superseded migrations 019-028 to the current WGOS production project.
2. Verify OWNER identity and brand memberships.
3. Configure each brand experience profile: public domain, sender identity, proposal/sign/client/pay paths and theme.
4. Connect Google Workspace for authorized email/calendar/document workflows.
5. SignWell account and webhook are verified in TEST mode. Promote to LIVE only when client signature traffic is intentionally authorized.
6. Connect the independent Stripe account for each contracting brand using that brand's configured secret/webhook environment-variable names, then switch its payment profile from DISABLED to DIRECT_STRIPE_ACCOUNT only after verification.
7. Configure signed webhook verification, idempotency and retry/dead-letter handling.
8. Connect accounting only after payment/legal-entity mappings are verified.
9. Confirm public website inquiries are reaching WGOS as contacts + NEW opportunities + inbound communication threads.
10. Run sandbox lifecycle test: lead -> opportunity -> proposal -> contract -> payment -> project -> task -> completion.
11. Run authorization tests for global owner, brand admin, member and unauthorized user.
12. Run backup/restore and export test before relying on WGOS as sole system of record.


## Activation rule
No external provider is marked CONNECTED until a real authenticated round-trip succeeds and the result is recorded in integration_registry.


## Current external blockers
The application code does not require additional creative approval for these items, but production completion still requires operator/provider configuration:
- Attach the intended custom domains to the matching Vercel projects for Jermaine Williams, Charmin Greene, Sound Legacy Institute and CG Success. Charmin & Jermaine and Studio2016 are already attached to their production projects.
- Configure each brand's independent Stripe secret and webhook secret in Vercel, register the brand webhook endpoint `/api/webhooks/stripe/{brandId}` in that Stripe account, verify the account, then commission that brand's payment profile.
- SignWell is verified and webhook-registered in TEST mode. The remaining e-sign gate is intentional TEST→LIVE promotion before real client signature traffic.
- Choose/account-map the accounting provider after legal-entity payment mappings are verified.

## WGOS Auth custom-domain check — 2026-10-02
- WGOS enforces same-origin / non-cross-site browser auth requests at `/api/auth/*` and proxies approved requests to Neon Auth using the fixed trusted internal origin `https://wgos.vercel.app`.
- This avoids relying on branch-specific Neon trusted-domain state for the canonical `wgos.app` hostname while preserving the application-level CSRF/origin boundary.
- Password-reset redirects are normalized to the trusted internal WGOS hostname before upstream submission.
- Live commissioning probe: the same-origin WGOS sign-in path returns the expected credential rejection for a dummy account rather than `Invalid origin`.

# WGOS environment isolation review — November 5, 2026

Related: [#41](https://github.com/studio2016-sketch/WGOS/issues/41), [#18](https://github.com/studio2016-sketch/WGOS/issues/18). Read-only provider review; repository changes proposed for review, not deployed. No decrypted environment values, credentials, customer records, synthetic accounts, restores, paid resources, or live provider changes were requested or created.

## Verified observations

| Control | Current provider evidence | Meaning |
| --- | --- | --- |
| Blob credential | One encrypted `BLOB_READ_WRITE_TOKEN` entry targets production, preview and development; content hint identifies `store_9z5pZGJAysiPdObs`; `readable-secret` remains present | Same configuration entry and storage resource are shared across environments. This is a confirmed scope weakness, not evidence of unauthorized use. |
| Production auth configuration | `NEON_AUTH_BASE_URL` is encrypted Config, production-only, with `readable-secret` | Readable classification confirmed. A base URL can legitimately be Config; the warning alone does not prove that this value contains a credential. |
| Preview DB/auth | Sensitive branch-specific entries exist only for `feature/brand-first-command`; DB comment claims isolation; auth comment explicitly says same provider as production | Comments are operator assertions, not independent routing verification. Generic previews have neither DB nor auth entries in this inventory. |
| Team membership | Complete member response reports one confirmed OWNER, `jermainewlliams`, GitHub `studio2016-sketch` | No extra team member was observed. Does not enumerate tokens, integrations or effective grants. |
| Deployment protection | SSO enabled, `all_except_custom_domains`; password protection and trusted IP restrictions disabled | Vercel-hosted previews are covered by this setting; custom-domain exceptions and bypasses still require review. Disabled optional controls are not independently a defect. |
| Access groups | List request returned 403; Vercel CLI is unavailable locally | Effective access review is incomplete. Do not treat the denied request as evidence that no access groups exist. |
| Environments/connectors | No custom environments and no project connector connections returned | No dedicated recovery custom environment observed. Connector result does not enumerate every legacy Marketplace integration. |
| Neon DB resources | Production `br-holy-glitter-b564xvey` / `ep-misty-hill-b5dcm5yr`; preview `br-tiny-bonus-b5dirrln` / `ep-broad-glade-b5eum2ag` | Separate branches and endpoints exist. Actual Vercel connection destinations remain unverified because values were not decrypted. |
| Preview data | Preview branch reports `init_source=parent-data`, parent production | Branch separation does not establish sanitization. Treat preview as potentially containing copied production records until separately verified. |
| Recovery | Historical restore-validation branch is archived; no recovery custom environment observed | Historical metadata does not certify a current authenticated application restore. Issue #18 remains outstanding. |
| Auth provider | Neon `get_auth` returns 404/not enabled for both production and named preview branch; production redacted-config endpoint agrees | Cannot reconcile configured auth URL with current managed-auth metadata. This does not establish that application login is broken or absent; a legacy/external route remains possible. |

## Provider security model

[Vercel Config and Secret documentation](https://vercel.com/docs/environment-variables/sensitive-environment-variables), inspected November 5: Config is readable by members with access; Secret is write-only after saving; legacy Sensitive entries remain Secret. `encrypted` therefore does not mean a value is hidden from authorized configuration readers. Secret classification does not prevent deployed code with that credential from using it. Vercel documents separate production Secret values as an optional team policy; its current setting was not returned by available team metadata and remains unverified.

The exact internal detection rule for `securityIssues: ["readable-secret"]` was not established by the documentation lookup. Observed flags are consistent with credential-like Config classification; do not claim the classifier has verified actual secret contents or public exposure. No breach conclusion is supported. Review owner, project roles, tokens, legacy integrations, deployment bypasses and repository/deployment write privileges before claiming an exhaustive reader list. [Access role documentation](https://vercel.com/docs/rbac/access-roles).

## Repository safeguards in this change

- Next configuration validates environment isolation before building/serving. Production and ordinary local work retain current behavior; explicit recovery rehearsals set `WGOS_ENVIRONMENT=recovery`.
- Configured nonproduction environments must match an exact reviewed tuple of target, Git branch, Neon endpoint ID, database path, full auth base URL and trusted origin. Pooled and direct forms of the production endpoint are rejected. The reviewed route list starts empty because auth and actual routing have not been independently established.
- Nonproduction Blob, SignWell, Stripe and production cron/discovery credentials block startup/build. Storage stays disabled until a separate store and credential design is reviewed. This intentionally blocks the currently shared Blob configuration.
- Unconfigured UI builds are permitted only without DB/auth or the listed capability credentials. This does not prove their runtime has no other external integration; review new integrations when added.
- Synthetic offline regression tests cover production endpoint reuse, route mismatch, missing configuration, outbound credentials, custom targets and recovery. CI requires no secrets or dependency installation.
- This review branch alone disables automatic Vercel Git deployment using [documented branch configuration](https://vercel.com/docs/project-configuration/git-configuration). Other branches retain their existing deployment rules. No production merge or deployment is part of this change.

Limits: this guard is a release safeguard, not an authorization boundary against repository writers. It cannot revoke credentials in existing deployments, sanitize a cloned database, certify resource ownership or prove authenticated recovery. Anyone who can replace code/config can bypass it. Enforce review through protected branches/required checks after separately authorizing provider settings. New production endpoint IDs must update the deny list before use.

## Proposed live change set — explicit approval required

1. Restrict the existing Blob entry to production and store it as Secret through the supported provider flow. Check which applications/projects use the store first. The `feature/brand-first-command` source imports `@vercel/blob` in `app/api/admin/inventory/upload/route.ts`; preview/development uploads will stop on new deployments until separate stores and credentials exist. No Blob consumer was found on the inspected default branch; other store consumers remain unenumerated. Do not rotate merely to clear a warning. Existing deployments may retain the old token; scope edits alone do not revoke that access.
2. Verify production and preview DB destinations inside an authorized execution boundary, emitting endpoint/branch IDs only. Do not print, persist or return connection strings. Review DB role grants and production data copied to previews. Use schema-only or verified sanitized test data for ordinary previews; recovery clones need protection equivalent to production.
3. Reconcile the auth URL with the actual provider; inspect trusted origins, session/cookie scope, reset callbacks and identity-store IDs without customer records. Provision isolated auth only after compatibility/cost approval; do not migrate working production identity automatically. The current proxy defaults its trusted origin to `https://wgos.vercel.app`, so isolated auth also requires an explicit preview/recovery trusted origin.
4. Prepare isolated DB/auth/storage resources and synthetic fixtures, then add the verified non-secret route tuple to `config/environment-isolation.json`. Reject production sessions in preview/recovery and vice versa; exercise login, logout, reset routing, scoped record access and storage writes using synthetic identities only. Keep email, signatures, billing, webhooks and scheduled jobs disabled. Account creation is deferred until the identity destination is verified.
5. Review custom-domain protection/bypasses and effective grants; enable separate-production-secret policy if supported and appropriate after inspecting all impacted projects. Do not remove the sole owner or change permissions based on the incomplete access-group result.

## Deployment dependencies, validation and rollback

Before merge: resolve review comments; pass offline regression and TypeScript/build checks; obtain approval for the provider change set. Before any nonproduction deployment: remove shared capability credentials from that scope, verify routes and data handling, configure isolated trusted origins, approve the route tuple and verify protection. Overrides of the default Vercel build command still load Next configuration; entirely custom deployment paths must run the validator explicitly. Already-running deployments are unaffected by this repository proposal.

For each approved provider edit, capture metadata-only IDs, types, targets, branch bindings and time; preserve previous values only in an owner-controlled secret manager, never in this repository. Coordinate redeployment for affected services, then test production login and existing storage integrations with an approved synthetic account. Verify old previews cannot retain access. If credential invalidation is necessary, coordinate rotation with all consumers; rollback cannot resurrect a revoked token, so use a newly issued credential and redeploy instead. Resource creation/deletion and associated costs require separate approval.

Repository rollback: revert this PR and rebuild the previously approved commit only after confirming it will not reintroduce unsafe preview access. Prefer disabling the affected preview over bypassing the guard. Provider rollback: restore approved scope/type/routing metadata and securely restore an unrevoked credential if appropriate, redeploy affected consumers, repeat smoke checks; do not grant production capabilities back to previews as an automatic rollback.

Recovery certification remains blocked until an independently verified isolated restore, timed RPO/RTO, authenticated application checks, entity-boundary tests and cleanup evidence are complete. No current live route, credential reader enumeration, or successful application failover is certified by this review.

## Local validation

Seven synthetic regression tests passed. A full `npm run build` passed, including TypeScript and static-page generation, without provider credentials. A separate Next build with a synthetic shared Blob token was rejected before application compilation and did not echo the marker. `git diff --check` passed. These checks validate the repository safeguard, not deployed application isolation.

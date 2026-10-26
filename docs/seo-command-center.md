# WGOS SEO Command Center — implementation contract
Phase 1: Owner/admin-only read-only foundation at /admin/seo. No live Google or CRM integrations are implied.
Next: verify domain ownership and map Search Console properties to business IDs. Implement Google OAuth with minimal read-only scopes, server-side encrypted credentials, per-entity authorization and audited refresh/revocation. Do not store secrets in source control.
Ingest Search Console daily query/page/device metrics with source timestamps; GA4 landing-page and key-event metrics; WGOS qualified inquiry, booking and realized revenue events. Respect differing attribution models, consent and reporting delays. Never add revenue to a query solely from temporal correlation.
Use Neon for business mappings, connection states, daily aggregates, provenance, error logs and sync cursors. Apply tenant-aware access policies.
Technical auditing: sitemap, robots, canonical, metadata, structured data, mobile Core Web Vitals and booking funnel checks. Fixes require preview, test, approval and controlled deployment.
Do not silently publish pages, modify production, or represent unverified metrics as facts.

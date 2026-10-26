# Private SEO deployment security gate
- The SEO UI is guarded server-side by requireAdmin, not by obscurity.
- The SEO API returns 401 to unauthenticated requests and 403 to non-admin users; no data is returned before authorization.
- All private SEO responses must use Cache-Control: private, no-store and X-Robots-Tag: noindex, nofollow, noarchive.
- No public site should contain links, metadata, browser-side credentials, or script references revealing WGOS integrations.
- Public sites communicate only with independently authenticated, narrowly scoped server endpoints. Do not expose shared API secrets in NEXT_PUBLIC variables.
- Verify domain-to-business ownership before data ingestion; use per-business access controls in Neon.
- Before production: test unauthenticated, member, admin and owner access; review headers, cache, logs and deployment protection.
- No guarantee of total infrastructure undiscoverability; privacy is enforced by access control.

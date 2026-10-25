# Autonomous Website Audit — Pilot Specification

Status: proposed implementation; not deployed.

## Target
- Control plane: WGOS (Next.js, Neon)
- First audited property: studio2016-site (Next.js App Router)
- Preserve existing public brand domains and WGOS authority over intake, proposals and payments.

## Read-only pilot
1. Obtain approved target URLs from an explicit per-brand allowlist.
2. Fetch public pages with bounded concurrency, timeout, user agent and robots-aware crawling.
3. Check HTTP response, title, description, canonical, robots directives, sitemap, structured data, broken internal links, and image alt text.
4. Capture browser screenshots for desktop and mobile with Playwright in a restricted sandbox.
5. Run accessibility checks and flag manual-review findings separately.
6. Store evidence and a deterministic report with run ID, URL, timestamp, tool version, severity, and reproducible steps.
7. Propose fixes on a separate branch through draft pull requests; do not merge or deploy.

## Safety and governance
- Never crawl authenticated client pages or submit live booking forms in this pilot.
- No access to production secrets inside browser/sandbox tasks.
- No arbitrary URL input without SSRF-safe allowlisting and DNS/IP checks.
- Require human approval for production deployments, purchases, credential changes and destructive actions.
- Record immutable audit events; apply per-brand authorization and retention policies.
- Limit execution time, tokens, requests, and monetary spend; permit cancel/retry/resume.
- Avoid claiming search rankings or conversions improved without measured evidence.

## Initial acceptance test
- Audit the Studio2016 homepage and /start-a-project in read-only mode.
- Produce an evidence-backed findings report with desktop and mobile screenshots.
- Generate one proposed fix in a draft PR, verified by independent build and browser tests.
- Demonstrate rejection and cancellation paths; leave production unchanged.

## Follow-up
Evaluate Workflow SDK, Vercel Sandbox/Drives and AI Gateway for cost and capability. These are candidate dependencies, not provisioned components.

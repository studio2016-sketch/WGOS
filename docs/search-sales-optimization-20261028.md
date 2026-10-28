# Search and sales implementation — October 28, 2026

## Evidence and baseline

Inspected GitHub source, Vercel project/domain inventories, public HTTP responses and the live Neon schema. Public checks: Studio2016, Jermaine Williams, Charmin Greene, Charmin & Jermaine and Bass One returned 200 with working robots and sitemap endpoints. Bass One's sitemap and structured data used its Vercel address and its homepage had no canonical. Sound Legacy's public domain returned 503. Dionne's Boutique and CG Enterprises return noindex and intentionally block crawling for prelaunch review; those controls are preserved. TradeOS is an internal application, and no public site for Williams Strategic Partners was verified.

Neon read-only baseline, rolling 28 days at execution: website inquiries were Charmin Greene 93, Charmin & Jermaine 33, Studio2016 65 and Sound Legacy 2 (193 total). None carried the inspected source/referrer fields; none were marked WON. The query joining PAID Stripe payment records through same-brand proposals and website opportunities returned no rows. This does not prove zero real-world sales, and inquiries may include testing or spam. Search traffic and sales impact cannot be inferred from these observations.

GSC Wizard refused reads with subscription_required. No Google, Bing or GA4 performance was available through that connection. No subscription was purchased. Native WGOS search-provider ingestion remains unverified.

## Implemented changes

- WGOS authenticated Search & Sales workspace, linked from Marketing. Uses existing role/membership-scoped brand references; queries only authorized brand IDs, and every payment joins an opportunity within the same brand. An unavailable database read is shown as unavailable, not zero.
- Separates visitor-reported inquiry attribution, won opportunities and linked collected payments. Currency is kept separate. Payment counts are receipts, not unique customers or sales. Does not infer net revenue, refunds, live/test mode, profit or conversion rates. Future payment reconciliation is required.
- Deterministic search-source classification includes Google, Bing, DuckDuckGo, Yahoo, Brave, Ecosia, Startpage, Yandex and Baidu. Paid/email/social UTM media override a search referrer. Matching rejects lookalike search domains; private URLs and URL query strings are stripped from normalized landing paths.
- Public growth telemetry refuses SALE, INQUIRY and LIST_SIGNUP events. Only the server can establish these business outcomes. Public telemetry has zero value and validates campaign/brand relationships. Existing historical telemetry is not retroactively certified.
- Session-scoped first-touch capture for five public sites and Sound Legacy's prepared source; external referrer origins and landing paths survive navigation. Restricted storage is optional; forms still work. Inquiry routing is fixed to the server's brand for the artist proxies.
- Bass One canonical, metadata base, structured data and sitemap now use www.bassonebasses.com. Adds collection to the sitemap, excludes the placeholder listening room until demonstrations exist, and removes synthetic last-modified dates. No product availability, reviews or offers were fabricated.
- Fixes pre-existing parse errors in three static homepages' private-workspace scripts (missing separator and invalid quotation in the accept button). Parsing is verified; live signatures/contract acceptance are not executed or certified by this task.
- WGOS gets noindex metadata and robots disallow because it is the private management plane. Public brand sites retain their identities and URLs.
- Five public sites get per-host IndexNow proof files. WGOS's allowlisted notification CLI defaults to dry run, checks deployed ownership, rejects private/query URLs and refuses noindex or blocked sites. Receiving HTTP 200/202 establishes submission receipt only, not crawling, indexing, rankings or sales. No automatic schedule is claimed.

## Validation

All four Next.js builds and TypeScript checks pass: WGOS, Bass One, Jermaine Williams and Studio2016. Node checks cover search classification, deceptive host rejection, private path/query stripping, separate currencies/brands, rejection of public business-outcome events, original source preservation through navigation, storage denial and private-path exclusion. All inline scripts parse across Charmin Greene, Charmin & Jermaine and Sound Legacy. No live customer inquiries, payments, signatures or emails were created for testing.

Production/preview verification and release state must be recorded separately; a successful local build is not an operational sales workflow.

## Remaining dependencies and business priorities

1. Restore Sound Legacy's public-domain availability and confirm its intended host before changing DNS or submitting it to search.
2. Complete launch reviews for Dionne's Boutique and CG Enterprises; enable indexing only with verified content, inquiry/checkout delivery and applicable policies. Inventory, pricing, shipping, availability and returns must be true before Merchant Center or product structured data.
3. Connect verified Google Search Console, Bing Webmaster Tools and analytics sources through approved provider access. GSC Wizard access currently needs an active plan/trial; a subscription is not the only possible future integration path.
4. Verify authorized browser-to-WGOS inquiry delivery for each brand, then proposal, agreement and actual payment linkage. Test brand isolation with authorized identities. Reconcile refunds, mode, currency and repeated receipts before calculating ROI, collected net revenue or profit.
5. Use query/landing-page evidence to prioritize purchase-intent service pages and content. Existing artist and Studio2016 landing pages should be measured before duplicating them. Improve offers, proof, examples, mobile form usability and follow-up based on observed conversion losses.
6. Verify eligible Google Business Profile, Bing Places and Apple Business Connect listings against real business facts. No unverified addresses, reviews, ratings or geographic claims are published here.
7. Cross-browser Chrome and Safari interaction testing and real-user performance measurements remain to be completed. Browser privacy can limit attribution; unknown must remain unknown. Browser choice is distinct from the search engine used.

References: https://developers.google.com/search/docs/fundamentals/seo-starter-guide ; https://www.indexnow.org/documentation ; https://duckduckgo.com/duckduckgo-help-pages/results/sources ; https://www.apple.com/business/connect/

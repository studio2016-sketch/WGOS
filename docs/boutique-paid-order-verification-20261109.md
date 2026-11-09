# Boutique paid-order verification — November 9, 2026

Checkout is not ready to launch. Verification combines current source, deployment
metadata, read-only production probes, and isolated/synthetic tests. No genuine
payment or complete live payment-to-inventory transaction was performed.

## Current deployments and configuration

| Component | Observed state |
| --- | --- |
| Boutique production | Vercel READY, commit `89ce8a26548af4de96a63815ea148a6f1cd52451` |
| WGOS production | Vercel READY, commit `222bbf6ba3f3b5579c266b9a0d24ea52b42c8a12` |
| Boutique checkout status | Stripe connected; checkout disabled; webhook and order-sync secret configured; fulfillment false; settings connected; shipping/tax not configured |
| Stripe identity | Boutique connector account matches both repositories' pinned account identity |
| Stripe webhook | Enabled, live, correct boutique webhook URL; completed, async succeeded, async failed, expired events selected; API version `2026-09-30.endive` |
| Stripe Tax | Settings active; no active tax registrations returned; the app requires an active US registration |
| WGOS inventory | SHADOW, cutover false, reconciliation NOT_STARTED; 69 products, all awaiting count and condition review; 0 sellable |
| Production stock/orders | 100 recorded units, 0 reserved, 0 paid orders; boutique event receipt table empty |
| WGOS commerce preferences | Version 0, empty settings |

Source references: boutique `src/lib/stripe-account.ts`, `stripe-webhook.ts`,
`stripe-orders.ts`, `checkout-settings.ts`, and checkout/webhook routes; WGOS
`app/api/retail/stripe-order/route.ts`, `database/migrations/retail-orders.sql`,
`lib/inventory.ts`, and `app/admin/inventory/page.tsx`.

## Integration contract

- Boutique validates its API key's account using Stripe's account endpoint,
  retrieves the canonical session and paginated expanded product lines, and
  requires a live, paid, USD session with boutique source metadata.
- Product metadata `product_id` maps to WGOS `DIONNES_CATALOG:<id>`. Repeated
  mapped lines aggregate; unmapped lines use `unmatched:<line-id>` and remain
  visible for review. This is source/fixture validation, not an audit of real
  Checkout-generated product objects, since no genuine orders exist.
- Both sides use the same `BOUTIQUE_ORDER_SYNC_SECRET` environment key. WGOS
  compares bearer credentials with timing-safe equality. The live settings
  probe successfully crosses this authenticated connection. Secret values were
  neither retrieved nor printed. This does not prove live paid-order delivery.
- Receiver invokes `wgos.record_boutique_order(jsonb)` with canonical identity,
  total, items, customer contact, and collected shipping details. The deployed
  database function was inspected and matches the merged implementation.
- The transaction deduplicates account/session, checks replay consistency, locks
  products and stock in stable order, and deducts the complete order once or
  persists REVIEW with no partial deduction. Existing reserved units remain
  protected. A REVIEW replay stays REVIEW; redelivery does not reprocess it.
- Webhook receipts become PROCESSED only after durable acknowledgment. Failures
  return HTTP 500 and retain a PENDING receipt for Stripe redelivery. Concurrent
  receipt processing may call WGOS more than once; database deduplication is the
  correctness boundary. Concurrent-load behavior was not experimentally tested.

## Reproduced defects and proposed corrections

1. WGOS may return SHIPPED for a duplicate existing order, but the boutique
   rejected it. The boutique proposal accepts a shipped duplicate with stock
   applied, and rejects malformed/contradictory acknowledgments.
2. WGOS accepted missing US state, unsupported country, and whitespace-only
   required delivery fields as READY. The new function migration retains these
   orders in REVIEW without deduction.
3. Generic product availability controls can independently set sellable. The
   order function did not independently block DAMAGED/HOLD/UNKNOWN conditions.
   The new function migration requires review for those conditions even when
   sellable is true.

These changes are proposals only. The replacement SQL function was applied to
the isolated QA branch, never the production database. It does not backfill or
reclassify existing orders. No production environment flags were changed.

## Verification performed

| Check | Evidence and limit |
| --- | --- |
| Signatures, account/source/environment rejection | Existing 13 signature tests using SDK-generated fixture signatures pass |
| Canonical mapping, repeated/unmatched lines | Boutique processor tests with fake Stripe pass |
| Auth, request/ack contract, outages, lost acknowledgment, pending/processed receipts | In-process test loads both real routes and real processor with fake Stripe and DB adapters; no HTTP network or real database execution |
| Duplicate order, one SALE movement, changed replay rejection | Real PostgreSQL function tested on isolated QA branch with synthetic products |
| Reservations and insufficient available stock | Synthetic on-hand 5 / reserved 2; paid sale reduces on-hand once and leaves reservation intact; excess available-stock requests go to REVIEW |
| Unmatched mixed order | REVIEW persisted with reason; known line remains untouched |
| Unapproved inventory, missing delivery, unsuitable condition | REVIEW persisted without stock consumption |
| Review visibility | Test confirms persisted REVIEW/reason; source shows brand-scoped manager-only queue and delivery/item details; signed-in browser rendering not tested |
| Fixture cleanup | Subtransaction tests assert order count and stock totals unchanged after rollback; QA products and orders do not persist |
| Type checks | TypeScript no-emit checks pass in both repositories |

Tests: WGOS `tests/retail-order-safety.sql` and updated `tests/retail-orders.sql`.
Run SQL only on an isolated QA database. Boutique `tests/stripe-orders.cjs`,
`tests/stripe-webhook.cjs`, `tests/checkout-settings.cjs`, and
`WGOS_SOURCE=/absolute/path/to/WGOS node tests/paid-order-delivery.cjs`.
The cross-repository test needs both source checkouts plus boutique dependencies.

The QA database branch is `br-autumn-term-b5dg1ygz`, created exclusively for this
audit with a five-minute compute suspend interval. Only that branch received the
proposed replacement function. No application deployment points at this branch.

## Launch requirements still unmet

1. Physically count and review all intended products; approve conditions, prices,
   and sellability. Reconcile and explicitly authorize inventory cutover.
2. Connect checkout to current inventory before payment. It currently uses the
   saved storefront catalog's quantities/conditions and does not reserve stock
   in WGOS when a session is created. Post-payment locking protects the database
   but can still leave a paying buyer with an unfulfillable REVIEW order. Session
   expiry/failure handlers do not release checkout reservations because none are
   currently created. No claim of a working pre-payment reservation flow is made.
3. Approve shipping price, supported destinations, delivery estimates, product
   tax classifications, and tax behavior. Complete applicable tax registrations
   and verify the application's tax prerequisites; no tax settings were changed.
4. Establish packaging, carrier/label/tracking, contact/returns handling, and an
   approved workflow for reviewing paid exceptions. Current queue displays the
   latest 50 orders; no pagination or review resolution/stock retry/ship action
   was found. A displayed READY status is not proof of operational readiness.
5. Monitor pending webhook receipts and define replay/reconciliation after
   Stripe's retries. The current implementation relies on Stripe redelivery;
   no independent receipt worker or operational alerting was verified.
6. Verify signed-in queue rendering and a separate Stripe test/sandbox checkout
   end to end, including session expiry and competing baskets. Current ingestion
   explicitly accepts live sessions only, so test-mode credentials must not be
   substituted into production. Test-mode support needs an isolated configuration.
7. Inspect preview data isolation before any preview tests. Boutique DATABASE_URL
   metadata includes production/preview/development scope; secret-free preview
   does not itself establish database isolation. No preview data writes were run.
8. After all launch gates are satisfied, obtain explicit approval for production
   checkout enablement and any genuine payment verification.

## Exact proposed production correction (not executed)

Review and merge the boutique acknowledgment PR (which may trigger its normal
production auto-deploy), and review/merge the WGOS safety migration PR. Apply
only `database/migrations/retail-order-delivery-safety.sql` to WGOS production
after approval. It replaces one function, performs no data backfill or stock
adjustment, and strengthens eligibility of future deliveries. Keep checkout and
fulfillment flags disabled; do not change inventory approval, quantities,
shipping/tax preferences, Stripe configuration, or fulfillment states.

Production deployment and SQL execution require explicit owner approval. A
genuine charge requires separate explicit approval after launch prerequisites.

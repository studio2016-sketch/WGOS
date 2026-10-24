# Dionne's Boutique — inventory cutover staging
This branch is intentionally non-production and does not override the storefront.

## Included
- Entity-scoped SKU and barcode fields; reorder policy and supplier/PO structures.
- Reservation, fulfillment, cancellation, return stock-state logic.
- Count variance and review/approval schema; image issue queue.
- Deterministic comparison utility for legacy vs WGOS catalog snapshots.

## Integration work required before release
1. Review existing Neon schema, auth, entity ownership, and add tested row-level security policies.
2. Migrate catalog, real stock quantities, supplier information and verified product image assets.
3. Wire Stripe/storefront order events using verified signatures, durable idempotency keys,
   database row locks, atomic reservations and transactional movement/audit entries.
4. Distinguish payment failure, partial fulfillment, refund, restockable return and damaged return.
5. Create authorized inventory UI for receiving, count approval, supplier ordering and image review.
6. Compare both systems: SKU/barcode, price/currency, variants, tax/shipping behavior,
   inventory, reservations, images, active state and order lifecycle.
7. Test concurrency, replayed events, oversell prevention, partial returns, entity isolation,
   webhook retries and rollback. Reconcile open orders before changing write ownership.
8. Cut over only after owner approval and a passing signed comparison report.

No live migration, stock writes, storefront routing changes, or deployment performed.

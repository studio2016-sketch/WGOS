# Storefront integration contract (staging only)

All incoming events must be authenticated server-side, signature-verified against the raw request body, mapped to the correct entity and product variant, and persisted with unique provider event identifiers. Never accept an entity ID from an unauthenticated browser.

## Event lifecycle
1. Checkout begins: atomically reserve available units for an order and record a durable event receipt.
2. Payment succeeds: fulfill the held reservation once, decrementing on-hand stock.
3. Payment fails / order expires: release held stock without reducing on-hand.
4. Refund: do not automatically restock; require proof of a fulfilled order and a restockable received return.
5. Partial fulfillment, partial cancellation, exchanges, damaged returns and split shipments require line-level reservation quantities and their own event history before enabling them.
6. Any missing variant, mismatched quantity, or invalid transition must fail closed and create an operator exception.

## Required validation
- Multi-line orders and idempotency across webhook retries.
- Two simultaneous checkouts for the final unit.
- Timeout and out-of-order payment events.
- Entity isolation, permission enforcement and SQL function privileges.
- Catalog/price/quantity/image parity and reconciliation of outstanding orders.
- Supplier receiving, physical stock counts, barcode uniqueness and rollback rehearsal.

The SQL functions in 002_order_transactions.sql are a staging baseline, not a complete checkout integration. They are not deployed. Do not cut over until line-level event handling, return authorization, tenant RLS and live reconciliation are verified.

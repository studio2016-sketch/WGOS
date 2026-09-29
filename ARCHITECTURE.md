# WGOS Architecture
WGOS.app is the private management control plane, never the default customer-facing brand.

## Tenant rule
Every external workflow resolves Brand Context before rendering or sending. Brand Context controls public domain, visual identity, sender identity, legal entity, pricing, contract language, payment destination, document templates and permissions. A Studio2016 client remains on studio2016.com; a Charmin & Jermaine client remains on charminjermaine.com.

## Canonical identity
People and Organizations are global records with many-to-many brand relationships. Opportunities, proposals, contracts, projects, tasks, payments and production records are brand-scoped. This prevents duplicate contacts without cross-brand leakage.

## Authorization
Users receive explicit brand memberships. Global owners aggregate authorized brands. Brand staff only receive records for memberships granted to them. Authorization must be server-side.

## Integrations
Google Workspace: email, calendar, Drive/Docs. GitHub: source. Vercel: runtime. Postgres: operational source of truth. Specialized providers: eSignature/payment/accounting. ChatGPT: conversational command layer over authorized WGOS actions.

## Database
The existing Neon production database and its `wgos` schema are the operational system of record. Applied production migrations are source-controlled under `database/migrations/` as each consolidated module is moved into this repository.

`database/schema.sql` is an early bootstrap/reference model only and MUST NOT be applied over production. It will be retired once the full migration history has been consolidated from the superseded Global-Proposal-System repository.

## Repository rule
`studio2016-sketch/WGOS` is the only active application repository for WGOS.app. `Global-Proposal-System` is retained only as a migration/reference source; no new product functionality should be added there.
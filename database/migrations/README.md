# WGOS Migration Manifest

## Production sequence

Run the following files once, in numerical order, after validating them on a temporary Neon branch:

`019-council-governance-primitives.sql` through `028-production-advancing.sql`.

Every file in that range is additive or idempotent and extends the canonical `wgos` schema.

## Archived file

`029-reconciled-commissioning.sql` is intentionally excluded. It was an earlier reconciliation draft that overlaps the canonical sequence and references obsolete schema identifiers such as `contacts` and `agreements`. It must not be executed by a migration runner.

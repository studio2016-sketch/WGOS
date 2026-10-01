# WGOS Migration Manifest

## Live production schema

The dedicated WGOS production project uses the reconciled model in `029-reconciled-commissioning.sql`, including `contacts`, `agreements`, and `payments`. The live application queries this model.

## Superseded migration family

Files `019` through `028` model an earlier `people`, `contracts`, and `payment_events` shape. They must not be applied to the reconciled production project, whether individually or as a batch.

## Future releases

Add a new numerically ordered migration that extends the reconciled live schema. First test it on a temporary Neon branch, compare the schema to production, and obtain explicit approval before applying it to production.

# WGOS trunk-and-branch navigation standard

## Core contract
- Portfolio root selects a business. Selected business opens its own trunk.
- A trunk contains only actionable exceptions, the most frequent business-specific tasks, and a compact trustworthy snapshot.
- Each task opens a dedicated subject route. Do not append another subject's controls below the clicked content, and do not force users to scroll through unrelated panels.
- Each subject route has a clear title, brand context, Back to Business link, primary action, and task-specific information only.
- Keep the brand filter in every link and enforce authorization on the server. A query parameter is never authorization.
- Advanced administration, diagnostics, setup, and historical analytics belong in dedicated routes, not the business trunk.
- A status card must open its actual resolution surface, not a generic dashboard.
- Keep font sizes and touch targets accessible on phones.

## Current implementation
- Selected-brand /admin now renders only its focused OwnerDashboard and a small advanced navigation gateway.
- Portfolio /admin retains existing long-form administrative content for compatibility pending decomposition.
- Dionne's Boutique inventory has its own /admin/boutique?brand=... subject route.
- Other existing routes (/admin/operations, /admin/communications, /admin/calendar, etc.) remain functional but need their own subject-only layout audit.
- Do not claim all branches are complete until each route has been reviewed and tested.

## Verification gates
1. TypeScript compile, Next build and route navigation.
2. Owner and scoped-user brand isolation.
3. Every primary button lands at a dedicated relevant subject.
4. No unrelated modules visible on a branch.
5. Return-to-trunk navigation, mobile typography, focus handling.
6. No production cutover without approval and verified end-to-end behavior.

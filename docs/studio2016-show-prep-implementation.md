# Studio2016 Show Prep

## User workflow

Show Prep is a Studio2016 workspace feature for creating and managing a production plan per show. Each show has editable event details, an editable checklist and schedule, assignable deliverables, due dates, statuses, dependencies, and notes. It reuses WGOS production event and task records as the operational source of truth.

## First release scope

- Add a Studio2016 > Show Prep entry in the authenticated workspace.
- Create a show with artist, event date, venue/room, talent buyer, tour contacts, doors, curfew, and timezone.
- Generate the standard Production Manager deliverables from the approved 46-task checklist.
- Let authorized users edit, add, remove, assign, reorder, and update deliverables.
- Keep show schedule items and advancing checkpoints linked to the production event.
- Show status counts, overdue work, blockers, and upcoming due dates.
- Keep all reads and writes brand-scoped and server-authorized.

## Data mapping

- `wgos.production_events`: show identity, venue, event timing, timezone, status.
- `wgos.advancing_checkpoints`: dated advancing deliverables and ownership.
- `wgos.run_of_show_items`: day-of schedule entries and owners.
- `wgos.projects` and `wgos.tasks`: team-level assignment, dependencies, status, comments, and audit history.

## Acceptance criteria

1. A Studio2016 member can create a show and generate its starter checklist once.
2. Each deliverable can be edited, assigned to an active WGOS user, dated, status-tracked, and removed without changing the reusable template.
3. A user can add custom deliverables and run-of-show entries.
4. Show records and tasks are inaccessible outside the user's authorized brand memberships.
5. The show view remains usable on mobile and exposes blockers and upcoming deadlines clearly.
6. Existing project/task operations continue to work unchanged.

## Implementation sequence

1. Inspect current production-event and task APIs, access checks, and workspace navigation.
2. Add a versioned, editable Studio2016 show-prep template and seed the initial deliverables.
3. Add server actions/API routes for show creation, template generation, and edits using existing authorization and audit patterns.
4. Add the Studio2016 > Show Prep list and show detail screens.
5. Verify migrations, permissions, create/edit/assign flows, and deployment preview before merging.

The checklist workbook is a source for the initial task wording. It should not be embedded as the live data store.

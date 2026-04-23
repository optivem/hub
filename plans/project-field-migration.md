# Project 18 Field-Based Migration — Remaining Work

Follow-up work after migrating `optivem/hub` Project 18 from label-based to field-based structure. Fields `Course`, `Sandbox Project`, `Module`, `Status` exist and are populated on all 45 current items.

Processing rule: remove each item from this file as it is executed; delete the file when empty; delete the `plans/` directory when empty.
---

## Phase 2 — Auto-populate fields on new issues

- [ ] Verify on a test issue end-to-end: create issue from template → labels applied → fields populated (Course/Sandbox Project/Module set on the board item)

Composite action `.github/actions/set-project-fields` and the wiring in `auto-on-created.yml` are in place. This item is the live-fire verification.

APPPROVED

---

## Phase 3 — Deferred / optional

- [ ] Discussions setup on `optivem/hub`
  - Categories: `Pipeline Q&A` (Q&A), `ATDD Q&A` (Q&A), `Announcements` (Announcement), `General` (Open-ended)
  - Align with the parked hub-privacy plan (activates 2026-07-02 per memory)
- [ ] Parent issues per (sandbox × course) with modules as sub-issues
  - Originally proposed for per-project rollups
  - Probably unnecessary once the 8 per-project views exist — revisit only if native view filtering proves insufficient


WAIT

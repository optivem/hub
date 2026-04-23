# Project 18 Field-Based Migration — Remaining Work

Follow-up work after migrating `optivem/hub` Project 18 from label-based to field-based structure. Fields `Course`, `Sandbox Project`, `Module`, `Status` exist and are populated on all 45 current items.

Processing rule: remove each item from this file as it is executed; delete the file when empty; delete the `plans/` directory when empty.

---

## Phase 1 — UI cleanup (manual, Project 18 web UI)

- [ ] Reorder fields (Settings → Fields drag-and-drop): `Course → Sandbox Project → Module → Status`
- [ ] Create per-project views (one per student project, 8 total):
  - [ ] `BDOK` — filter `Sandbox Project = "BDOK — Budget OK"`, group by `Course`, sort by `Module` asc
  - [ ] `CCRS` — same pattern
  - [ ] `CTF` — same pattern
  - [ ] `ESLA` — same pattern
  - [ ] `FRS` — same pattern
  - [ ] `GHBL` — same pattern
  - [ ] `PWRH` — same pattern
  - [ ] `VGFN` — same pattern
- [ ] Optional: create coach-facing views
  - [ ] `Review Queue` — filter `Status = In Review`, sort by created asc
  - [ ] `Per-Course Progress` — table grouped by `Course`, then `Sandbox Project`, sort by `Module`

---

## Phase 2 — Auto-populate fields on new issues

- [ ] Verify on a test issue end-to-end: create issue from template → labels applied → fields populated (Course/Sandbox Project/Module set on the board item)

Composite action `.github/actions/set-project-fields` and the wiring in `auto-on-created.yml` are in place. This item is the live-fire verification.

---

## Phase 3 — Deferred / optional

- [ ] Prune old label families (destructive — requires explicit approval)
  - Labels to delete: `project-*` (8), `course-*` (2), `module-*` (~15)
  - Precondition: Phase 2 in place for at least one review cycle, no workflow still relying on these labels
  - Use `sync-labels.mjs --delete` (safety check: only deletes labels with zero issues attached)
- [ ] Discussions setup on `optivem/hub`
  - Categories: `Pipeline Q&A` (Q&A), `ATDD Q&A` (Q&A), `Announcements` (Announcement), `General` (Open-ended)
  - Align with the parked hub-privacy plan (activates 2026-07-02 per memory)
- [ ] Parent issues per (sandbox × course) with modules as sub-issues
  - Originally proposed for per-project rollups
  - Probably unnecessary once the 8 per-project views exist — revisit only if native view filtering proves insufficient


WAIT

---

## Reference — completed in this migration

For audit trail only (do not re-do):
- Renamed config: `statusOptionIds` (was `statusOptions`), `Sandbox Project` (was `Student Project`)
- Consolidated `config/board.json` as the single board config; removed `config/boards/`
- Created and then deleted temporary per-course boards (GitHub Projects 24 and 25)
- Added `Course`, `Sandbox Project`, `Module` fields to Project 18 with correct options
- Populated field values on all 45 existing items, Status copied from current values
- `sync-project.mjs` and `sync-project-items.mjs` added; both default to dry-run with explicit `--add` flag
- `sync-labels.mjs` split from single `--apply` into granular `--add` / `--update` / `--delete`
- `set-project-status` action updated to read option IDs from `config.board.statusOptionIds`
- Composite action `.github/actions/set-project-fields` created; wired into `auto-on-created.yml` to auto-populate Course, Sandbox Project, Module on new issues
- `scripts/load-config.{mjs,cjs}` switched to `node:fs`/`node:path` prefixes
- `scripts/sync.mjs` orchestrator extended with `project-schema` and `project-items` dry-run steps

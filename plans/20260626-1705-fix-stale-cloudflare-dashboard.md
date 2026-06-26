# 2026-06-26 17:05:00 UTC — Fix stale Cloudflare dashboard (issue #179 not showing on learn.optivem.com)

## TL;DR

**Why:** A student-created ticket (issue #179) is processed correctly by GitHub (on the project board with the right Course/Project/Module/Status) and the dashboard generator *would* render it — but the live site at https://learn.optivem.com/ has been frozen on a **2026-06-17** build for 9 days. The Cloudflare Pages build has been silently failing while `dashboard.yml` reports green, because it treats the deploy-hook's HTTP 200 ("webhook accepted") as if it meant "rebuild succeeded."
**End result:** The live dashboard is rebuilt and shows #179 (CCRS / module 07 / In Review), and `dashboard.yml` fails loudly whenever a CF rebuild does not actually land — so a stuck build can never again hide behind green checkmarks.

## Outcomes

What we get out of this:

- **learn.optivem.com is fresh again** — "Last updated" shows today's date and the page contains `issues/179` (CCRS row, module 07, "In Review").
- **Root cause in Cloudflare is identified and fixed** — the specific reason CF builds have failed since 2026-06-17 is read from the CF deployment log and corrected (most likely an expired `GITHUB_TOKEN` build-env var).
- **Silent staleness becomes impossible** — `.github/workflows/dashboard.yml` verifies the live site actually refreshed after pinging the deploy hook, and turns red if it didn't (consistent with the repo's fail-loud `check-*` convention).
- **(Optional) Proactive freshness monitoring** — a stuck CF build is surfaced by an alert within ~1 hour instead of by a student report days later.

## ▶ Next executable step (resume here)

**Step 1 is an operational action only the user can do (Cloudflare dashboard access).** Open Cloudflare Pages → the `learn.optivem.com` project → **Deployments**, and read the latest **failed** build's log to confirm the exact failure (expected: a `GraphQL errors: ... Bad credentials` line from `generate-dashboard.mjs`, indicating an expired `GITHUB_TOKEN`). This single read determines the fix in Step 2. No repo edits happen until Step 4 (the `dashboard.yml` hardening), which an executor *can* do without CF access.

## Steps

### Part A — Immediate fix: get the live dashboard rebuilt (operational, user does this in Cloudflare)

- [ ] **Step 1 — Read the failed build log.** Cloudflare Pages → `learn.optivem.com` project → Deployments. Open the most recent **failed** deployment and read its build log. Capture the exact error line. Expected causes, in likelihood order:
  - `GraphQL errors: ... Bad credentials` → expired/revoked `GITHUB_TOKEN` env var (most likely; aligns with the 2026-06-17 freeze).
  - `Required env vars: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO` → a build-env var got cleared.
  - Build-command / output-dir / branch error → CF project misconfiguration.
- [ ] **Step 2 — Apply the fix the log points to:**
  - If token: generate a fresh token with repo + project (read) scope, update the **`GITHUB_TOKEN`** environment variable in the CF Pages project settings.
  - Verify the other build settings are intact: **`GITHUB_OWNER=optivem`**, **`GITHUB_REPO=hub`**, build command runs **`node scripts/generate-dashboard.mjs`**, build output directory = **`docs`**.
  - Verify the CF Pages project is still **connected to the repo** and pointed at the correct **production branch** (not paused/disconnected).
- [ ] **Step 3 — Redeploy and confirm.** Trigger **Retry deployment** (or push/redeploy). Then verify the live site:
  ```bash
  curl -fsS https://learn.optivem.com/ | grep -o "issues/179" | head        # expect a match
  curl -fsS https://learn.optivem.com/ | grep -o -E "Last updated: [^<]*"   # expect today's date
  curl -fsS https://learn.optivem.com/version.json                          # expect a new version hash (not 7bceb34ad2de)
  ```

### Part B — Code hardening: make a stuck build fail loudly (the only repo change)

- [ ] **Step 4 — Add a post-ping verification step to `.github/workflows/dashboard.yml`.** After the existing "Ping Cloudflare Pages to rebuild" step, add a step that:
  1. Records the live `version.json` value **before** the ping (capture it at the top of the job, before POSTing the hook), then
  2. After the ping, **polls** `https://learn.optivem.com/version.json` for up to ~5 minutes (e.g. 10 tries × 30s) and **fails loudly** (`echo "::error::Cloudflare build did not refresh — dashboard is stale"; exit 1`) if the version never changes from the pre-ping value.
  - Recommended approach: **compare `version.json` before vs after** the ping. It needs no `GITHUB_TOKEN` in the workflow and directly proves a *new* build landed (a fresh "Last updated" timestamp alone can be ambiguous on no-op content). Keep the `curl -fsS` + explicit `::error::`/`exit 1` style already used at `dashboard.yml:44`.
  - Note: the scheduled safety-net runs (every 30 min) will frequently produce **no content change**, so a strict "version must change" check would false-fail on those. Handle this: only enforce the change-check on the **`workflow_run`** (ticket-lifecycle) and **`workflow_dispatch`** events — where a change is expected — and treat the scheduled runs as best-effort (ping only), OR have the check pass if the version is *either* changed *or* already matches a freshly-computed expected hash. **Decide in Open questions.**

### Part C — Optional follow-up (lower priority)

- [ ] **Step 5 — (Optional) Freshness monitor.** Add a lightweight scheduled check (new workflow, or extend the existing `schedule` trigger) that fetches `https://learn.optivem.com/` and alerts (workflow failure / notification) if "Last updated" is older than ~1 hour. Catches a stuck CF build proactively rather than via a student report.

### Verification (plan-end)

- [ ] After Part A: `curl https://learn.optivem.com/` contains `issues/179` and a fresh "Last updated" date.
- [ ] After Part B: exercise the new step via `workflow_dispatch` — confirm it passes when the live build is fresh, and (by reasoning/simulation) fails when the live version doesn't move.

## Open questions

- **Step 4 event scoping:** Should the strict "version must change after ping" check run on **all** dashboard events, or only on `workflow_run` + `workflow_dispatch` (skipping the every-30-min `schedule` runs, which usually have nothing to change)? **Recommendation:** enforce only on `workflow_run` + `workflow_dispatch`; let scheduled runs ping-only. This avoids false reds on no-op refreshes while still catching ticket-lifecycle staleness immediately.
- **Step 5 inclusion:** Include the proactive monitor now, or defer until after Part A/B prove out? **Recommendation:** defer — Part B already converts the common case (a ticket event hitting a dead build) into a loud failure; the monitor is belt-and-suspenders.
- **Token longevity:** If the cause is an expired `GITHUB_TOKEN`, is the CF token a fine-grained PAT with an expiry that will recur? Consider a longer expiry or a calendar reminder to rotate. (Operational, not a repo change.)

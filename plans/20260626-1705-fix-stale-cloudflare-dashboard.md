# 2026-06-26 17:05:00 UTC — Fix stale Cloudflare dashboard (issue #179 not showing on learn.optivem.com)

## TL;DR

**Why:** A student-created ticket (issue #179) is processed correctly by GitHub (on the project board with the right Course/Project/Module/Status) and the dashboard generator *would* render it — but the live site at https://learn.optivem.com/ has been frozen on a **2026-06-17** build for 9 days. The Cloudflare Pages build has been silently failing while `dashboard.yml` reports green, because it treats the deploy-hook's HTTP 200 ("webhook accepted") as if it meant "rebuild succeeded."
**End result:** The live dashboard is rebuilt and shows #179 (CCRS / module 07 / In Review); a GitHub Actions job runs the same generator on a schedule so this class of failure is caught **early, on GitHub** (red run + email) instead of late in Cloudflare's hidden logs; and `dashboard.yml` additionally fails loudly whenever a CF rebuild does not actually land — so a stuck build can never again hide behind green checkmarks.

## Outcomes

What we get out of this:

- **learn.optivem.com is fresh again** — "Last updated" shows today's date and the page contains `issues/179` (CCRS row, module 07, "In Review").
- **Root cause in Cloudflare is identified and fixed** — the specific reason CF builds have failed since 2026-06-17 is read from the CF deployment log and corrected (most likely an expired `GITHUB_TOKEN` build-env var).
- **Early detection on GitHub, not late detection on Cloudflare** — a GitHub Actions job runs the *same* generator build command on a schedule, so a bad token / GraphQL break / config error turns a GitHub run **red within the hour** at the source — instead of silently failing in Cloudflare's hidden logs until a student notices.
- **Silent staleness becomes impossible** — `.github/workflows/dashboard.yml` also verifies the live site actually refreshed after pinging the deploy hook, catching Cloudflare-only failures (turns red if it didn't), consistent with the repo's fail-loud `check-*` convention.
- **Readable failures** — `graphql()` reports `GitHub API 401: Bad credentials — check GITHUB_TOKEN` instead of a cryptic downstream `TypeError`.

## ▶ Next executable step (resume here)

**Step 1 is an operational action only the user can do (Cloudflare dashboard access).** Open Cloudflare Pages → the `learn.optivem.com` project → **Deployments**, and read the latest **failed** build's log to confirm the exact failure (expected: a `GraphQL errors: ... Bad credentials` line from `generate-dashboard.mjs`, indicating an expired `GITHUB_TOKEN`). This single read determines the fix in Step 2. No repo edits happen until Step 4 (the `dashboard.yml` hardening), which an executor *can* do without CF access.

## Steps

### Part A — Immediate fix: get the live dashboard rebuilt (operational, user does this in Cloudflare)

- [x] **Step 1 — Read the failed build log. ✅ DONE — cause CONFIRMED.** The 2026-06-26 17:34 CF build log shows:
  ```
  Executing user command: node scripts/generate-dashboard.mjs
  Fetching issues...
  TypeError: Cannot read properties of undefined (reading 'repository')
      at fetchAllIssues (generate-dashboard.mjs:237:23)
  Failed: build command exited with code: 1
  ```
  This is the **expired/invalid `GITHUB_TOKEN`** signature: GitHub returns HTTP 401 `{"message":"Bad credentials"}` (no `errors` key), so `graphql()` skips its `json.errors` guard, returns `undefined`, and crashes at `generate-dashboard.mjs:237` (`data.repository.issues`). The env vars and build command are otherwise fine (the command ran and reached the API call) — **the only fix needed is to refresh the token.**
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

### Part B — Early detection on GitHub (so we never again find out late via Cloudflare or a student)

The reason this stayed hidden for 9 days: **the generator only ever runs on Cloudflare**, where a crash is invisible to the GitHub-side workflows — `dashboard.yml` just POSTs a deploy hook and trusts the HTTP 200. Two complementary GitHub-side checks fix that. **B1 is the primary early-warning** (catches the failure at the source, on a schedule, before any student sees it); **B2 is the backstop** (catches Cloudflare-specific failures B1 can't see).

- [ ] **Step 4 (B1) — Generator smoke test as a GitHub Actions job (PRIMARY early detection).** Add a job/workflow that actually runs **`node scripts/generate-dashboard.mjs`** in GitHub Actions — the *same build command Cloudflare runs* — on a `schedule` (e.g. hourly) + on push to the production branch + `workflow_dispatch`. If the token is bad, the GraphQL call fails, the config is broken, or the script throws (exactly the `generate-dashboard.mjs:237` crash we just saw), the **GitHub run goes red and emails you within the hour** — at the source, independent of Cloudflare.
  - **Token nuance (important):** to catch *this specific* failure (the Cloudflare build token expiring), the smoke test must exercise the **same credential Cloudflare uses**. Store that token as a GitHub Actions secret (e.g. `DASHBOARD_BUILD_TOKEN`) and use the *same* PAT value in both the CF build env and this secret. Then when it expires, B1 goes red on its next scheduled run — early warning for the exact thing that just happened. (Using the default `GITHUB_TOKEN` or `PROJECT_TOKEN` would catch code/GraphQL/config breakage but **not** a CF-token expiry, since it's a different credential.)
  - The smoke test only needs to *run* the generator (it writes `docs/index.html` + `docs/version.json` into the runner's workspace and exits 0 on success); it does **not** commit or deploy anything. A non-zero exit = red run = notification.

- [ ] **Step 5 (B2) — Post-ping live verification in `.github/workflows/dashboard.yml` (backstop).** After the existing "Ping Cloudflare Pages to rebuild" step, add a step that:
  1. Records the live `version.json` value **before** the ping (capture it at the top of the job, before POSTing the hook), then
  2. After the ping, **polls** `https://learn.optivem.com/version.json` for up to ~5 minutes (e.g. 10 tries × 30s) and **fails loudly** (`echo "::error::Cloudflare build did not refresh — dashboard is stale"; exit 1`) if the version never changes from the pre-ping value.
  - Why B2 in addition to B1: B1 proves *the code/token can build*; B2 proves *Cloudflare actually rebuilt and published*. B2 catches CF-only failures B1 is blind to — CF project paused/disconnected, CF's own token wrong, wrong production branch.
  - Recommended approach: **compare `version.json` before vs after** the ping (needs no `GITHUB_TOKEN` in the workflow; directly proves a *new* build landed). Keep the `curl -fsS` + explicit `::error::`/`exit 1` style already at `dashboard.yml:44`.
  - Note: the scheduled safety-net runs (every 30 min) usually produce **no content change**, so a strict "version must change" check would false-fail on those. Enforce the change-check only on **`workflow_run`** (ticket-lifecycle) + **`workflow_dispatch`** events; let scheduled runs ping-only. **Decide in Open questions.**

- [ ] **Step 6 (B3) — Make `graphql()` fail with a readable message (`generate-dashboard.mjs:170-185`).** Today a 401 produces the cryptic `Cannot read properties of undefined (reading 'repository')` 60 lines downstream. Add an explicit guard: check `res.ok` (and `json.data` presence) and on failure `console.error` the HTTP status + `json.message` (e.g. `"GitHub API 401: Bad credentials — check GITHUB_TOKEN"`) then `process.exit(1)`. This makes B1's red run (and any future CF log) say *exactly* what's wrong in one line, instead of a misleading TypeError.

### Part C — Optional follow-up (lower priority)

- [ ] **Step 7 — (Optional) Freshness monitor.** Add a lightweight scheduled check (new workflow, or extend the existing `schedule` trigger) that fetches `https://learn.optivem.com/` and alerts if "Last updated" is older than ~1 hour. Largely subsumed by B1+B2 — keep only if you want a third, output-only tripwire.

### Verification (plan-end)

- [ ] After Part A: `curl https://learn.optivem.com/` contains `issues/179` and a fresh "Last updated" date.
- [ ] After Part B: trigger the B1 smoke-test job via `workflow_dispatch` — confirm it passes with a valid token and goes **red** with a bad/empty token (proves early detection works). Then exercise B2 via `workflow_dispatch` — passes when the live build is fresh, fails when the live version doesn't move.

## Open questions

- **Step 4 event scoping:** Should the strict "version must change after ping" check run on **all** dashboard events, or only on `workflow_run` + `workflow_dispatch` (skipping the every-30-min `schedule` runs, which usually have nothing to change)? **Recommendation:** enforce only on `workflow_run` + `workflow_dispatch`; let scheduled runs ping-only. This avoids false reds on no-op refreshes while still catching ticket-lifecycle staleness immediately.
- **Step 5 inclusion:** Include the proactive monitor now, or defer until after Part A/B prove out? **Recommendation:** defer — Part B already converts the common case (a ticket event hitting a dead build) into a loud failure; the monitor is belt-and-suspenders.
- **Token longevity:** If the cause is an expired `GITHUB_TOKEN`, is the CF token a fine-grained PAT with an expiry that will recur? Consider a longer expiry or a calendar reminder to rotate. (Operational, not a repo change.)

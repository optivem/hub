# SonarCloud Setup (Code Analysis)

This guide covers setting up SonarCloud static code analysis for public GitHub repositories. After completing this, the Commit Stage will include automated code analysis with coverage reporting.

All steps use the command line except where noted as (UI).

## Prerequisites

- A public GitHub repository with a working Commit Stage workflow (see [Commit Stage](05-commit-stage.md))
- `gh` CLI installed and authenticated
- `curl` available

## 1. Create a SonarCloud Account and Token (UI — one time only)

These are the only steps that require the browser:

1. Go to [sonarcloud.io](https://sonarcloud.io), click **Log in**, and sign in with your **GitHub** account.
2. Go to **My Account** → **Security** → **Generate Tokens**, enter a name (e.g. `ci`), click **Generate**, and copy the token.

Set the token as an environment variable for the remaining steps:

```bash
export SONAR_TOKEN="<your-token>"
```

## 2. Import Your GitHub Organization (CLI)

```bash
SONAR_ORG="<your-github-org>"  # e.g. optivem

curl -s -u "${SONAR_TOKEN}:" \
  -X POST "https://sonarcloud.io/api/organizations/create" \
  -d "key=${SONAR_ORG}&name=${SONAR_ORG}"
```

If the organization already exists, you will get an error saying so — that is fine, move on.

## 3. Create the SonarCloud Project (CLI)

```bash
REPO_NAME="<your-repo>"  # e.g. greeter-java
SONAR_PROJECT="${SONAR_ORG}_${REPO_NAME}"

curl -s -u "${SONAR_TOKEN}:" \
  -X POST "https://sonarcloud.io/api/projects/create" \
  -d "organization=${SONAR_ORG}&project=${SONAR_PROJECT}&name=${REPO_NAME}"
```

Verify the project was created:

```bash
curl -s -u "${SONAR_TOKEN}:" \
  "https://sonarcloud.io/api/projects/search?organization=${SONAR_ORG}" | jq '.components[].key'
```

SonarCloud defaults to `master` as the main branch. If your repository uses `main`, rename it:

```bash
curl -s -u "${SONAR_TOKEN}:" \
  -X POST "https://sonarcloud.io/api/project_branches/rename" \
  -d "project=${SONAR_PROJECT}&name=main"
```

## 4. Add GitHub Secret (CLI)

The `SONAR_TOKEN` is the same for all repos in your organization — it is your personal token, not per-project.

**Option A — Per-repository secret:**

```bash
gh secret set SONAR_TOKEN --body "${SONAR_TOKEN}"
```

**Option B — Organization secret (recommended if you have multiple repos):**

If you set `SONAR_TOKEN` as an organization-level secret, it applies to all repos automatically — no need to repeat this step per repo.

```bash
gh secret set SONAR_TOKEN --org "${SONAR_ORG}" --visibility all --body "${SONAR_TOKEN}"
```

To restrict it to specific repos instead of all:

```bash
gh secret set SONAR_TOKEN --org "${SONAR_ORG}" --visibility selected --repos "repo1,repo2" --body "${SONAR_TOKEN}"
```

Verify:

```bash
gh secret list
```

## 5. SonarCloud Onboarding (informational)

When you open your new project on [sonarcloud.io](https://sonarcloud.io), SonarCloud will show an onboarding wizard with instructions for setting up the GitHub secret, build file, and CI workflow. **You can skip this** — the greeter templates already include the SonarCloud configuration in the build file (`build.gradle` / `package.json`) and the commit stage workflow. The onboarding will disappear automatically after the first successful analysis.

## 6. Verify

Commit and push, then check the workflow:

```bash
git add -A && git commit -m "Add SonarCloud code analysis" && git push
gh run watch
```

Once the workflow completes, verify the analysis appeared in SonarCloud:

```bash
curl -s -u "${SONAR_TOKEN}:" \
  "https://sonarcloud.io/api/measures/component?component=${SONAR_PROJECT}&metricKeys=bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density" | jq '.component.measures'
```

You should see metrics for: bugs, vulnerabilities, code smells, coverage, and duplicated lines.

## Troubleshooting

Check project exists:

```bash
curl -s -u "${SONAR_TOKEN}:" \
  "https://sonarcloud.io/api/projects/search?organization=${SONAR_ORG}" | jq '.components[].key'
```

Check analysis status:

```bash
curl -s -u "${SONAR_TOKEN}:" \
  "https://sonarcloud.io/api/ce/activity?component=${SONAR_PROJECT}" | jq '.tasks[0].status'
```

Common issues:
- **"Not authorized"** — Verify `SONAR_TOKEN` is correct (`gh secret list` to check it exists).
- **"Project not found"** — Verify the project key and organization match between your build config and SonarCloud.
- **No coverage data** — Ensure tests run and produce coverage reports before the sonar step.
- **Analysis not appearing** — SonarCloud free tier only analyzes public repositories. Check: `gh repo view --json visibility -q '.visibility'`

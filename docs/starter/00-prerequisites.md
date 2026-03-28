# Prerequisites

Before starting the onboarding, gather the following information and set up credentials.

## Project Information

1. **GitHub owner** — your GitHub username or organization name.
   - Check if it's a user or org (CLI):
     ```bash
     gh api users/<owner> --jq '.type'
     ```
2. **System domain** — the business domain for your project (e.g. Book Store, Flight Reservation, Task Planner).
   - Do NOT choose eShop (the instructor uses that as an example).
   - Avoid your company's actual domain for NDA compliance.
3. **System name** — a name for your system (e.g. ACME Shop, SkyBook).
4. **Repo name** — derived from system name by hyphenating and lowercasing (e.g. "ACME Shop" → `acme-shop`).
   - Check if it already exists (CLI):
     ```bash
     gh repo view <owner>/<repo> 2>&1
     ```
   - If it exists, append a random suffix (e.g. `acme-shop-7f3a`).
5. **Monolith language** — Java, .NET, TypeScript, or Other.
6. **System test language** — same as monolith, or different (common when dev and QA teams use different languages).
7. **Architecture** — Monolith or multi-component. If multi-component, decide on the components (e.g. frontend, backend).
8. **Repository strategy** — Mono-repo or multi-repo. Multi-repo only makes sense with multi-component.

## Credentials

### Docker Hub

1. Create a Docker Hub account at [hub.docker.com](https://hub.docker.com) if you don't have one (browser).
2. Create an access token at [Docker Hub Security Settings](https://hub.docker.com/settings/security) (browser).
3. Set credentials on your repository (CLI):
   ```bash
   gh variable set DOCKERHUB_USERNAME --body "<your-dockerhub-username>" --repo <owner>/<repo>
   gh secret set DOCKERHUB_TOKEN --body "<your-dockerhub-token>" --repo <owner>/<repo>
   ```

### SonarCloud

1. Create a SonarCloud token — see [SonarCloud Setup](02a-monolith-sonarcloud-setup.md) (browser).
2. Set the token on your repository (CLI):
   ```bash
   gh secret set SONAR_TOKEN --body "<your-sonar-token>" --repo <owner>/<repo>
   ```

### Verify Credentials (CLI)

```bash
gh variable list --repo <owner>/<repo> --json name --jq '.[].name' | grep DOCKERHUB_USERNAME
gh secret list --repo <owner>/<repo> --json name --jq '.[].name' | grep -E 'DOCKERHUB_TOKEN|SONAR_TOKEN'
```

## Checklist

1. Project information is decided
2. GitHub repository exists and is public
3. `DOCKERHUB_USERNAME` variable is set
4. `DOCKERHUB_TOKEN` secret is set
5. `SONAR_TOKEN` secret is set (can be deferred until SonarCloud Setup step)

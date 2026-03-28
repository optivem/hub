# Prerequisites

Before starting the onboarding, gather the following information and prepare credentials.

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

> **Note:** The credentials below will be set on your GitHub repository. You don't need the repository to exist yet — just have the credentials ready. You'll set them on the repository during [Setup](01-monolith-setup.md) after creating it.

### Docker Hub

1. Create a Docker Hub account at [hub.docker.com](https://hub.docker.com) if you don't have one (browser).
2. Create an access token at [Docker Hub Security Settings](https://hub.docker.com/settings/security) (browser).
3. Note your Docker Hub username and token — you'll set them on your repository in the Setup step.

### SonarCloud

1. Create a SonarCloud token — see [SonarCloud Setup](02a-monolith-sonarcloud-setup.md) (browser).
2. Note the token — you'll set it on your repository in the SonarCloud Setup step.

## Environment Variables (for Claude Code / Onboarding Tester)

If you are using the onboarding tester agent, set the following environment variables on your machine **before** launching your IDE or Claude Code — they must be present in the shell environment so the agent can read them at runtime.

| Variable | Value |
|---|---|
| `GITHUB_SANDBOX_TESTER_TOKEN` | A GitHub personal access token with `repo` scope |
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | Your Docker Hub access token |
| `SONAR_TOKEN` | Your SonarCloud token (can be deferred until SonarCloud Setup step) |

How to set them depends on your OS:

- **Windows** — add them as User environment variables via System Settings > Environment Variables, or in PowerShell:
  ```powershell
  [Environment]::SetEnvironmentVariable("DOCKERHUB_USERNAME", "your-username", "User")
  [Environment]::SetEnvironmentVariable("DOCKERHUB_TOKEN", "dckr_pat_...", "User")
  [Environment]::SetEnvironmentVariable("GITHUB_SANDBOX_TESTER_TOKEN", "ghp_...", "User")
  ```
- **macOS / Linux** — add `export` lines to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):
  ```bash
  export DOCKERHUB_USERNAME="your-username"
  export DOCKERHUB_TOKEN="dckr_pat_..."
  export GITHUB_SANDBOX_TESTER_TOKEN="ghp_..."
  ```

After setting them, **restart any open terminals, IDEs, and CLI tools** — running processes do not pick up new environment variables automatically.

## Checklist

1. Project information is decided
2. Docker Hub account and access token are ready
3. SonarCloud token is ready (can be deferred until SonarCloud Setup step)
4. Environment variables are set and IDE has been restarted (if using onboarding tester)

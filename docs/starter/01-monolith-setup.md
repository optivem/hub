# Setup

## Starter Templates

- [Greeter - Java](https://github.com/optivem/greeter-java)
- [Greeter - .NET](https://github.com/optivem/greeter-dotnet)
- [Greeter - TypeScript](https://github.com/optivem/greeter-typescript)

## Usage

1. Clone the template based on your chosen language (CLI):
   ```bash
   gh repo clone optivem/greeter-{language} /tmp/greeter-template
   ```
   - *If your chosen language is not on the list, no worries, just choose any of the templates because the Pipeline Architecture is the same — you can do language replacement afterwards.*
2. Copy the following from the template into your repository (CLI):
   ```bash
   cp -r /tmp/greeter-template/.github .
   cp -r /tmp/greeter-template/monolith .
   cp -r /tmp/greeter-template/system-test .
   cp -f /tmp/greeter-template/VERSION . 2>/dev/null || true
   ```
   - Also copy the top part of `README.md` (the status badges section) from the template.
3. Replace `optivem/greeter-{language}` with `<your_repo_owner>/<your_repo_name>` in the whole project (CLI):
   ```bash
   grep -rl "optivem/greeter-{language}" . --include="*.yml" --include="*.yaml" --include="*.md" --include="*.gradle" --include="*.gradle.kts" | xargs sed -i 's|optivem/greeter-{language}|<owner>/<repo>|g'
   ```
   This covers `.yml` files (including `docker-compose.yml` and workflow files), `.md` files, and `.gradle`/`.gradle.kts` files (including SonarCloud config):
   - In the README file, so that the status badges point to your workflows (not the template workflows)
   - In `system-test/docker-compose.yml`, to reference your Docker Image (not the template image)
4. In the Docker Compose file, ensure that everything is lowercase in the image url.
5. Commit and push (CLI):
   ```bash
   git add -A && git commit -m "Apply pipeline template" && git push
   ```
6. Add credentials and variables to your repository (CLI) — skip if already done in [Prerequisites](00-prerequisites.md):
   ```bash
   gh variable set DOCKERHUB_USERNAME --body "<your-dockerhub-username>" --repo <owner>/<repo>
   gh secret set DOCKERHUB_TOKEN --body "<your-dockerhub-token>" --repo <owner>/<repo>
   gh variable set SYSTEM_URL --body "http://localhost:8080" --repo <owner>/<repo>
   ```
7. Trigger `commit-stage-monolith` and wait for it to finish (CLI):
   ```bash
   gh workflow run commit-stage-monolith.yml --repo <owner>/<repo>
   gh run watch --repo <owner>/<repo>
   ```
8. Trigger `acceptance-stage` and wait for it to finish (CLI):
   ```bash
   gh workflow run acceptance-stage.yml --repo <owner>/<repo>
   gh run watch --repo <owner>/<repo>
   ```

## Customization

*Skip this section if your chosen language already matches the template you applied.*

### Monolith Language

1. Open the `monolith` folder.
2. **If your target language is Java, .NET, or TypeScript:**
   - Find the target language template in [Starter Templates](#starter-templates) above.
   - Delete the `monolith` folder in your repo.
   - Copy from the target template: `monolith` folder, `system-test/docker-compose.yml` (overwrite), `.github/workflows/commit-stage-monolith.yml` (overwrite).
   - In `system-test/docker-compose.yml`, replace `optivem/greeter-{lang}` with `<your_repo_owner>/<your_repo_name>` for the image field.
3. **If your target language is something else:**
   - Rewrite the `monolith` folder in your target language (or use an LLM to assist).
   - Update the `monolith` README.md with build and run instructions.
   - Build and run locally. Note the port (e.g. 2500).
   - In `system-test/docker-compose.yml`, set ports to `8080:YOUR_PORT`.
   - In `.github/workflows/commit-stage-monolith.yml`, replace the steps between 'Checkout Repository' and 'Publish Docker Image' with your language's setup and build commands.
4. Commit and push (CLI):
   ```bash
   git add -A && git commit -m "Customize monolith language" && git push
   ```
5. Verify that `commit-stage-monolith` passes (CLI):
   ```bash
   gh run watch --repo <owner>/<repo>
   ```
6. Trigger `acceptance-stage` and verify it passes (CLI):
   ```bash
   gh workflow run acceptance-stage.yml --repo <owner>/<repo>
   gh run watch --repo <owner>/<repo>
   ```

### System Test Language

*Skip this section if your developers and QA automation engineers use the same language.*

1. Open the `system-test` folder.
2. **If your target language is Java, .NET, or TypeScript:**
   - Find the target template in [Starter Templates](#starter-templates) above.
   - Delete everything in `system-test` **except** `docker-compose.yml`.
   - Copy from the target template: `system-test` folder (except `docker-compose.yml`), `.github/actions/deploy-docker-images/action.yml`, `.github/workflows/acceptance-stage.yml`.
3. **If your target language is something else:**
   - Rewrite the `system-test` folder in your target language. Check Playwright language support; switch to Selenium if needed.
   - Update the `system-test` README.md with instructions to run tests.
   - In `.github/actions/deploy-docker-images/action.yml`, replace the steps after 'Wait for Application to be Ready' with your language setup and smoke test commands.
   - In `.github/workflows/acceptance-stage.yml`, replace the steps after 'Deploy System' with your language setup and E2E test commands.
4. Commit and push (CLI):
   ```bash
   git add -A && git commit -m "Customize system test language" && git push
   ```
5. Trigger `acceptance-stage` with Force run and verify it passes (CLI):
   ```bash
   gh workflow run acceptance-stage.yml --repo <owner>/<repo> -f force_run=true
   gh run watch --repo <owner>/<repo>
   ```

> **Why different languages?** It is common for development teams and QA teams to use different languages. For background, see the multi-language template at [greeter-multi-lang](https://github.com/optivem/greeter-multi-lang).

## Namespace Replacement

1. Find template namespace references:
   - Java: `com.optivem.greeter`
   - .NET: `Optivem.Greeter`
   - TypeScript: `@optivem/greeter-system-test`
   - Also search for any other references like "accelerator" and "Accelerator"
   - For TypeScript, also update `author`, `license`, `description` in `package.json`
2. Replace all references with your corresponding namespace and info.
   - Also update the README title (e.g. "Greeter (Java)" → your system name and language).
3. Commit and push (CLI):
   ```bash
   git add -A && git commit -m "Replace template namespaces" && git push
   ```
4. Verify that `commit-stage-monolith` and `acceptance-stage` workflows still pass (CLI):
   ```bash
   gh run watch --repo <owner>/<repo>
   ```

## Checklist

1. Template has been applied to your repository
2. All references to the template repository name have been replaced with your own
3. Namespace customization is complete
4. Root README file contains correct links to GitHub Actions
5. Docker Compose file (in System Test) has the correct monolith image url
6. `commit-stage-monolith` and `acceptance-stage` workflows pass

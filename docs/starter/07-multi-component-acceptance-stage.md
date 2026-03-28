# Acceptance Stage - Multi Component

For a working example, see the [Greeter Multi Component](https://github.com/optivem/greeter-multi-comp) template.

## Update Image References

Open the file `acceptance-stage.yml`.

Find the word `monolith` inside `image-urls` — there's one line. Copy-paste that line so you have two lines. In the first line, replace `monolith` with `frontend`. In the second line, replace `monolith` with `backend`.

Commit and push (CLI):

```bash
git add -A && git commit -m "Update acceptance stage for multi-component" && git push
```

Trigger `acceptance-stage` (CLI):

```bash
gh workflow run acceptance-stage.yml --repo <owner>/<repo>
gh run watch --repo <owner>/<repo>
```

Verify that it is successful. Note the RC version (CLI):

```bash
gh release list --repo <owner>/<repo> --limit 5
```

## Checklist

1. Acceptance Stage finds latest artifacts for all components
2. All component artifacts deployed together
3. System RC version tags applied to all component artifacts
4. `acceptance-stage` workflow completes successfully

#!/usr/bin/env node

/**
 * Sync all hub data derived from the courses repo.
 * Runs the local sync scripts in order:
 *
 *   1. sync-course-structure.mjs  → config/courses/*.json (modules)
 *   2. sync-checklists.mjs        → checklists/{courseId}/{NN}.md
 *   3. sync-issue-template.mjs    → .github/ISSUE_TEMPLATE/review-request.yml
 *   4. sync-student-urls.mjs      → config/courses/*.json (url fields, from courses/generated/student-urls.json)
 *   5. sync-labels.mjs        (DRY-RUN) → label drift on GitHub vs config
 *   6. sync-project.mjs       (DRY-RUN) → project field schema drift
 *   7. sync-project-items.mjs (DRY-RUN) → project item drift (adds + field values)
 *
 * The last three steps are DRY-RUN inside this orchestrator because they
 * mutate GitHub remote state (not local files). To apply changes, run
 * the underlying script directly with the appropriate flag:
 *   node scripts/sync-labels.mjs --add | --update | --delete
 *   node scripts/sync-project.mjs --add
 *   node scripts/sync-project-items.mjs --add
 *
 * Student-view URL *scraping* lives in the courses repo
 * (`courses/tools/scrape-student-urls.ts`) because it needs Playwright
 * + interactive login. Run that script separately when URLs change; its
 * output is committed as `courses/generated/student-urls.json` and this
 * orchestrator applies it to the hub configs.
 *
 * The dashboard (docs/index.html) is built and deployed in CI by
 * .github/workflows/dashboard.yml — it is not regenerated here.
 *
 * Usage:
 *   node scripts/sync.mjs                         # run all steps
 *   node scripts/sync.mjs --only checklists       # run one step
 *   node scripts/sync.mjs --only structure,urls   # run multiple steps (comma-separated)
 *
 * Step names: structure, checklists, issue-template, urls, labels, project-schema, project-items
 */

import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const STEPS = [
  { key: "structure",      label: "Course structure",        file: "./sync-course-structure.mjs" },
  { key: "checklists",     label: "Review checklists",       file: "./sync-checklists.mjs" },
  { key: "issue-template", label: "Issue template",          file: "./sync-issue-template.mjs" },
  { key: "urls",           label: "Student URLs",            file: "./sync-student-urls.mjs" },
  { key: "labels",         label: "Labels (dry-run)",        file: "./sync-labels.mjs" },
  { key: "project-schema", label: "Project schema (dry-run)", file: "./sync-project.mjs" },
  { key: "project-items",  label: "Project items (dry-run)",  file: "./sync-project-items.mjs" },
];

function extractOnly() {
  // Strip --only <value> from process.argv so sub-scripts see a clean argv
  // (they read process.argv[2] as the courses-root override).
  const idx = process.argv.indexOf("--only");
  if (idx === -1) return null;
  const value = process.argv[idx + 1];
  if (!value) {
    console.error("--only requires a value (comma-separated step names)");
    process.exit(1);
  }
  process.argv.splice(idx, 2);
  const requested = value.split(",").map(s => s.trim()).filter(Boolean);
  const valid = new Set(STEPS.map(s => s.key));
  const unknown = requested.filter(s => !valid.has(s));
  if (unknown.length) {
    console.error(`Unknown step(s): ${unknown.join(", ")}. Valid: ${[...valid].join(", ")}`);
    process.exit(1);
  }
  return new Set(requested);
}

const only = extractOnly();
const selected = only ? STEPS.filter(s => only.has(s.key)) : STEPS;

// Orchestrator always runs mutating syncs in dry-run mode.
// (To apply schema changes, invoke sync-labels.mjs or sync-project.mjs directly
// with --add / --update / --delete as appropriate.)
// Strip these flags so sub-scripts that read argv[2] as courses-root don't misread them.
for (const flag of ["--apply", "--add", "--update", "--delete"]) {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1) process.argv.splice(idx, 1);
}

for (const step of selected) {
  console.log(`\n── ${step.label} ──`);
  await import(pathToFileURL(join(__dirname, step.file)).href);
}

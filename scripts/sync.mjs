#!/usr/bin/env node

/**
 * Sync all hub data derived from the courses repo.
 * Runs the local sync scripts in order:
 *
 *   1. sync-course-structure.mjs  → config/courses/*.json (modules + milestones)
 *   2. sync-checklists.mjs        → checklists/{courseId}/{NN}.md
 *   3. sync-issue-template.mjs    → .github/ISSUE_TEMPLATE/review-request.yml
 *   4. sync-student-urls.mjs      → config/courses/*.json (url fields, from courses/generated/student-urls.json)
 *   5. sync-labels.mjs (DRY-RUN)  → shows label drift on GitHub vs config (no apply)
 *
 * Label sync is DRY-RUN inside this orchestrator because it mutates
 * GitHub remote state (not local files). To apply label changes, run
 *   node scripts/sync-labels.mjs --apply
 * directly after reviewing the plan.
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
 * Step names: structure, checklists, issue-template, urls, labels
 */

import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const STEPS = [
  { key: "structure",      label: "Course structure",  file: "./sync-course-structure.mjs" },
  { key: "checklists",     label: "Review checklists", file: "./sync-checklists.mjs" },
  { key: "issue-template", label: "Issue template",    file: "./sync-issue-template.mjs" },
  { key: "urls",           label: "Student URLs",      file: "./sync-student-urls.mjs" },
  { key: "labels",         label: "Labels (dry-run)",  file: "./sync-labels.mjs" },
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

// Orchestrator always runs sync-labels in dry-run mode.
// (To apply label changes, invoke sync-labels.mjs directly with --apply.)
// Also strip so sub-scripts that read argv[2] as courses-root don't misread it.
{
  const idx = process.argv.indexOf("--apply");
  if (idx !== -1) process.argv.splice(idx, 1);
}

for (const step of selected) {
  console.log(`\n── ${step.label} ──`);
  await import(pathToFileURL(join(__dirname, step.file)).href);
}

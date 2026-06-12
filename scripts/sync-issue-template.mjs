#!/usr/bin/env node

/**
 * Sync per-course sandbox-review issue templates:
 * generates .github/ISSUE_TEMPLATE/<courseId>-sandbox-review.yml for each
 * course in config/courses/*.json.
 *
 * Each template includes:
 *   - Project dropdown (all projects from config/projects.json)
 *   - Course dropdown, pre-selected to this course's name (single option)
 *   - Module dropdown scoped to this course's modules only
 *   - Review Checklist markdown placeholder (auto-filled post-submission)
 *
 * Course is hardcoded per template so validate-issue reads it from the body
 * (### Course) without needing labels or file-name conventions.
 *
 * Source of truth: config/ JSON files.
 * Output:          .github/ISSUE_TEMPLATE/<courseId>-sandbox-review.yml
 *
 * Usage: node scripts/sync-issue-template.mjs
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./load-config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const config = loadConfig(ROOT);

// Sentinel first option + default: 0 forces the user to actively pick
// something other than this placeholder. validate-issue rejects the
// sentinel. Keep the exact strings in sync with SENTINEL_RE in
// .github/actions/validate-issue/action.yml.
const PROJECT_PLACEHOLDER = '        - "— Select a project —"';
const MODULE_PLACEHOLDER  = '        - "— Select a module —"';

const projectOptions = [
  PROJECT_PLACEHOLDER,
  ...[...config.projects]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(p => `        - ${p.key} — ${p.name}`),
].join("\n");

function shortName(courseName) {
  return courseName.split(" ")[0];
}

function renderTemplate(course) {
  const moduleOptions = [
    MODULE_PLACEHOLDER,
    ...course.modules.map(m => `        - ${m.number} - ${m.name}`),
  ].join("\n");

  const short = shortName(course.name);

  return `name: "${short} Sandbox Review"
description: "Submit your ${short} sandbox project for review"
body:
  - type: dropdown
    id: project
    attributes:
      label: Project
      description: Select your project.
      options:
${projectOptions}
      default: 0
    validations:
      required: true
  - type: dropdown
    id: course
    attributes:
      label: Course
      description: Course this submission is for.
      options:
        - ${course.name}
      default: 0
    validations:
      required: true
  - type: dropdown
    id: module
    attributes:
      label: Module
      description: Select the module you are submitting for review.
      options:
${moduleOptions}
      default: 0
    validations:
      required: true
  - type: markdown
    attributes:
      value: |
        ## Review Checklist
        *This section will be auto-generated after submission.*
`;
}

const outDir = join(ROOT, ".github", "ISSUE_TEMPLATE");
mkdirSync(outDir, { recursive: true });

for (const course of config.courses) {
  const outPath = join(outDir, `${course.id}-sandbox-review.yml`);
  writeFileSync(outPath, renderTemplate(course), "utf-8");
  console.log(`Wrote ${outPath}: ${course.modules.length} modules.`);
}

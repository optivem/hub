// Loads and validates a deployment's config/ for Optivem School.
//
// Mirrors optivem/hub's model: students, reviewers (teachers), projects, board, courses.
// Each deployment copies the *.example.json files to *.json (no ".example") and edits them;
// the real *.json are committed by the deployment (the template ships only the examples).
//
//   as a module:  import { loadConfig } from "./load-config.mjs"
//   as a CLI:      node scripts/load-config.mjs    (validates config/*.json + prints a summary)

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

function readJson(file) {
  if (!existsSync(file)) {
    const example = file.replace(/\.json$/, ".example.json");
    throw new Error(
      `Missing config file: ${file}\n` +
      `→ Copy ${example} to ${file} and fill it in for your deployment.`
    );
  }
  try {
    return JSON.parse(readFileSync(file, "utf-8"));
  } catch (e) {
    throw new Error(`Invalid JSON in ${file}: ${e.message}`);
  }
}

export function loadConfig(rootDir) {
  const configDir = join(rootDir, "config");

  const board = readJson(join(configDir, "board.json"));
  const reviewers = readJson(join(configDir, "reviewers.json"));
  const students = readJson(join(configDir, "students.json"));
  const projects = readJson(join(configDir, "projects.json"));

  const coursesDir = join(configDir, "courses");
  const courses = (existsSync(coursesDir) ? readdirSync(coursesDir) : [])
    .filter(f => f.endsWith(".json") && !f.endsWith(".example.json"))
    .sort()
    .map(f => readJson(join(coursesDir, f)));

  return {
    title: board.title,
    reviewers,
    board: board.board,
    statuses: board.statuses,
    students,
    projects,
    courses,
  };
}

// Validate the schema of an already-loaded config. Deployment data (students,
// reviewers, projects, courses, board) is never overwritten by `apply` — so the
// engine's job for data is to CHECK it conforms, not to copy it.
// Returns { errors, warnings }: errors are schema violations (fail); warnings are
// referential issues (unknown ids) that are usually mistakes but not fatal.
export function validateConfig(c) {
  const errors = [];
  const warnings = [];
  const isStr = (v) => typeof v === "string" && v.length > 0;
  const isArr = Array.isArray;

  for (const [list, label] of [[c.students, "students"], [c.reviewers, "reviewers"]]) {
    if (!isArr(list)) { errors.push(`${label}.json must be an array`); continue; }
    list.forEach((p, i) => {
      if (!isStr(p?.github)) errors.push(`${label}[${i}].github must be a non-empty string`);
      if (!isStr(p?.name)) errors.push(`${label}[${i}].name must be a non-empty string`);
    });
  }

  const projectKeys = new Set();
  if (!isArr(c.projects)) {
    errors.push("projects.json must be an array");
  } else {
    c.projects.forEach((p, i) => {
      if (!isStr(p?.key)) errors.push(`projects[${i}].key must be a non-empty string`);
      else projectKeys.add(p.key);
      if (!isStr(p?.name)) errors.push(`projects[${i}].name must be a non-empty string`);
      if (!isArr(p?.members)) errors.push(`projects[${i}].members must be an array`);
    });
  }

  if (!c.board || typeof c.board !== "object") errors.push("board.json: board object missing");
  else if (!isArr(c.board.courses)) errors.push("board.json: board.courses must be an array");
  if (!isArr(c.statuses) || c.statuses.length === 0) errors.push("board.json: statuses must be a non-empty array");

  const courseIds = new Set();
  (isArr(c.courses) ? c.courses : []).forEach((co, i) => {
    const id = co?.id ?? `#${i}`;
    if (!isStr(co?.id)) errors.push(`course[${i}].id must be a non-empty string`);
    else courseIds.add(co.id);
    if (!isStr(co?.name)) errors.push(`course ${id}: name must be a non-empty string`);
    if (!isArr(co?.modules)) {
      errors.push(`course ${id}: modules must be an array`);
    } else {
      co.modules.forEach((m, j) => {
        if (!isStr(m?.number)) errors.push(`course ${id} module[${j}].number must be a string`);
        if (!isStr(m?.name)) errors.push(`course ${id} module[${j}].name must be a string`);
      });
    }
    (co?.projectKeys || []).forEach((k) => {
      if (!projectKeys.has(k)) warnings.push(`course ${id}: projectKeys references unknown project "${k}"`);
    });
  });

  (c.board?.courses || []).forEach((id) => {
    if (!courseIds.has(id)) warnings.push(`board.courses references unknown course "${id}"`);
  });

  const known = new Set([
    ...(c.students || []).map((s) => s?.github),
    ...(c.reviewers || []).map((r) => r?.github),
  ].filter(Boolean));
  (c.projects || []).forEach((p) => {
    [p.lead, ...(p.members || [])].filter(Boolean).forEach((h) => {
      if (!known.has(h)) warnings.push(`project ${p.key}: "${h}" is not in students or reviewers`);
    });
  });

  return { errors, warnings };
}

// CLI: load + schema-validate + print a summary when run directly.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  try {
    const c = loadConfig(root);
    const { errors, warnings } = validateConfig(c);
    console.log(`✓ loaded ${c.title}`);
    console.log(`  students:  ${c.students.length}`);
    console.log(`  reviewers: ${c.reviewers.length}`);
    console.log(`  projects:  ${c.projects.length}`);
    console.log(`  courses:   ${c.courses.length} (${c.courses.map((x) => x.id).join(", ")})`);
    for (const w of warnings) console.log(`  ⚠ ${w}`);
    if (errors.length) {
      console.error(`\n✗ ${errors.length} schema error(s):`);
      for (const e of errors) console.error(`  - ${e}`);
      process.exit(1);
    }
    console.log(warnings.length ? `\nSchema OK (${warnings.length} warning(s)).` : "\nSchema OK.");
  } catch (e) {
    console.error(`✗ ${e.message}`);
    process.exit(1);
  }
}

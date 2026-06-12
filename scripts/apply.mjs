#!/usr/bin/env node

/**
 * Apply the Optivem School engine (the "reference" files) into a target repo.
 *
 * `optivem/school` is the canonical source of the engine. This copies the
 * reference files FROM this school checkout INTO <target-dir>:
 *   - scripts/            platform scripts
 *   - .github/actions/    composite actions
 *   - .github/workflows/  automation workflows
 *   - config/*.example.json + config/courses/*.example.json   config templates
 *
 * Idempotent: writes files that are missing or changed, leaves identical ones,
 * and NEVER touches deployment-owned data:
 *   - config/*.json (real config)        - .github/ISSUE_TEMPLATE/ (generated)
 *   - docs/ (generated dashboard)        - anything else in the target
 *
 * Works on a blank repo (install) or an existing one (update to the latest engine).
 *
 * Usage: node scripts/apply.mjs <target-repo-dir>
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const targetArg = process.argv[2];
if (!targetArg) {
  console.error("Usage: node scripts/apply.mjs <target-repo-dir>");
  process.exit(1);
}
const TARGET = resolve(targetArg);
if (TARGET === SOURCE) {
  console.error("Target must differ from the school source repo.");
  process.exit(1);
}

// Engine subtrees copied wholesale.
const REFERENCE_DIRS = ["scripts", ".github/actions", ".github/workflows"];
// Plus example config files (templates), never the real *.json.
const isExampleConfig = (rel) =>
  /^config\/([^/]+\/)?[^/]+\.example\.json$/.test(rel);

let created = 0, updated = 0, unchanged = 0;

function copyFile(rel) {
  const content = readFileSync(join(SOURCE, rel));
  const dest = join(TARGET, rel);
  if (existsSync(dest)) {
    if (readFileSync(dest).equals(content)) { unchanged++; return; }
    writeFileSync(dest, content); updated++; console.log(`  ~ ${rel}`); return;
  }
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, content); created++; console.log(`  + ${rel}`);
}

function walk(relDir) {
  const abs = join(SOURCE, relDir);
  if (!existsSync(abs)) return;
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    const rel = `${relDir}/${entry.name}`;
    if (entry.isDirectory()) walk(rel);
    else copyFile(rel);
  }
}

console.log(`Applying Optivem School engine\n  from ${SOURCE}\n  to   ${TARGET}\n`);

for (const d of REFERENCE_DIRS) walk(d);

const exampleConfigs = [
  ...readdirSync(join(SOURCE, "config")).map((f) => `config/${f}`),
  ...(existsSync(join(SOURCE, "config", "courses"))
    ? readdirSync(join(SOURCE, "config", "courses")).map((f) => `config/courses/${f}`)
    : []),
].filter(isExampleConfig);
for (const rel of exampleConfigs) copyFile(rel);

console.log(`\nDone: +${created} created, ~${updated} updated, ${unchanged} unchanged.`);
console.log("Deployment data (config/*.json, .github/ISSUE_TEMPLATE/, docs/) left untouched.");

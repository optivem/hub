#!/usr/bin/env node

/**
 * Orchestrate the local sync steps that regenerate derived files from config/.
 * Runs every step, or a subset with --only=<name>[,<name>...].
 *
 * Steps grow as the engine grows (issue templates today; checklists, board
 * field sync, dashboard to follow).
 *
 * Usage:
 *   node scripts/sync.mjs                  # run all steps
 *   node scripts/sync.mjs --only=issue-template
 */

import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const STEPS = [
  { name: "issue-template", script: "sync-issue-template.mjs" },
];

const onlyArg = process.argv.find(a => a.startsWith("--only="));
const only = onlyArg ? onlyArg.split("=")[1].split(",").map(s => s.trim()) : null;

for (const step of STEPS) {
  if (only && !only.includes(step.name)) continue;
  console.log(`\n→ ${step.name}`);
  const r = spawnSync(process.execPath, [join(ROOT, "scripts", step.script)], { stdio: "inherit" });
  if (r.status !== 0) {
    console.error(`✗ ${step.name} failed`);
    process.exit(r.status ?? 1);
  }
}

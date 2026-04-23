#!/usr/bin/env node

import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { loadConfig } from "./load-config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const args = new Set(process.argv.slice(2));
const ADD    = args.has("--add");    // allow creating missing labels
const UPDATE = args.has("--update"); // allow changing colors on existing labels
const DELETE = args.has("--delete"); // allow deleting orphaned labels

const config = loadConfig(ROOT);

// Label colors by type
const COLORS = {
  course: "5319e7",    // purple
  project: "0075ca",   // blue
  module: "e4e669",    // yellow
  closed: "d73a4a",    // red
};

// GitHub default labels — never delete, never recolor
const PROTECTED = new Set(config.labels.githubDefaults);

// Build expected labels from config.
// project-*/course-*/module-* are no longer used — Project 18 fields
// (Course, Sandbox Project, Module) carry that metadata.
const expected = new Map();

for (const reason of config.labels.closedReasons) {
  expected.set(`closed-${reason}`, COLORS.closed);
}

// Fetch existing labels (with colors)
const existing = new Map();
for (const l of JSON.parse(
  execSync("gh label list --limit 500 --json name,color", { encoding: "utf-8" })
)) {
  existing.set(l.name, l.color);
}

// Compute diff
const toCreate = [];
const toUpdate = [];
const toDelete = [];

for (const [name, color] of expected) {
  if (!existing.has(name)) {
    toCreate.push({ name, color });
  } else if (existing.get(name).toLowerCase() !== color.toLowerCase()) {
    toUpdate.push({ name, color, oldColor: existing.get(name) });
  }
}

for (const [name] of existing) {
  if (!expected.has(name) && !PROTECTED.has(name)) {
    toDelete.push(name);
  }
}

// Check issue usage on to-delete labels before deleting.
// Single gh call — build label -> count map from all issues at once.
const labelUsage = new Map();
const allIssues = JSON.parse(
  execSync("gh issue list --state all --limit 1000 --json labels", {
    encoding: "utf-8",
  })
);
for (const iss of allIssues) {
  for (const l of iss.labels) {
    labelUsage.set(l.name, (labelUsage.get(l.name) || 0) + 1);
  }
}
const issueCount = (label) => labelUsage.get(label) || 0;

// Print plan
const flags = [ADD && "ADD", UPDATE && "UPDATE", DELETE && "DELETE"].filter(Boolean);
const mode = flags.length === 0 ? "DRY-RUN" : flags.join(" + ");
console.log(`\n=== sync-labels (${mode}) ===\n`);

console.log(`Create (${toCreate.length})${ADD ? "" : " — skipped (pass --add to apply)"}:`);
for (const { name, color } of toCreate) {
  console.log(`  + ${name} (#${color})`);
}

console.log(`\nUpdate color (${toUpdate.length})${UPDATE ? "" : " — skipped (pass --update to apply)"}:`);
for (const { name, color, oldColor } of toUpdate) {
  console.log(`  ~ ${name}: #${oldColor} -> #${color}`);
}

console.log(`\nDelete (${toDelete.length})${DELETE ? "" : " — skipped (pass --delete to apply)"}:`);
const deleteSafe = [];
const deleteBlocked = [];
for (const name of toDelete) {
  const n = issueCount(name);
  if (n > 0) {
    deleteBlocked.push({ name, count: n });
    console.log(`  ! ${name} (SKIPPED — ${n} issue(s) attached)`);
  } else {
    deleteSafe.push(name);
    console.log(`  - ${name}`);
  }
}

console.log(
  `\nSummary: +${toCreate.length} create, ~${toUpdate.length} update, -${deleteSafe.length} delete, ${deleteBlocked.length} blocked\n`
);

if (flags.length === 0) {
  console.log("Dry-run only. Re-run with --add / --update / --delete to apply.\n");
  process.exit(0);
}

// Execute — throttle to avoid GitHub secondary rate limits (~80-100 writes/min).
// 750ms between mutations -> max ~80/min sustained.
const THROTTLE_MS = 750;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function ghWrite(cmd, label) {
  try {
    execSync(cmd, { stdio: "inherit" });
  } catch (err) {
    const msg = String(err.message || err);
    // Retry once on secondary rate limit
    if (msg.includes("secondary rate limit") || msg.includes("abuse")) {
      console.log(`  rate limited, backing off 60s then retrying: ${label}`);
      execSync("node -e \"setTimeout(()=>{},60000)\"");
      execSync(cmd, { stdio: "inherit" });
    } else {
      throw err;
    }
  }
}

const totalToRun =
  (ADD ? toCreate.length : 0) +
  (UPDATE ? toUpdate.length : 0) +
  (DELETE ? deleteSafe.length : 0);
let done = 0;

if (ADD) {
  for (const { name, color } of toCreate) {
    console.log(`[${++done}/${totalToRun}] Creating: ${name}`);
    ghWrite(`gh label create "${name}" --color "${color}" --force`, name);
    await sleep(THROTTLE_MS);
  }
}

if (UPDATE) {
  for (const { name, color } of toUpdate) {
    console.log(`[${++done}/${totalToRun}] Updating: ${name}`);
    ghWrite(`gh label edit "${name}" --color "${color}"`, name);
    await sleep(THROTTLE_MS);
  }
}

if (DELETE) {
  for (const name of deleteSafe) {
    console.log(`[${++done}/${totalToRun}] Deleting: ${name}`);
    ghWrite(`gh label delete "${name}" --yes`, name);
    await sleep(THROTTLE_MS);
  }
}

console.log("\nDone.\n");

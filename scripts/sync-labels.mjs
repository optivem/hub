#!/usr/bin/env node

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const config = JSON.parse(readFileSync(join(ROOT, "config.json"), "utf-8"));

// Label colors by type
const COLORS = {
  bootcamp: "5319e7",  // purple
  project: "0075ca",   // blue
  module: "e4e669",    // yellow
  task: "c5def5",      // light blue
};

// Build expected labels from config
const expected = new Map();

for (const b of config.bootcamps) {
  expected.set(`bootcamp-${b.id}`, COLORS.bootcamp);
}

for (const p of config.projects) {
  expected.set(`project-${p.key.toLowerCase()}`, COLORS.project);
}

const moduleNums = new Set();
const taskNums = new Set();
for (const b of config.bootcamps) {
  for (const m of b.modules) {
    moduleNums.add(m.number);
    for (const t of (m.tasks || [])) {
      taskNums.add(t.number);
    }
  }
}
for (const num of moduleNums) {
  expected.set(`module-${num}`, COLORS.module);
}
for (const num of taskNums) {
  expected.set(`task-${num}`, COLORS.task);
}

// Fetch existing labels
const existing = new Set(
  JSON.parse(
    execSync("gh label list --limit 500 --json name", { encoding: "utf-8" })
  ).map((l) => l.name)
);

// Create missing labels
let created = 0;
for (const [name, color] of expected) {
  if (!existing.has(name)) {
    console.log(`Creating label: ${name}`);
    execSync(
      `gh label create "${name}" --color "${color}" --force`,
      { encoding: "utf-8", stdio: "inherit" }
    );
    created++;
  }
}

if (created === 0) {
  console.log("All labels are in sync.");
} else {
  console.log(`Created ${created} label(s).`);
}

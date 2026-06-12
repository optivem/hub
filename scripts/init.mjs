#!/usr/bin/env node

/**
 * Onboard a new deployment: scaffold config/ from the shipped examples.
 *
 * Copies each config/*.example.json -> config/*.json (and every
 * config/courses/*.example.json -> the same name without ".example"),
 * but only when the target doesn't already exist — safe to re-run.
 *
 * The template repo ships only the *.example.json; a deployment owns and
 * commits the real *.json. After running, edit the *.json for your school
 * then run `npm run sync`.
 *
 * Usage: node scripts/init.mjs   (or: npm run init)
 */

import { readdirSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function copyIfMissing(srcRel, destRel) {
  const dest = join(ROOT, destRel);
  if (existsSync(dest)) {
    console.log(`• skip ${destRel} (already exists)`);
    return;
  }
  copyFileSync(join(ROOT, srcRel), dest);
  console.log(`✓ created ${destRel}`);
}

for (const name of ["students", "reviewers", "projects", "board"]) {
  copyIfMissing(`config/${name}.example.json`, `config/${name}.json`);
}

const coursesDir = join(ROOT, "config", "courses");
for (const f of readdirSync(coursesDir).filter(f => f.endsWith(".example.json"))) {
  copyIfMissing(`config/courses/${f}`, `config/courses/${f.replace(".example.json", ".json")}`);
}

console.log(
  "\nNext steps:\n" +
  "  1. Edit config/*.json for your school (students, reviewers, projects, courses).\n" +
  "  2. Create a GitHub Projects v2 board and fill config/board.json (see ONBOARDING.md).\n" +
  "  3. Run `npm run sync` to generate the issue templates.\n"
);

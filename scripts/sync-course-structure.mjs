#!/usr/bin/env node

/**
 * Sync course structure: scan sandbox-project.md files in each module
 * and update config/courses/*.json with module and milestone metadata
 * (number, label, name). Does NOT touch URLs.
 *
 * Milestones are extracted from "## Milestone N: Name" headings in
 * each module's sandbox-project.md file. Modules without a
 * sandbox-project.md are excluded from the config.
 *
 * Usage: node scripts/sync-course-structure.mjs [courses-root]
 *   courses-root defaults to ../courses (relative to sandbox repo root)
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const coursesRoot = resolve(process.argv[2] || join(ROOT, "..", "courses"));

const COURSES = [
  { id: "pipeline", configFile: "01-pipeline.json", coursePath: join(coursesRoot, "01-pipeline", "accelerator", "course") },
  { id: "atdd", configFile: "02-atdd.json", coursePath: join(coursesRoot, "02-atdd", "accelerator", "course") },
];

function readModuleTitle(moduleDir) {
  const indexPath = join(moduleDir, "_index.md");
  if (!existsSync(indexPath)) return null;
  const content = readFileSync(indexPath, "utf-8").trim();
  const match = content.match(/^#\s*\d+\.\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseMilestones(sandboxProjectPath) {
  const content = readFileSync(sandboxProjectPath, "utf-8");
  const regex = /^## Milestone (\d+):\s*(.+)$/gm;
  const milestones = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    const num = match[1].padStart(2, "0");
    const name = match[2].trim();
    milestones.push({
      number: num,
      label: `${num}-${slugify(name)}`,
      name,
    });
  }
  return milestones;
}

function scanModules(coursePath) {
  const dirs = readdirSync(coursePath)
    .filter(d => /^\d{2}-/.test(d) && !d.includes("DRAFT") && !d.includes("guide") && statSync(join(coursePath, d)).isDirectory())
    .sort();

  return dirs.map(dir => {
    const moduleDir = join(coursePath, dir);
    const name = readModuleTitle(moduleDir);
    if (!name) return null;

    // Find sandbox-project.md file
    const sandboxFile = readdirSync(moduleDir)
      .find(f => f.includes("sandbox-project") && f.endsWith(".md"));
    if (!sandboxFile) return null;

    const milestones = parseMilestones(join(moduleDir, sandboxFile));

    return {
      number: dir.slice(0, 2),
      label: dir,
      name,
      milestones,
    };
  }).filter(Boolean);
}

// Main
const configDir = join(ROOT, "config", "courses");

for (const { id: courseId, configFile, coursePath } of COURSES) {
  const configPath = join(configDir, configFile);

  if (!existsSync(configPath)) {
    console.log(`Skipping ${courseId}: no config file at ${configPath}`);
    continue;
  }
  if (!existsSync(coursePath)) {
    console.log(`Skipping ${courseId}: course path not found at ${coursePath}`);
    continue;
  }

  const course = JSON.parse(readFileSync(configPath, "utf-8"));
  const scanned = scanModules(coursePath);

  // Build lookup of existing data to preserve URLs and week values
  const existing = new Map();
  for (const m of course.modules || []) {
    const milestones = new Map();
    for (const t of m.milestones || []) {
      milestones.set(t.number, t);
    }
    existing.set(m.number, { ...m, _milestones: milestones });
  }

  course.modules = scanned.map(m => {
    const prev = existing.get(m.number) || {};
    const mod = { number: m.number, label: m.label, name: m.name, url: prev.url || "" };
    if (prev.week) mod.week = prev.week;

    const prevMilestones = prev._milestones || new Map();
    mod.milestones = m.milestones.map(t => {
      const pt = prevMilestones.get(t.number) || {};
      return { number: t.number, label: t.label, name: t.name, url: pt.url || "" };
    });

    return mod;
  });

  writeFileSync(configPath, JSON.stringify(course, null, 2) + "\n");

  const milestoneCount = course.modules.reduce((sum, m) => sum + m.milestones.length, 0);
  console.log(`${courseId}: ${course.modules.length} modules, ${milestoneCount} milestones`);
}

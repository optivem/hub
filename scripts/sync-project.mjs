#!/usr/bin/env node

/**
 * Onboard + reconcile the GitHub Projects v2 board (config/board.json).
 *
 * Idempotent (declarative — config is the source of truth):
 *   1. Board       — if board.id is missing/placeholder, CREATE it under board.owner,
 *                    then write id/number/url back to config/board.json.
 *   2. Fields      — reconcile single-select fields against config:
 *                      Sandbox Project (config.projects), Module (modules of board.courses),
 *                      Status (config.statuses), Course (only when board covers >1 course).
 *                    Creates missing fields/options; never deletes (extras kept + warned).
 *   3. Status IDs  — write the Status field id + per-status option ids back to board.json
 *                    (set-project-status needs them).
 *
 * Safety: dry-run by default; pass --add to create the board and apply field changes.
 *
 * Usage:
 *   node scripts/sync-project.mjs           # dry-run (shows what it would do)
 *   node scripts/sync-project.mjs --add     # create board if needed + apply
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./load-config.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BOARD_PATH = join(ROOT, "config", "board.json");
const ADD = process.argv.includes("--add");

const THROTTLE_MS = 750;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TOKEN = execSync("gh auth token", { encoding: "utf-8" }).trim();

async function gql(query, variables = {}) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "GraphQL-Features": "projects_next_graphql",
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(`GraphQL error: ${JSON.stringify(json.errors, null, 2)}`);
  return json.data;
}

// --- board.json read/write (raw, to preserve structure on writeback) -------
function readBoardFile() {
  return JSON.parse(readFileSync(BOARD_PATH, "utf-8"));
}
function writeBoardFile(obj) {
  writeFileSync(BOARD_PATH, JSON.stringify(obj, null, 2) + "\n", "utf-8");
}
const isPlaceholder = (id) => !id || /^PVT_replace/i.test(id);

// --- expected field schema (mirrors hub) -----------------------------------
const STATUS_COLORS = { "Open": "GRAY", "In Progress": "YELLOW", "In Review": "PURPLE", "Done": "GREEN" };

function coursesForBoard(config, board) {
  const ids = board.courses || [];
  return ids.map((id) => config.courses.find((c) => c.id === id)).filter(Boolean);
}

function expectedFieldsFor(config, board) {
  const courses = coursesForBoard(config, board);
  if (courses.length === 0) return null;
  const multiCourse = courses.length > 1;

  const fields = {};
  if (multiCourse) {
    fields["Course"] = courses.map((c) => ({ name: c.id.toUpperCase(), color: "PURPLE", description: c.name }));
  }
  fields["Sandbox Project"] = config.projects.map((p) => ({ name: `${p.key} — ${p.name}`, color: "BLUE", description: p.repo || "" }));
  fields["Module"] = courses.flatMap((c) => (c.modules || []).map((m) => ({
    name: `${m.number} - ${m.name}`, color: "YELLOW", description: multiCourse ? c.name : "",
  })));
  fields["Status"] = (config.statuses || []).map((s) => ({ name: s.name, color: STATUS_COLORS[s.name] || "GRAY", description: "" }));
  return fields;
}

// --- board create (idempotent) ---------------------------------------------
function ensureBoard(boardFile) {
  if (!isPlaceholder(boardFile.board.id)) {
    console.log(`board: exists (${boardFile.board.url || boardFile.board.id})`);
    return false;
  }
  const owner = boardFile.board.owner;
  if (!owner || owner === "your-org-or-username") {
    throw new Error("config/board.json: set board.owner (org or username) before creating a board.");
  }
  console.log(`+ board: would create "${boardFile.title}" under @${owner}`);
  if (!ADD) return false;
  const out = execSync(
    `gh project create --owner ${owner} --title ${JSON.stringify(boardFile.title)} --format json`,
    { encoding: "utf-8" }
  );
  const proj = JSON.parse(out);
  boardFile.board.id = proj.id;
  boardFile.board.number = proj.number;
  boardFile.board.url = proj.url;
  writeBoardFile(boardFile);
  console.log(`  ✓ created board #${proj.number}: ${proj.url}`);
  return true;
}

// --- field reconcile (mirrors hub) -----------------------------------------
async function fetchBoardFields(projectId) {
  const data = await gql(
    `query($projectId: ID!) {
       node(id: $projectId) { ... on ProjectV2 {
         title
         fields(first: 50) { nodes {
           ... on ProjectV2SingleSelectField { id name options { id name } }
           ... on ProjectV2FieldCommon { id name dataType }
         } }
       } }
     }`,
    { projectId }
  );
  const byName = new Map();
  for (const f of data.node.fields.nodes) if (f?.name) byName.set(f.name, f);
  return { title: data.node.title, byName };
}

function createField(projectId, name, options) {
  return gql(
    `mutation($projectId: ID!, $name: String!, $options: [ProjectV2SingleSelectFieldOptionInput!]!) {
       createProjectV2Field(input: { projectId: $projectId, dataType: SINGLE_SELECT, name: $name, singleSelectOptions: $options }) {
         projectV2Field { ... on ProjectV2SingleSelectField { id name options { id name } } }
       }
     }`,
    { projectId, name, options }
  );
}

function updateFieldOptions(fieldId, options) {
  return gql(
    `mutation($fieldId: ID!, $options: [ProjectV2SingleSelectFieldOptionInput!]!) {
       updateProjectV2Field(input: { fieldId: $fieldId, singleSelectOptions: $options }) {
         projectV2Field { ... on ProjectV2SingleSelectField { id name } }
       }
     }`,
    { fieldId, options }
  );
}

function diffOptions(actualField, expectedOptions) {
  const actualNames = new Set((actualField.options || []).map((o) => o.name));
  const toAdd = expectedOptions.filter((o) => !actualNames.has(o.name));
  const extra = (actualField.options || []).filter((o) => !expectedOptions.some((e) => e.name === o.name));
  return { toAdd, extra };
}

async function reconcileField(boardId, fieldName, expectedOptions, actualField) {
  if (!actualField) {
    console.log(`  + field: ${fieldName} (${expectedOptions.length} options)`);
    if (ADD) { await createField(boardId, fieldName, expectedOptions); await sleep(THROTTLE_MS); }
    return;
  }
  const { toAdd, extra } = diffOptions(actualField, expectedOptions);
  if (toAdd.length === 0 && extra.length === 0) { console.log(`  ok:    ${fieldName} (${expectedOptions.length} options)`); return; }
  if (toAdd.length > 0) {
    console.log(`  ~ field: ${fieldName} — add ${toAdd.length} option(s): ${toAdd.map((o) => o.name).join(", ")}`);
    if (ADD) {
      // updateProjectV2Field replaces the whole option list — merge existing (preserve) + new.
      const merged = [
        ...actualField.options.map((o) => ({ name: o.name, color: o.color || "GRAY", description: "" })),
        ...toAdd,
      ];
      await updateFieldOptions(actualField.id, merged);
      await sleep(THROTTLE_MS);
    }
  }
  if (extra.length > 0) console.log(`  ! field: ${fieldName} — ${extra.length} extra option(s) kept: ${extra.map((o) => o.name).join(", ")}`);
}

// --- write Status field id + option ids back to board.json -----------------
async function writeStatusIds(boardFile) {
  const { byName } = await fetchBoardFields(boardFile.board.id);
  const status = byName.get("Status");
  if (!status?.options) return;
  const optionIdByName = new Map(status.options.map((o) => [o.name, o.id]));
  const statusOptionIds = {};
  for (const s of boardFile.statuses || []) {
    const id = optionIdByName.get(s.name);
    if (id && s.key !== "OPEN") statusOptionIds[s.key] = id; // OPEN tracked for completeness; transitions use the others
    else if (id) statusOptionIds[s.key] = id;
  }
  boardFile.board.statusFieldId = status.id;
  boardFile.board.statusOptionIds = statusOptionIds;
  writeBoardFile(boardFile);
  console.log(`  ✓ wrote statusFieldId + ${Object.keys(statusOptionIds).length} status option id(s) to board.json`);
}

// --- main -------------------------------------------------------------------
const config = loadConfig(ROOT);
console.log(`=== sync-project (${ADD ? "ADD" : "DRY-RUN"}) ===`);

const boardFile = readBoardFile();
ensureBoard(boardFile);

if (isPlaceholder(boardFile.board.id)) {
  console.log("\nNo board yet — re-run with --add to create it, then reconcile fields.\n");
  process.exit(0);
}

const expected = expectedFieldsFor(config, boardFile.board);
if (!expected) { console.log(`SKIP: no courses resolved for board (board.courses=${JSON.stringify(boardFile.board.courses)})`); process.exit(1); }

const actual = await fetchBoardFields(boardFile.board.id);
console.log(`\n── ${actual.title} (${boardFile.board.url}) ──`);
for (const [fieldName, options] of Object.entries(expected)) {
  await reconcileField(boardFile.board.id, fieldName, options, actual.byName.get(fieldName));
}

if (ADD) await writeStatusIds(boardFile);

console.log(`\nDone${ADD ? "" : " (dry-run — re-run with --add to apply)"}.\n`);

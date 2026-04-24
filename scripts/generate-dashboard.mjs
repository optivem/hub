#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { loadConfig } from "./load-config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── Environment ──

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;

if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
  console.error("Required env vars: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO");
  process.exit(1);
}

// ── Config ──

const config = loadConfig(ROOT);
const boardId = config.board.id;

const nameMap = {};
for (const r of config.reviewers) nameMap[r.github.toLowerCase()] = r.name;
for (const s of config.students) nameMap[s.github.toLowerCase()] = s.name;

const projectMap = {};
for (const p of config.projects) projectMap[p.key.toUpperCase()] = p;

for (const course of config.courses) {
  course.projects = (course.projectKeys || [])
    .map((key) => {
      const proj = projectMap[key.toUpperCase()];
      if (!proj) console.warn(`Warning: [${course.name}] projectKey "${key}" not found — skipping`);
      return proj;
    })
    .filter(Boolean);
}

function validateConfig() {
  const errors = [];
  for (const c of config.courses) {
    if (!c.id) errors.push(`Course missing "id".`);
    if (!c.name) errors.push(`Course missing "name".`);
    for (const key of c.projectKeys || []) {
      if (!projectMap[key.toUpperCase()]) errors.push(`Course "${c.id}": projectKey "${key}" does not match any project.`);
    }
    const moduleNums = new Set();
    for (const m of c.modules || []) {
      if (m.number == null) errors.push(`Course "${c.id}": module missing "number".`);
      if (!m.name) errors.push(`Course "${c.id}": module missing "name".`);
      if (m.number != null && moduleNums.has(m.number)) errors.push(`Course "${c.id}": duplicate module number ${m.number}.`);
      moduleNums.add(m.number);
    }
  }
  if (errors.length > 0) {
    console.error("Config validation failed:");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
}

validateConfig();

// ── Helpers ──

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function displayName(github) {
  return nameMap[github.toLowerCase()] || github;
}

function statusPoints(status) {
  return status === "Done" ? 1 : 0;
}

function pct(done, total) {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

function countModules(modules) {
  return modules.length;
}

// ── Shared HTML fragments ──

function projectHeaderHtml(proj, done, total) {
  const p = pct(done, total);
  const nameHtml = proj.repo
    ? `<a href="${escapeHtml(proj.repo)}" target="_blank" rel="noopener" title="${escapeHtml(proj.name)}">${escapeHtml(proj.key)}</a>`
    : `<span title="${escapeHtml(proj.name)}">${escapeHtml(proj.key)}</span>`;
  return `<th class="project-header" title="${escapeHtml(proj.name)} \u2014 ${done} / ${total} modules completed (${p}%)">${nameHtml}<div class="project-full-name">${escapeHtml(proj.name)}</div><div class="project-lead">${escapeHtml(displayName(proj.lead))}</div></th>`;
}

function progressCellHtml(done, total) {
  if (done === 0) return `<td class="cell progress-cell progress-none"></td>`;
  const p = pct(done, total);
  return `<td class="cell progress-cell progress-active">${done} / ${total} (${p}%)</td>`;
}

function statusCellHtml(entry, proj) {
  const status = entry.status;
  const cls = status.toLowerCase().replace(/\s+/g, "-");
  const text = status === "Done" ? "\u2705" : status;
  return `<td class="cell cell-${cls}"><a href="${entry.url}" target="_blank" rel="noopener" title="${escapeHtml(proj.key)}: ${status}">${text}</a></td>`;
}

const NEW_ISSUE_BODY_TEMPLATE = readFileSync(
  join(__dirname, "new-issue-body.md"),
  "utf-8",
);

function newIssueUrl(proj, course, moduleName) {
  const body = NEW_ISSUE_BODY_TEMPLATE
    .replaceAll("{{PROJECT_KEY}}", proj.key)
    .replaceAll("{{PROJECT_NAME}}", proj.name)
    .replaceAll("{{COURSE_NAME}}", course.name)
    .replaceAll("{{MODULE_NAME}}", moduleName);
  const params = new URLSearchParams({
    title: `${proj.key} — ${moduleName}`,
    body,
  });
  return `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/issues/new?${params.toString()}`;
}

function newIssueCellHtml(proj, course, moduleName) {
  const url = newIssueUrl(proj, course, moduleName);
  return `<td class="cell cell-missing"><a href="${url}" target="_blank" rel="noopener" title="Create ticket for ${escapeHtml(proj.key)} - ${escapeHtml(moduleName)}">+</a></td>`;
}

// ── Scoring ──

function scoreProject(proj, modules, matrix) {
  const data = matrix[proj.key.toLowerCase()] || {};
  let points = 0;
  let doneCount = 0;
  for (const m of modules) {
    const entry = data[m.number];
    if (entry) {
      points += statusPoints(entry.status);
      if (entry.status === "Done") doneCount++;
    }
  }
  return { proj, data, points, doneCount };
}

function computeProjectOrder(courses, matrices) {
  const totals = config.projects.map((proj) => {
    let totalPoints = 0;
    for (let i = 0; i < courses.length; i++) {
      const { points } = scoreProject(proj, courses[i].modules, matrices[i]);
      totalPoints += points;
    }
    return { proj, totalPoints };
  });
  totals.sort((a, b) => b.totalPoints - a.totalPoints);
  return totals.map((t) => t.proj);
}

// ── GitHub API ──

async function graphql(query, variables = {}) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    console.error("GraphQL errors:", JSON.stringify(json.errors, null, 2));
    process.exit(1);
  }
  return json.data;
}

async function fetchAllIssues(owner, repo) {
  const issues = [];
  let cursor = null;
  while (true) {
    const data = await graphql(
      `query($owner: String!, $repo: String!, $after: String) {
        repository(owner: $owner, name: $repo) {
          issues(first: 100, after: $after, states: [OPEN, CLOSED]) {
            pageInfo { hasNextPage endCursor }
            nodes {
              number title url
              projectItems(first: 10) {
                nodes {
                  project { id }
                  course: fieldValueByName(name: "Course") {
                    ... on ProjectV2ItemFieldSingleSelectValue { name }
                  }
                  sandboxProject: fieldValueByName(name: "Sandbox Project") {
                    ... on ProjectV2ItemFieldSingleSelectValue { name }
                  }
                  module: fieldValueByName(name: "Module") {
                    ... on ProjectV2ItemFieldSingleSelectValue { name }
                  }
                  status: fieldValueByName(name: "Status") {
                    ... on ProjectV2ItemFieldSingleSelectValue { name }
                  }
                }
              }
            }
          }
        }
      }`,
      { owner, repo, after: cursor }
    );
    const page = data.repository.issues;
    issues.push(...page.nodes);
    if (!page.pageInfo.hasNextPage) break;
    cursor = page.pageInfo.endCursor;
  }
  return issues;
}

// ── Matrix ──
// matrix[projectKey][moduleNum] = { status, url }

function buildMatrix(issues, course) {
  const matrix = {};
  for (const proj of config.projects) matrix[proj.key.toLowerCase()] = {};

  const checkCourseField = (config.board.courses?.length || 0) > 1;
  const courseFieldValue = course.id.toUpperCase();

  for (const issue of issues) {
    const projectItem = issue.projectItems.nodes.find((n) => n.project.id === boardId);
    if (!projectItem) continue;

    if (checkCourseField && projectItem.course?.name !== courseFieldValue) continue;

    const sandboxProject = projectItem.sandboxProject?.name;
    const moduleField = projectItem.module?.name;
    if (!sandboxProject || !moduleField) {
      console.warn(`Warning: [${course.name}] Issue #${issue.number} on board but missing Sandbox Project or Module field — skipping`);
      continue;
    }

    const projKey = sandboxProject.split(" — ")[0].toLowerCase();
    const moduleNum = moduleField.split(" - ")[0];

    if (!matrix[projKey]) {
      console.warn(`Warning: [${course.name}] Issue #${issue.number} has Sandbox Project "${sandboxProject}" but no matching project — skipping`);
      continue;
    }

    const status = projectItem.status?.name || "In Review";
    matrix[projKey][moduleNum] = { status, url: issue.url };
  }
  return matrix;
}

// ── Desktop table ──

function renderDesktopTable(course, scored, totalModules) {
  const modules = course.modules;

  const courseTitleHtml = course.url
    ? `<a href="${escapeHtml(course.url)}" target="_blank" rel="noopener">${escapeHtml(course.name)}</a>`
    : escapeHtml(course.name);

  const headers = scored
    .map(({ proj, doneCount }) => projectHeaderHtml(proj, doneCount, totalModules))
    .join("\n            ");

  const progressRow = scored
    .map(({ doneCount }) => progressCellHtml(doneCount, totalModules))
    .join("\n              ");

  const bodyRows = modules
    .map((m) => {
      const moduleName = `${m.number} - ${m.name}`;
      const label = m.url
        ? `<a href="${escapeHtml(m.url)}" target="_blank" rel="noopener">${escapeHtml(moduleName)}</a>`
        : escapeHtml(moduleName);

      const cells = scored
        .map(({ proj, data }) => {
          const entry = data[m.number];
          if (!entry) {
            return newIssueCellHtml(proj, course, moduleName);
          }
          return statusCellHtml(entry, proj);
        })
        .join("\n              ");

      return `          <tr>
            <td class="module-name">${label}</td>
              ${cells}
          </tr>`;
    })
    .join("\n");

  return `
  <div class="course-section" id="course-${escapeHtml(course.id)}">
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th class="module-name course-title-cell">${courseTitleHtml}</th>
            ${headers}
          </tr>
          <tr class="progress-row">
            <td class="module-name"><strong>Progress</strong></td>
              ${progressRow}
          </tr>
        </thead>
        <tbody>
${bodyRows}
        </tbody>
      </table>
    </div>
  </div>`;
}

// ── Mobile cards ──

function renderMobileCards(course, scored, totalModules) {
  const modules = course.modules;

  const cards = scored
    .map(({ proj, data, doneCount }) => {
      const p = pct(doneCount, totalModules);

      const nameHtml = proj.repo
        ? `<a href="${escapeHtml(proj.repo)}" target="_blank" rel="noopener">${escapeHtml(proj.name)}</a>`
        : escapeHtml(proj.name);

      const moduleItems = modules
        .map((m) => {
          const moduleName = `${m.number} - ${m.name}`;
          const entry = data[m.number];
          if (!entry) {
            const url = newIssueUrl(proj, course, moduleName);
            const moduleLabel = m.url ? `<a href="${escapeHtml(m.url)}" target="_blank" rel="noopener">${escapeHtml(moduleName)}</a>` : escapeHtml(moduleName);
            return `<li class="card-module-item"><span class="card-module-name">${moduleLabel}</span><span class="card-module-status card-status-missing"><a href="${url}" target="_blank" rel="noopener">+</a></span></li>`;
          }
          const cls = "card-status-" + entry.status.toLowerCase().replace(/\s+/g, "-");
          const moduleLabel = m.url ? `<a href="${escapeHtml(m.url)}" target="_blank" rel="noopener">${escapeHtml(moduleName)}</a>` : escapeHtml(moduleName);
          return `<li class="card-module-item"><span class="card-module-name">${moduleLabel}</span><span class="card-module-status ${cls}"><a href="${entry.url}" target="_blank" rel="noopener">${entry.status}</a></span></li>`;
        })
        .join("\n");

      const filterText = [proj.key, proj.name, ...proj.members.map((m) => displayName(m)), ...proj.members].join(" ").toLowerCase();

      return `    <div class="card" data-filter="${escapeHtml(filterText)}">
      <div class="card-header">
        <span class="card-name">${nameHtml}</span>
        <span class="card-code">${escapeHtml(proj.key)}</span>
      </div>
      <div class="card-lead">Lead: <a href="https://github.com/${encodeURIComponent(proj.lead)}" target="_blank" rel="noopener">${escapeHtml(displayName(proj.lead))}</a></div>
      ${doneCount > 0 ? `<div class="card-progress-label">${doneCount} / ${totalModules} (${p}%)</div>` : ""}
      <ul class="card-modules">
${moduleItems}
      </ul>
    </div>`;
    })
    .join("\n");

  const courseTitleHtml = course.url
    ? `<a href="${escapeHtml(course.url)}" target="_blank" rel="noopener">${escapeHtml(course.name)}</a>`
    : escapeHtml(course.name);

  return `
  <div class="course-section-mobile" id="course-${escapeHtml(course.id)}-mobile">
    <h2 class="course-title">${courseTitleHtml}</h2>
${cards}
  </div>`;
}

// ── Course section (desktop + mobile) ──

function generateCourseSection(course, matrix, sortedProjects) {
  const modules = course.modules;
  const totalModules = countModules(modules);
  const scored = sortedProjects.map((proj) => scoreProject(proj, modules, matrix));
  return {
    section: renderDesktopTable(course, scored, totalModules),
    cards: renderMobileCards(course, scored, totalModules),
  };
}

// ── Summary table ──

function generateSummaryTable(courses, matrices, sortedProjects) {
  const projectTotals = sortedProjects.map((proj) => {
    let totalDone = 0;
    let totalModules = 0;
    for (let i = 0; i < courses.length; i++) {
      const { doneCount } = scoreProject(proj, courses[i].modules, matrices[i]);
      totalDone += doneCount;
      totalModules += countModules(courses[i].modules);
    }
    return { proj, totalDone, totalModules };
  });

  const headers = projectTotals
    .map(({ proj, totalDone, totalModules }) => projectHeaderHtml(proj, totalDone, totalModules))
    .join("\n            ");

  const rows = courses
    .map((c, i) => {
      const cModules = countModules(c.modules);
      const cells = projectTotals
        .map(({ proj }) => {
          const { doneCount } = scoreProject(proj, c.modules, matrices[i]);
          return progressCellHtml(doneCount, cModules);
        })
        .join("\n              ");
      return `          <tr>
            <td class="summary-label"><a href="#course-${escapeHtml(c.id)}">${escapeHtml(c.name)}</a></td>
              ${cells}
          </tr>`;
    })
    .join("\n");

  const totalCells = projectTotals
    .map(({ totalDone, totalModules }) => progressCellHtml(totalDone, totalModules))
    .join("\n              ");

  return `
  <div class="summary-section">
    <h2 class="course-title">Summary</h2>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th class="summary-label">Course</th>
            ${headers}
          </tr>
        </thead>
        <tbody>
${rows}
          <tr class="progress-row">
            <td class="summary-label"><strong>Total</strong></td>
              ${totalCells}
          </tr>
        </tbody>
      </table>
    </div>
  </div>`;
}

// ── Main ──

async function main() {
  const courses = config.courses;

  console.log("Fetching issues...");
  const issues = await fetchAllIssues(GITHUB_OWNER, GITHUB_REPO);
  console.log(`Fetched ${issues.length} issues.`);

  const matrices = courses.map((c) => {
    console.log(`Processing ${c.name}...`);
    return buildMatrix(issues, c);
  });

  const sortedProjects = computeProjectOrder(courses, matrices);

  const sections = [];
  const cards = [];
  for (let i = 0; i < courses.length; i++) {
    const result = generateCourseSection(courses[i], matrices[i], sortedProjects);
    sections.push(result.section);
    cards.push(result.cards);
  }

  const template = readFileSync(join(__dirname, "dashboard-template.html"), "utf-8");
  const css = readFileSync(join(__dirname, "dashboard.css"), "utf-8");
  const version = Date.now().toString();
  const html = template
    .replace("{{DASHBOARD_CSS}}", css)
    .replace("{{LAST_UPDATED}}", new Date().toUTCString())
    .replace("{{VERSION}}", version)
    .replace("{{SUMMARY_TABLE}}", generateSummaryTable(courses, matrices, sortedProjects))
    .replace("{{COURSE_SECTIONS}}", sections.join("\n"))
    .replace("{{COURSE_CARDS}}", cards.join("\n"))
    .replaceAll("{{TITLE}}", escapeHtml(config.title))
    .replace("{{BOARD_URL}}", escapeHtml(config.board.url))
    .replaceAll("{{GITHUB_OWNER}}", GITHUB_OWNER)
    .replaceAll("{{GITHUB_REPO}}", GITHUB_REPO);

  const docsDir = join(ROOT, "docs");
  mkdirSync(docsDir, { recursive: true });
  writeFileSync(join(docsDir, "index.html"), html, "utf-8");
  writeFileSync(join(docsDir, "version.json"), JSON.stringify({ version }) + "\n", "utf-8");
  console.log("Dashboard written to docs/index.html");
  console.log(`Version ${version} written to docs/version.json`);
}

main();

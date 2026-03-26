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
      if (!m.tasks || m.tasks.length === 0) errors.push(`Course "${c.id}": module ${m.number} has no tasks.`);
      if (m.number != null && moduleNums.has(m.number)) errors.push(`Course "${c.id}": duplicate module number ${m.number}.`);
      moduleNums.add(m.number);
      const taskNums = new Set();
      for (const t of m.tasks || []) {
        if (t.number == null) errors.push(`Course "${c.id}": module ${m.number}: task missing "number".`);
        if (!t.name) errors.push(`Course "${c.id}": module ${m.number}: task missing "name".`);
        if (t.number != null && taskNums.has(t.number)) errors.push(`Course "${c.id}": module ${m.number}: duplicate task number ${t.number}.`);
        taskNums.add(t.number);
      }
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
  if (status === "Done") return 1;
  if (status === "In Review" || status === "In Progress") return 0.5;
  return 0;
}

function pct(done, total) {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

function countTasks(modules) {
  return modules.reduce((sum, m) => sum + (m.tasks || []).length, 0);
}

function taskKey(moduleNum, taskNum) {
  return `${moduleNum}-${taskNum}`;
}

const ISSUE_NOTICE = `> **\u26a0\ufe0f This ticket is auto-generated. Please do not change the title or contents below. Just click the "Create" button below. After a few minutes, the ticket will be automatically assigned to a reviewer \u2014 no further action needed. You can add comments after the ticket is created.**`;

// ── Shared HTML fragments ──

function projectHeaderHtml(proj, done, total) {
  const p = pct(done, total);
  const nameHtml = proj.repo
    ? `<a href="${escapeHtml(proj.repo)}" target="_blank" rel="noopener" title="${escapeHtml(proj.name)}">${escapeHtml(proj.key)}</a>`
    : `<span title="${escapeHtml(proj.name)}">${escapeHtml(proj.key)}</span>`;
  return `<th class="project-header" title="${escapeHtml(proj.name)} \u2014 ${done} / ${total} tasks completed (${p}%)">${nameHtml}<div class="project-full-name">${escapeHtml(proj.name)}</div><div class="project-lead">${escapeHtml(displayName(proj.lead))}</div></th>`;
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

function newIssueCellHtml(proj, fullName, issueBody) {
  const url = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/issues/new?title=${encodeURIComponent(fullName)}&body=${encodeURIComponent(issueBody)}`;
  return `<td class="cell cell-missing"><a href="${url}" target="_blank" rel="noopener" title="Create ticket for ${escapeHtml(proj.key)} - ${escapeHtml(fullName)}">+</a></td>`;
}

function newIssueBody(courseName, projName, moduleName, taskName) {
  return `${ISSUE_NOTICE}\n\n### Course\n\n${courseName}\n\n### Project\n\n${projName}\n\n### Module\n\n${moduleName}\n\n### Task\n\n${taskName}\n\n${ISSUE_NOTICE}`;
}

// ── Scoring ──

function scoreProject(proj, modules, matrix) {
  const data = matrix[proj.key.toLowerCase()] || {};
  let points = 0;
  let doneCount = 0;
  for (const m of modules) {
    for (const t of m.tasks || []) {
      const entry = data[taskKey(m.number, t.number)];
      if (entry) {
        points += statusPoints(entry.status);
        if (entry.status === "Done") doneCount++;
      }
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
              labels(first: 20) { nodes { name } }
              projectItems(first: 10) {
                nodes {
                  project { id }
                  fieldValueByName(name: "Status") {
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
// matrix[projectKey]["moduleNum-taskNum"] = { status, url }

function buildMatrix(issues, course) {
  const matrix = {};
  for (const proj of config.projects) matrix[proj.key.toLowerCase()] = {};

  for (const issue of issues) {
    const labels = issue.labels.nodes.map((l) => l.name);
    const courseLabel = labels.find((l) => l.startsWith("course-"));
    const moduleLabel = labels.find((l) => /^module-\d+/.test(l));
    const taskLabel = labels.find((l) => /^task-\d+/.test(l));
    const projectLabel = labels.find((l) => /^project-/.test(l));

    if (courseLabel !== `course-${course.id}`) continue;
    if (moduleLabel && !projectLabel) {
      console.warn(`Warning: [${course.name}] Issue #${issue.number} has ${moduleLabel} but no project- label — skipping`);
      continue;
    }
    if (!moduleLabel || !projectLabel || !taskLabel) continue;

    const moduleNum = moduleLabel.match(/^module-(\d+)/)[1];
    const taskNum = taskLabel.match(/^task-(\d+)/)[1];
    const projKey = projectLabel.replace("project-", "");

    if (!matrix[projKey]) {
      console.warn(`Warning: [${course.name}] Issue #${issue.number} has label ${projectLabel} but no matching project — skipping`);
      continue;
    }

    const projectItem = issue.projectItems.nodes.find((n) => n.project.id === boardId);
    const status = projectItem?.fieldValueByName?.name || "In Review";
    matrix[projKey][taskKey(moduleNum, taskNum)] = { status, url: issue.url };
  }
  return matrix;
}

// ── Desktop table ──

function renderDesktopTable(course, scored, totalTasks) {
  const modules = course.modules;
  const colCount = scored.length;

  const headers = scored
    .map(({ proj, doneCount }) => projectHeaderHtml(proj, doneCount, totalTasks))
    .join("\n            ");

  const progressRow = scored
    .map(({ doneCount }) => progressCellHtml(doneCount, totalTasks))
    .join("\n              ");

  const bodyRows = modules
    .map((m) => {
      const moduleName = `${m.number} - ${m.name}`;
      const label = m.url
        ? `<a href="${escapeHtml(m.url)}" target="_blank" rel="noopener">${escapeHtml(moduleName)}</a>`
        : escapeHtml(moduleName);

      const weekBadge = m.week ? `<span class="week-badge">W${m.week}</span>` : "";
      const headerRow = `          <tr class="module-group-header">
            <td class="module-group-name" colspan="${colCount + 1}">${weekBadge}${label}</td>
          </tr>`;

      const taskRows = (m.tasks || [])
        .map((t) => {
          const taskName = `${t.number} - ${t.name}`;
          const cells = scored
            .map(({ proj, data }) => {
              const entry = data[taskKey(m.number, t.number)];
              if (!entry) {
                const fullName = `${moduleName} / ${taskName}`;
                return newIssueCellHtml(proj, fullName, newIssueBody(course.name, proj.name, moduleName, taskName));
              }
              return statusCellHtml(entry, proj);
            })
            .join("\n              ");

          return `          <tr>
            <td class="task-name">${t.url ? `<a href="${escapeHtml(t.url)}" target="_blank" rel="noopener">${escapeHtml(taskName)}</a>` : escapeHtml(taskName)}</td>
              ${cells}
          </tr>`;
        })
        .join("\n");

      return headerRow + "\n" + taskRows;
    })
    .join("\n");

  return `
  <div class="course-section" id="course-${escapeHtml(course.id)}">
    <h2 class="course-title">${escapeHtml(course.name)}</h2>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th class="module-name">Module / Task</th>
            ${headers}
          </tr>
          <tr class="progress-row">
            <td class="module-name"><strong>Progress</strong></td>
              ${progressRow}
          </tr>
        </thead>
        <tbody>
${bodyRows}
          <tr class="progress-row">
            <td class="module-name"><strong>Progress</strong></td>
              ${progressRow}
          </tr>
        </tbody>
      </table>
    </div>
  </div>`;
}

// ── Mobile cards ──

function renderMobileCards(course, scored, totalTasks) {
  const modules = course.modules;

  const cards = scored
    .map(({ proj, data, doneCount }) => {
      const p = pct(doneCount, totalTasks);

      const nameHtml = proj.repo
        ? `<a href="${escapeHtml(proj.repo)}" target="_blank" rel="noopener">${escapeHtml(proj.name)}</a>`
        : escapeHtml(proj.name);

      const moduleItems = modules
        .map((m) => {
          const moduleName = `${m.number} - ${m.name}`;
          const weekBadge = m.week ? `<span class="week-badge">W${m.week}</span>` : "";
          const header = `<li class="card-module-header">${weekBadge}${escapeHtml(moduleName)}</li>`;
          const tasks = (m.tasks || [])
            .map((t) => {
              const taskName = `${t.number} - ${t.name}`;
              const entry = data[taskKey(m.number, t.number)];
              if (!entry) {
                const fullName = `${moduleName} / ${taskName}`;
                const url = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/issues/new?title=${encodeURIComponent(fullName)}&body=${encodeURIComponent(newIssueBody(course.name, proj.name, moduleName, taskName))}`;
                const taskLabel = t.url ? `<a href="${escapeHtml(t.url)}" target="_blank" rel="noopener">${escapeHtml(taskName)}</a>` : escapeHtml(taskName);
                return `<li class="card-task-item"><span class="card-task-name">${taskLabel}</span><span class="card-module-status card-status-missing"><a href="${url}" target="_blank" rel="noopener">+</a></span></li>`;
              }
              const cls = "card-status-" + entry.status.toLowerCase().replace(/\s+/g, "-");
              const taskLabel = t.url ? `<a href="${escapeHtml(t.url)}" target="_blank" rel="noopener">${escapeHtml(taskName)}</a>` : escapeHtml(taskName);
              return `<li class="card-task-item"><span class="card-task-name">${taskLabel}</span><span class="card-module-status ${cls}"><a href="${entry.url}" target="_blank" rel="noopener">${entry.status}</a></span></li>`;
            })
            .join("\n");
          return header + "\n" + tasks;
        })
        .join("\n");

      const filterText = [proj.key, proj.name, ...proj.members.map((m) => displayName(m)), ...proj.members].join(" ").toLowerCase();

      return `    <div class="card" data-filter="${escapeHtml(filterText)}">
      <div class="card-header">
        <span class="card-name">${nameHtml}</span>
        <span class="card-code">${escapeHtml(proj.key)}</span>
      </div>
      <div class="card-lead">Lead: <a href="https://github.com/${encodeURIComponent(proj.lead)}" target="_blank" rel="noopener">${escapeHtml(displayName(proj.lead))}</a></div>
      ${doneCount > 0 ? `<div class="card-progress-label">${doneCount} / ${totalTasks} (${p}%)</div>` : ""}
      <ul class="card-modules">
${moduleItems}
      </ul>
    </div>`;
    })
    .join("\n");

  return `
  <div class="course-section-mobile" id="course-${escapeHtml(course.id)}-mobile">
    <h2 class="course-title">${escapeHtml(course.name)}</h2>
${cards}
  </div>`;
}

// ── Course section (desktop + mobile) ──

function generateCourseSection(course, matrix, sortedProjects) {
  const modules = course.modules;
  const totalTasks = countTasks(modules);
  const scored = sortedProjects.map((proj) => scoreProject(proj, modules, matrix));
  return {
    section: renderDesktopTable(course, scored, totalTasks),
    cards: renderMobileCards(course, scored, totalTasks),
  };
}

// ── Summary table ──

function generateSummaryTable(courses, matrices, sortedProjects) {
  const projectTotals = sortedProjects.map((proj) => {
    let totalDone = 0;
    let totalTasks = 0;
    for (let i = 0; i < courses.length; i++) {
      const { doneCount } = scoreProject(proj, courses[i].modules, matrices[i]);
      const cTasks = countTasks(courses[i].modules);
      totalDone += doneCount;
      totalTasks += cTasks;
    }
    return { proj, totalDone, totalTasks };
  });

  const headers = projectTotals
    .map(({ proj, totalDone, totalTasks }) => projectHeaderHtml(proj, totalDone, totalTasks))
    .join("\n            ");

  const rows = courses
    .map((c, i) => {
      const cTasks = countTasks(c.modules);
      const cells = projectTotals
        .map(({ proj }) => {
          const { doneCount } = scoreProject(proj, c.modules, matrices[i]);
          return progressCellHtml(doneCount, cTasks);
        })
        .join("\n              ");
      return `          <tr>
            <td class="summary-label"><a href="#course-${escapeHtml(c.id)}">${escapeHtml(c.name)}</a></td>
              ${cells}
          </tr>`;
    })
    .join("\n");

  const totalCells = projectTotals
    .map(({ totalDone, totalTasks }) => progressCellHtml(totalDone, totalTasks))
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
  const html = template
    .replace("{{DASHBOARD_CSS}}", css)
    .replace("{{LAST_UPDATED}}", new Date().toUTCString())
    .replace("{{SUMMARY_TABLE}}", generateSummaryTable(courses, matrices, sortedProjects))
    .replace("{{COURSE_SECTIONS}}", sections.join("\n"))
    .replace("{{COURSE_CARDS}}", cards.join("\n"))
    .replaceAll("{{SANDBOX_TITLE}}", escapeHtml(config.title))
    .replace("{{BOARD_URL}}", escapeHtml(config.board.url))
    .replaceAll("{{GITHUB_OWNER}}", GITHUB_OWNER)
    .replaceAll("{{GITHUB_REPO}}", GITHUB_REPO);

  const docsDir = join(ROOT, "docs");
  mkdirSync(docsDir, { recursive: true });
  writeFileSync(join(docsDir, "index.html"), html, "utf-8");
  console.log("Dashboard written to docs/index.html");
}

main();

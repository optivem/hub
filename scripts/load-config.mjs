import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export function loadConfig(rootDir) {
  const configDir = join(rootDir, "config");

  const board = JSON.parse(readFileSync(join(configDir, "board.json"), "utf-8"));
  const reviewers = JSON.parse(readFileSync(join(configDir, "reviewers.json"), "utf-8"));
  const students = JSON.parse(readFileSync(join(configDir, "students.json"), "utf-8"));
  const projects = JSON.parse(readFileSync(join(configDir, "projects.json"), "utf-8"));
  const labels = JSON.parse(readFileSync(join(configDir, "labels.json"), "utf-8"));

  const coursesDir = join(configDir, "courses");
  const courses = readdirSync(coursesDir)
    .filter(f => f.endsWith(".json"))
    .sort()
    .map(f => JSON.parse(readFileSync(join(coursesDir, f), "utf-8")));

  return {
    title: board.title,
    reviewers,
    board: board.board,
    statuses: board.statuses,
    students,
    projects,
    courses,
    labels,
  };
}

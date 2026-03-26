import { readFileSync, readdirSync } from "fs";
import { join } from "path";

export function loadConfig(rootDir) {
  const configDir = join(rootDir, "config");

  const sandbox = JSON.parse(readFileSync(join(configDir, "sandbox.json"), "utf-8"));
  const reviewers = JSON.parse(readFileSync(join(configDir, "reviewers.json"), "utf-8"));
  const students = JSON.parse(readFileSync(join(configDir, "students.json"), "utf-8"));
  const projects = JSON.parse(readFileSync(join(configDir, "projects.json"), "utf-8"));

  const coursesDir = join(configDir, "courses");
  const courses = readdirSync(coursesDir)
    .filter(f => f.endsWith(".json"))
    .sort()
    .map(f => JSON.parse(readFileSync(join(coursesDir, f), "utf-8")));

  return {
    title: sandbox.title,
    reviewers,
    board: sandbox.board,
    statuses: sandbox.statuses,
    students,
    projects,
    courses,
  };
}

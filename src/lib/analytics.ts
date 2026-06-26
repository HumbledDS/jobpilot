import type { Job } from "@/lib/types";

export function skillDemand(jobs: Job[]): { skill: string; count: number }[] {
  const m = new Map<string, number>();
  for (const j of jobs) {
    const set = new Set([...(j.matched_skills ?? []), ...(j.missing_skills ?? [])]);
    for (const s of set) m.set(s, (m.get(s) ?? 0) + 1);
  }
  return [...m]
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count);
}

export function roleDemand(
  jobs: Job[],
): { role: string; count: number; avgSalary: number | null }[] {
  const m = new Map<string, { count: number; sal: number[] }>();
  for (const j of jobs) {
    const r = j.role_family ?? "Autre";
    const e = m.get(r) ?? { count: 0, sal: [] };
    e.count++;
    const top = j.salary_max ?? j.salary_min;
    if (top) e.sal.push(top);
    m.set(r, e);
  }
  return [...m]
    .map(([role, e]) => ({
      role,
      count: e.count,
      avgSalary: e.sal.length
        ? Math.round(e.sal.reduce((a, b) => a + b, 0) / e.sal.length)
        : null,
    }))
    .sort((a, b) => b.count - a.count);
}

export function salaryStats(jobs: Job[]): {
  n: number;
  min: number | null;
  median: number | null;
  max: number | null;
} {
  const vals = jobs
    .map((j) => j.salary_max ?? j.salary_min)
    .filter((v): v is number => !!v && v > 0)
    .sort((a, b) => a - b);
  if (!vals.length) return { n: 0, min: null, median: null, max: null };
  return {
    n: vals.length,
    min: vals[0],
    median: vals[Math.floor(vals.length / 2)],
    max: vals[vals.length - 1],
  };
}

import type { Job, Application, ApplicationStatus } from "@/lib/types";

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

// Agrégateurs / job boards qui apparaissent comme "entreprise" mais ne sont pas l'employeur réel.
const AGGREGATORS = /hellowork|meteojob|talents handicap|direct emploi|jobijoba|regionsjob|cadremploi|indeed|jobteaser|figaro|keljob/i;

/** Which companies are actively hiring (from ingested offers) — the targeting signal. */
export function companiesHiring(jobs: Job[]) {
  const m = new Map<
    string,
    { offers: number; sal: number[]; scores: number[]; roles: Record<string, number>; latest: string | null }
  >();
  for (const j of jobs) {
    const name = (j.company_name ?? "").trim();
    if (!name || AGGREGATORS.test(name)) continue;
    const e = m.get(name) ?? { offers: 0, sal: [], scores: [], roles: {}, latest: null };
    e.offers++;
    const top = j.salary_max ?? j.salary_min;
    if (top) e.sal.push(top);
    if (j.match_score != null) e.scores.push(j.match_score);
    const rf = j.role_family ?? "Autre";
    e.roles[rf] = (e.roles[rf] ?? 0) + 1;
    if (j.posted_at && (!e.latest || j.posted_at > e.latest)) e.latest = j.posted_at;
    m.set(name, e);
  }
  return [...m]
    .map(([company, e]) => ({
      company,
      offers: e.offers,
      avgSalary: e.sal.length ? Math.round(e.sal.reduce((a, b) => a + b, 0) / e.sal.length) : null,
      avgScore: e.scores.length ? Math.round(e.scores.reduce((a, b) => a + b, 0) / e.scores.length) : 0,
      topRole: Object.entries(e.roles).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
      latest: e.latest,
    }))
    .sort((a, b) => b.offers - a.offers || b.avgScore - a.avgScore);
}

const SENT_STATUSES: ApplicationStatus[] = [
  "postule", "relance", "entretien", "offre", "refuse", "sans_reponse",
];

/** Funnel + rates + weekly cadence over the user's applications. */
export function applicationStats(apps: Application[]) {
  const by = (s: ApplicationStatus) => apps.filter((a) => a.status === s).length;
  const total = apps.length;
  const sent = apps.filter((a) => SENT_STATUSES.includes(a.status)).length;
  const interviews = by("entretien") + by("offre");
  const offers = by("offre");
  const responded = interviews + by("refuse");
  const responseRate = sent ? Math.round((responded / sent) * 100) : 0;
  const interviewRate = sent ? Math.round((interviews / sent) * 100) : 0;

  // last 6 ISO-ish weeks by created_at
  const now = Date.now();
  const weeks = Array.from({ length: 6 }, (_, i) => {
    const end = now - i * 7 * 86400000;
    const start = end - 7 * 86400000;
    const n = apps.filter((a) => {
      const t = new Date(a.created_at).getTime();
      return t >= start && t < end;
    }).length;
    return { label: i === 0 ? "cette sem." : `-${i} sem.`, n };
  }).reverse();

  const bySource: Record<string, number> = {};
  for (const a of apps) {
    const s = a.source_channel ?? "manuel";
    bySource[s] = (bySource[s] ?? 0) + 1;
  }

  return { total, sent, interviews, offers, responded, responseRate, interviewRate, weeks, bySource, by };
}

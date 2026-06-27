import { extractSkills, roleFamily } from "@/lib/skills";

// Profil de référence pour le matching (aligné sur jp_profile).
export const PROFILE_SKILLS = new Set([
  "Python", "SQL", "Spark", "Airflow", "dbt", "Snowflake", "Databricks",
  "Kafka", "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform",
  "Power BI", "Tableau", "Looker", "ETL/ELT", "Data Warehouse",
  "Data Lake/Lakehouse", "Machine Learning", "API/REST", "CI/CD",
  "Streaming", "NoSQL", "Redshift", "PostgreSQL", "Data Modeling",
  "Event-driven", "Analytics", "Microservices", "Observability", "Linux",
]);

const TARGET_FAMILIES = new Set([
  "Data Engineer", "Analytics Engineer", "Cloud Engineer", "Data Platform",
  "Solutions / FDE", "ML / AI Engineer", "Data Architect", "Lead / Head of Data",
]);

const SALARY_TARGET = 50000;

export type JobScore = {
  score: number;
  matched: string[];
  missing: string[];
  roleFamily: string;
};

export function scoreJob(job: {
  title: string;
  description?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  location?: string | null;
}): JobScore {
  const text = `${job.title} ${job.description ?? ""}`;
  const jobSkills = extractSkills(text);
  const matched = jobSkills.filter((s) => PROFILE_SKILLS.has(s));
  const missing = jobSkills.filter((s) => !PROFILE_SKILLS.has(s));
  const rf = roleFamily(job.title);

  // 1) Couverture des compétences demandées
  const coverage = jobSkills.length ? matched.length / jobSkills.length : 0.5;

  // 2) Alignement du métier avec la cible
  const titleAlign = rf === "Autre" ? 0.3 : TARGET_FAMILIES.has(rf) ? 1 : 0.6;

  // 3) Adéquation salaire
  const top = job.salary_max ?? job.salary_min ?? 0;
  let salaryFit = 0.6; // inconnu
  if (top > 0) {
    if (top >= 70000) salaryFit = 1;
    else if (top >= 55000) salaryFit = 0.85;
    else if (top >= SALARY_TARGET) salaryFit = 0.7;
    else salaryFit = 0.3;
  }

  // 4) Localisation (déjà filtré IDF/remote en amont)
  const loc = (job.location ?? "").toLowerCase();
  const locationFit = /[iî]le[- ]de[- ]france|paris|7[5-8]|9[1-5]|remote|t[ée]l[ée]travail/.test(loc) ? 1 : 0.6;

  // Bonus volume de compétences matchées (saturant)
  const depth = Math.min(matched.length, 6) / 6;

  const raw =
    0.42 * coverage +
    0.18 * titleAlign +
    0.18 * salaryFit +
    0.07 * locationFit +
    0.15 * depth;

  return {
    score: Math.round(raw * 100),
    matched,
    missing,
    roleFamily: rf,
  };
}

export function scoreLabel(score: number | null): { label: string; cls: string } {
  if (score == null) return { label: "·", cls: "bg-slate-100 text-slate-400 border-slate-200" };
  if (score >= 75) return { label: "Fort", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  if (score >= 55) return { label: "Bon", cls: "bg-lime-100 text-lime-700 border-lime-200" };
  if (score >= 40) return { label: "Moyen", cls: "bg-amber-100 text-amber-700 border-amber-200" };
  return { label: "Faible", cls: "bg-rose-100 text-rose-600 border-rose-200" };
}

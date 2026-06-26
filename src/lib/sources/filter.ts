import { type NormalizedJob } from "./types";

/**
 * Règles de pertinence — ne garder que les offres qui nous intéressent.
 * Ajuste ces valeurs pour élargir / resserrer le filtre.
 */
export const RELEVANCE = {
  // Salaire minimum (appliqué uniquement quand le salaire est connu).
  minSalary: 45000,

  // Île-de-France : départements acceptés.
  idfDepartments: ["75", "77", "78", "91", "92", "93", "94", "95"],

  // Garder aussi les postes 100% télétravail (hors IDF).
  allowRemote: true,

  // Le titre doit matcher au moins un de ces motifs (métier visé).
  includeTitle: [
    /\bdata\b/i,
    /donn[ée]es/i,
    /\bcloud\b/i,
    /\bdevops\b/i,
    /\bsre\b/i,
    /\bmlops\b/i,
    /\bdataops\b/i,
    /platform/i,
    /plateforme/i,
    /machine learning/i,
    /\bml\b/i,
    /big ?data/i,
    /analytics/i,
    /snowflake|databricks|\bspark\b|\bkafka\b|airflow|\bdbt\b/i,
    /\betl\b|\belt\b|\bdwh\b/i,
    /ing[ée]nieur.*(donn|data)/i,
    /solutions? engineer|forward deployed/i,
  ],

  // Le titre ne doit matcher AUCUN de ces motifs (à exclure).
  excludeTitle: [
    /altern/i,
    /\bstage\b|stagiaire|apprenti|apprentissage/i,
    /\bv\.?i\.?e\.?\b|\bvie\b/i,
    /commercial|\bvente\b|\bsales\b|business developer|account/i,
    /\bstagi/i,
  ],
};

function matchAny(text: string, patterns: RegExp[]) {
  return patterns.some((re) => re.test(text));
}

function isIdf(location: string | null, title: string): boolean {
  if (!location) return true; // lieu inconnu : on ne peut pas trancher -> on garde
  const loc = location.toLowerCase();
  if (/[iî]le[- ]de[- ]france|paris/.test(loc)) return true;
  if (RELEVANCE.idfDepartments.some((d) => new RegExp(`\\b${d}\\b`).test(loc)))
    return true;
  if (RELEVANCE.allowRemote && /t[ée]l[ée]travail|remote|distanciel/.test(loc + " " + title.toLowerCase()))
    return true;
  return false;
}

/** Décide si une offre normalisée est pertinente, avec la raison du rejet. */
export function isRelevant(job: NormalizedJob): { ok: boolean; reason?: string } {
  const title = job.title ?? "";

  if (matchAny(title, RELEVANCE.excludeTitle))
    return { ok: false, reason: "titre exclu (alternance/stage/commercial…)" };

  if (!matchAny(title, RELEVANCE.includeTitle))
    return { ok: false, reason: "titre hors cible data/cloud/IA" };

  const top = job.salary_max ?? job.salary_min;
  if (top != null && top > 0 && top < RELEVANCE.minSalary)
    return { ok: false, reason: `salaire < ${RELEVANCE.minSalary}` };

  if (!isIdf(job.location, title))
    return { ok: false, reason: "hors Île-de-France" };

  return { ok: true };
}

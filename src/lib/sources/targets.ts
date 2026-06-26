import { getAdmin } from "@/lib/supabase/admin";
import { type NormalizedJob } from "./types";
import { fetchAdzuna, adzunaConfigured } from "./adzuna";
import { isRelevant } from "./filter";
import { scoreJob } from "@/lib/scoring";

export type TargetIngestResult = {
  ok: boolean;
  error?: string;
  covered: number; // entreprises interrogées
  capped: number; // entreprises non interrogées (au-delà du cap)
  matched: number; // offres réellement émises par l'entreprise cible
  inserted: number;
};

function employerMatches(companyName: string, target: string): boolean {
  const c = companyName.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  if (!c || !t) return false;
  return c.includes(t) || t.includes(c);
}

async function chunk<T, R>(items: T[], size: number, fn: (x: T) => Promise<R>) {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    out.push(...(await Promise.all(batch.map(fn))));
  }
  return out;
}

/**
 * Source les offres directement émises par les entreprises cibles (vrais postes internes),
 * via Adzuna (une requête par entreprise), en ne gardant que les offres dont l'employeur
 * correspond réellement à l'entreprise visée. Évite les intermédiaires.
 */
export async function ingestTargets(
  names: string[],
  cap = 25,
): Promise<TargetIngestResult> {
  const db = getAdmin();
  if (!db) return { ok: false, error: "service role manquante", covered: 0, capped: 0, matched: 0, inserted: 0 };
  if (!adzunaConfigured())
    return { ok: false, error: "Adzuna non configuré", covered: 0, capped: 0, matched: 0, inserted: 0 };

  const targets = names.slice(0, cap);
  const capped = Math.max(0, names.length - targets.length);
  const started = new Date().toISOString();

  const { data: existing } = await db
    .from("jp_jobs")
    .select("external_id")
    .eq("source", "adzuna");
  const have = new Set((existing ?? []).map((e) => e.external_id));

  const collected = new Map<string, NormalizedJob & { _company: string }>();

  await chunk(targets, 5, async (name) => {
    let jobs: NormalizedJob[] = [];
    try {
      jobs = await fetchAdzuna(name);
    } catch {
      return;
    }
    for (const j of jobs) {
      if (!j.external_id || !j.company_name) continue;
      if (!employerMatches(j.company_name, name)) continue; // vrai employeur uniquement
      if (!isRelevant(j).ok) continue;
      if (have.has(j.external_id) || collected.has(j.external_id)) continue;
      collected.set(j.external_id, { ...j, _company: name });
    }
  });

  const toInsert = [...collected.values()].map((j) => {
    const sc = scoreJob(j);
    return {
      source: j.source,
      external_id: j.external_id,
      title: j.title,
      company_name: j.company_name,
      location: j.location,
      url: j.url,
      salary_min: j.salary_min,
      salary_max: j.salary_max,
      contract_type: j.contract_type,
      description: j.description,
      posted_at: j.posted_at,
      tags: j.tags,
      raw: j.raw,
      match_score: sc.score,
      matched_skills: sc.matched,
      missing_skills: sc.missing,
      role_family: sc.roleFamily,
      from_target: true,
      source_company: j._company,
    };
  });

  let inserted = 0;
  if (toInsert.length) {
    const { error } = await db.from("jp_jobs").insert(toInsert);
    if (error)
      return { ok: false, error: error.message, covered: targets.length, capped, matched: collected.size, inserted: 0 };
    inserted = toInsert.length;
  }

  await db.from("jp_ingest_runs").insert({
    source: "targets",
    started_at: started,
    finished_at: new Date().toISOString(),
    found: collected.size,
    inserted,
    ok: true,
  });

  return { ok: true, covered: targets.length, capped, matched: collected.size, inserted };
}

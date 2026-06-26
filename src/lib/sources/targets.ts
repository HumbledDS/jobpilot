import { getAdmin } from "@/lib/supabase/admin";
import { type NormalizedJob } from "./types";
import { isRelevant } from "./filter";
import { scoreJob } from "@/lib/scoring";

export type TargetIngestResult = {
  ok: boolean;
  error?: string;
  covered: number; // entreprises interrogées
  capped: number; // entreprises non interrogées (au-delà du cap)
  boards: number; // entreprises avec un ATS public trouvé (Greenhouse/Lever)
  matched: number; // offres pertinentes trouvées
  inserted: number;
};

/** Slug ATS probable à partir du nom (greenhouse/lever utilisent un token court). */
function slug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Greenhouse : board public d'une entreprise (postes internes réels). */
async function fetchGreenhouse(token: string, company: string): Promise<NormalizedJob[]> {
  try {
    const res = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { jobs?: GhJob[] };
    return (data.jobs ?? []).map((j) => ({
      source: "targets",
      external_id: `gh:${token}:${j.id}`,
      title: j.title,
      company_name: company,
      location: j.location?.name ?? null,
      url: j.absolute_url ?? null,
      salary_min: null,
      salary_max: null,
      contract_type: null,
      description: stripHtml(j.content ?? "").slice(0, 2000),
      posted_at: j.updated_at ?? null,
      tags: ["entreprise cible", "greenhouse"],
      raw: j,
    }));
  } catch {
    return [];
  }
}

/** Lever : postings publics d'une entreprise. */
async function fetchLever(token: string, company: string): Promise<NormalizedJob[]> {
  try {
    const res = await fetch(`https://api.lever.co/v0/postings/${token}?mode=json`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as LeverJob[];
    if (!Array.isArray(data)) return [];
    return data.map((j) => ({
      source: "targets",
      external_id: `lever:${token}:${j.id}`,
      title: j.text,
      company_name: company,
      location: j.categories?.location ?? null,
      url: j.hostedUrl ?? null,
      salary_min: null,
      salary_max: null,
      contract_type: j.categories?.commitment ?? null,
      description: (j.descriptionPlain ?? "").slice(0, 2000),
      posted_at: j.createdAt ? new Date(j.createdAt).toISOString() : null,
      tags: ["entreprise cible", "lever"],
      raw: j,
    }));
  } catch {
    return [];
  }
}

async function chunk<T, R>(items: T[], size: number, fn: (x: T) => Promise<R>) {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return out;
}

/**
 * Source les offres directement depuis l'ATS public (Greenhouse / Lever) des entreprises cibles :
 * ce sont les postes en interne, pas des intermédiaires. Le token ATS est deviné depuis le nom.
 */
export async function ingestTargets(names: string[], cap = 40): Promise<TargetIngestResult> {
  const db = getAdmin();
  if (!db)
    return { ok: false, error: "service role manquante", covered: 0, capped: 0, boards: 0, matched: 0, inserted: 0 };

  const targets = names.slice(0, cap);
  const capped = Math.max(0, names.length - targets.length);
  const started = new Date().toISOString();

  const { data: existing } = await db.from("jp_jobs").select("external_id");
  const have = new Set((existing ?? []).map((e) => e.external_id));

  const collected = new Map<string, NormalizedJob>();
  let boards = 0;

  await chunk(targets, 6, async (name) => {
    const token = slug(name);
    if (!token) return;
    const [gh, lv] = await Promise.all([
      fetchGreenhouse(token, name),
      fetchLever(token, name),
    ]);
    if (gh.length || lv.length) boards++;
    for (const j of [...gh, ...lv]) {
      if (!j.external_id || have.has(j.external_id) || collected.has(j.external_id)) continue;
      if (!isRelevant(j).ok) continue; // métier data/cloud + IDF/remote, hors alternance/stage
      collected.set(j.external_id, j);
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
      source_company: j.company_name,
    };
  });

  let inserted = 0;
  if (toInsert.length) {
    const { error } = await db.from("jp_jobs").insert(toInsert);
    if (error)
      return { ok: false, error: error.message, covered: targets.length, capped, boards, matched: collected.size, inserted: 0 };
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

  return { ok: true, covered: targets.length, capped, boards, matched: collected.size, inserted };
}

type GhJob = {
  id: number;
  title: string;
  content?: string;
  absolute_url?: string;
  updated_at?: string;
  location?: { name?: string };
};

type LeverJob = {
  id: string;
  text: string;
  hostedUrl?: string;
  descriptionPlain?: string;
  createdAt?: number;
  categories?: { location?: string; commitment?: string; team?: string };
};

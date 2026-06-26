import { getAdmin } from "@/lib/supabase/admin";
import { INGEST_KEYWORDS, type NormalizedJob } from "@/lib/sources/types";
import { fetchApec } from "@/lib/sources/apec";
import {
  fetchFranceTravail,
  franceTravailConfigured,
} from "@/lib/sources/francetravail";
import { fetchAdzuna, adzunaConfigured } from "@/lib/sources/adzuna";
import { isRelevant } from "@/lib/sources/filter";

export type SourceRun = {
  source: string;
  found: number;
  kept: number;
  inserted: number;
  ok: boolean;
  error?: string;
};

async function gather(
  fetcher: (kw: string) => Promise<NormalizedJob[]>,
): Promise<NormalizedJob[]> {
  const batches = await Promise.all(
    INGEST_KEYWORDS.map((kw) => fetcher(kw).catch(() => [] as NormalizedJob[])),
  );
  return batches.flat();
}

export async function runIngest(): Promise<{
  runs: SourceRun[];
  total_inserted: number;
}> {
  const db = getAdmin();
  if (!db) {
    return {
      runs: [
        {
          source: "config",
          found: 0,
          kept: 0,
          inserted: 0,
          ok: false,
          error: "SUPABASE_SERVICE_ROLE_KEY manquante",
        },
      ],
      total_inserted: 0,
    };
  }

  const sources: { name: string; run: () => Promise<NormalizedJob[]> }[] = [
    { name: "apec", run: () => gather((kw) => fetchApec(kw)) },
  ];
  if (franceTravailConfigured())
    sources.push({
      name: "france_travail",
      run: () => gather((kw) => fetchFranceTravail(kw)),
    });
  if (adzunaConfigured())
    sources.push({ name: "adzuna", run: () => gather((kw) => fetchAdzuna(kw)) });

  const runs: SourceRun[] = [];
  let total_inserted = 0;

  for (const s of sources) {
    const started = new Date().toISOString();
    try {
      const jobs = await s.run();
      const map = new Map<string, NormalizedJob>();
      for (const j of jobs) if (j.external_id) map.set(j.external_id, j);
      const unique = [...map.values()];

      // Règles de pertinence : ne garder que les offres ciblées.
      const relevant = unique.filter((j) => isRelevant(j).ok);

      const { data: existing } = await db
        .from("jp_jobs")
        .select("external_id")
        .eq("source", s.name);
      const have = new Set((existing ?? []).map((e) => e.external_id));

      const toInsert = relevant
        .filter((j) => !have.has(j.external_id))
        .map((j) => ({
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
        }));

      let inserted = 0;
      if (toInsert.length) {
        const { error } = await db.from("jp_jobs").insert(toInsert);
        if (error) throw new Error(error.message);
        inserted = toInsert.length;
      }
      total_inserted += inserted;
      runs.push({
        source: s.name,
        found: unique.length,
        kept: relevant.length,
        inserted,
        ok: true,
      });
      await db.from("jp_ingest_runs").insert({
        source: s.name,
        started_at: started,
        finished_at: new Date().toISOString(),
        found: relevant.length,
        inserted,
        ok: true,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      runs.push({
        source: s.name,
        found: 0,
        kept: 0,
        inserted: 0,
        ok: false,
        error: msg,
      });
      await db.from("jp_ingest_runs").insert({
        source: s.name,
        started_at: started,
        finished_at: new Date().toISOString(),
        ok: false,
        error: msg,
      });
    }
  }
  return { runs, total_inserted };
}

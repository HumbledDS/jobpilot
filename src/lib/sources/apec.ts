import { type NormalizedJob, parseSalary } from "./types";

const APEC_ENDPOINT = "https://www.apec.fr/cms/webservices/rechercheOffre";

/**
 * APEC — public search webservice (used by apec.fr).
 * No API key required. Use politely (low frequency, daily cron).
 */
export async function fetchApec(
  keywords: string,
  opts: { salaireMin?: number; range?: number; company?: string } = {},
): Promise<NormalizedJob[]> {
  const body = {
    motsCles: opts.company ? `${keywords} ${opts.company}` : keywords,
    salaireMinimum: opts.salaireMin ?? 45,
    pagination: { startIndex: 0, range: opts.range ?? 50 },
    sorts: [{ type: "DATE", direction: "DESCENDING" }],
    activeFiltre: true,
  };

  const res = await fetch(APEC_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (JobPilot)",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`APEC ${res.status}`);

  const data = (await res.json()) as { resultats?: ApecOffer[] };
  return (data.resultats ?? []).map((o) => {
    const sal = parseSalary(o.salaireTexte);
    const num = o.numeroOffre ?? String(o.id);
    return {
      source: "apec",
      external_id: String(num),
      title: o.intitule,
      company_name: o.nomCommercial ?? null,
      location: o.lieuTexte ?? null,
      url: `https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/${num}`,
      salary_min: sal.min,
      salary_max: sal.max,
      contract_type: null,
      description: (o.texteOffre ?? "").slice(0, 2000),
      posted_at: o.datePublication ?? null,
      tags: [keywords],
      raw: o,
    } satisfies NormalizedJob;
  });
}

type ApecOffer = {
  id: number;
  numeroOffre?: string;
  intitule: string;
  nomCommercial?: string;
  lieuTexte?: string;
  salaireTexte?: string;
  texteOffre?: string;
  datePublication?: string;
};

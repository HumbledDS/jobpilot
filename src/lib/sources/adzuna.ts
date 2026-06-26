import { type NormalizedJob } from "./types";

export function adzunaConfigured() {
  return Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
}

/** Adzuna — jobs API (France). */
export async function fetchAdzuna(
  keywords: string,
  opts: { salaryMin?: number; where?: string } = {},
): Promise<NormalizedJob[]> {
  const qs = new URLSearchParams({
    app_id: process.env.ADZUNA_APP_ID!,
    app_key: process.env.ADZUNA_APP_KEY!,
    what: keywords,
    where: opts.where ?? "Île-de-France",
    results_per_page: "50",
    salary_min: String(opts.salaryMin ?? 45000),
    content_type: "application/json",
  });
  const res = await fetch(
    `https://api.adzuna.com/v1/api/jobs/fr/search/1?${qs.toString()}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error(`Adzuna ${res.status}`);

  const data = (await res.json()) as { results?: AdzunaJob[] };
  return (data.results ?? []).map((o) => ({
    source: "adzuna",
    external_id: String(o.id),
    title: o.title,
    company_name: o.company?.display_name ?? null,
    location: o.location?.display_name ?? null,
    url: o.redirect_url ?? null,
    salary_min: o.salary_min ? Math.round(o.salary_min) : null,
    salary_max: o.salary_max ? Math.round(o.salary_max) : null,
    contract_type: o.contract_type ?? null,
    description: (o.description ?? "").slice(0, 2000),
    posted_at: o.created ?? null,
    tags: [keywords],
    raw: o,
  }));
}

type AdzunaJob = {
  id: string;
  title: string;
  description?: string;
  created?: string;
  contract_type?: string;
  salary_min?: number;
  salary_max?: number;
  company?: { display_name?: string };
  location?: { display_name?: string };
  redirect_url?: string;
};

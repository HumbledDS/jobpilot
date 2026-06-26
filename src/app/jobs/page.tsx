import { getJobs } from "@/lib/db";
import { hasAdmin } from "@/lib/supabase/admin";
import {
  PageHeader,
  Card,
  SetupBanner,
  EmptyState,
  fmtSalary,
  Freshness,
  SOURCE_LABELS,
  timeAgo,
} from "@/components/ui";
import { createJob, deleteJob, applyToJob, ingestNow } from "./actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const { source } = await searchParams;
  const all = await getJobs();

  const bySource = all.reduce<Record<string, number>>((acc, j) => {
    acc[j.source] = (acc[j.source] ?? 0) + 1;
    return acc;
  }, {});
  const jobs = source ? all.filter((j) => j.source === source) : all;

  return (
    <div>
      <PageHeader
        title="Offres"
        subtitle={`${all.length} offres ciblées — règles : data/cloud/IA · Île-de-France (ou remote) · ≥ 45k quand le salaire est connu · hors alternance/stage`}
        action={
          <form action={ingestNow}>
            <button className="btn-primary">Ingérer (APEC + APIs)</button>
          </form>
        }
      />
      {!hasAdmin() && <SetupBanner />}

      {/* Source filter */}
      <div className="mb-5 flex flex-wrap gap-2">
        <Link
          href="/jobs"
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            !source ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          Toutes ({all.length})
        </Link>
        {Object.entries(bySource).map(([s, n]) => (
          <Link
            key={s}
            href={`/jobs?source=${s}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              source === s ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            {SOURCE_LABELS[s] ?? s} ({n})
          </Link>
        ))}
      </div>

      <Card className="mb-6">
        <div className="mb-3 text-sm font-semibold text-slate-700">+ Ajouter une offre</div>
        <form action={createJob} className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input name="title" required placeholder="Intitulé *" className="input" />
          <input name="company_name" placeholder="Entreprise" className="input" />
          <input name="location" placeholder="Lieu" className="input" />
          <input name="url" placeholder="URL" className="input" />
          <input name="salary_min" placeholder="Salaire (ex: 55)" className="input" />
          <select name="remote" className="input" defaultValue="">
            <option value="">Présentiel/hybride ?</option>
            <option value="onsite">Sur site</option>
            <option value="hybrid">Hybride</option>
            <option value="remote">Télétravail</option>
          </select>
          <button className="btn-primary md:col-span-3">Ajouter l&apos;offre</button>
        </form>
      </Card>

      {jobs.length === 0 ? (
        <EmptyState>
          Aucune offre. Clique sur « Ingérer » pour récupérer les offres APEC.
        </EmptyState>
      ) : (
        <div className="space-y-2">
          {jobs.map((j) => {
            const sal = fmtSalary(j.salary_min, j.salary_max);
            return (
              <Card key={j.id} className="p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Freshness postedAt={j.posted_at} />
                      <span className="text-sm font-semibold text-slate-800">{j.title}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500">
                        {SOURCE_LABELS[j.source] ?? j.source}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                      {j.company_name && <span className="font-medium text-slate-600">{j.company_name}</span>}
                      {j.location && <span>{j.location}</span>}
                      {j.remote && <span>{j.remote}</span>}
                      {j.contract_type && <span>{j.contract_type}</span>}
                      {sal && <span className="font-medium text-emerald-600">{sal}</span>}
                      <span className="text-slate-400">publiée {timeAgo(j.posted_at)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <form action={applyToJob}>
                      <input type="hidden" name="id" value={j.id} />
                      <button className="rounded bg-slate-800 px-2 py-1 text-xs text-white">
                        Candidater
                      </button>
                    </form>
                    {j.url && (
                      <a href={j.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">
                        Voir
                      </a>
                    )}
                    <form action={deleteJob}>
                      <input type="hidden" name="id" value={j.id} />
                      <button className="rounded px-2 py-1 text-xs text-rose-500 hover:bg-rose-50">×</button>
                    </form>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

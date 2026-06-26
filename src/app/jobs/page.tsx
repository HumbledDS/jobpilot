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
import { scoreLabel } from "@/lib/scoring";
import { createJob, deleteJob, applyToJob, ingestNow } from "./actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; sort?: string }>;
}) {
  const { source, sort } = await searchParams;
  const sortMode = sort === "fresh" ? "fresh" : "score";
  const all = await getJobs(sortMode);

  const bySource = all.reduce<Record<string, number>>((acc, j) => {
    acc[j.source] = (acc[j.source] ?? 0) + 1;
    return acc;
  }, {});
  const jobs = source ? all.filter((j) => j.source === source) : all;

  return (
    <div>
      <PageHeader
        title="Offres"
        subtitle={`${all.length} offres ciblées — classées par pertinence avec ton profil (data/cloud/IA · IDF · hors alternance/stage)`}
        action={
          <form action={ingestNow}>
            <button className="btn-primary">Ingérer (APEC + France Travail)</button>
          </form>
        }
      />
      {!hasAdmin() && <SetupBanner />}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-400">Trier :</span>
        <Link
          href={`/jobs${source ? `?source=${source}` : ""}`}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${sortMode === "score" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600"}`}
        >
          Pertinence
        </Link>
        <Link
          href={`/jobs?sort=fresh${source ? `&source=${source}` : ""}`}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${sortMode === "fresh" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600"}`}
        >
          Fraîcheur
        </Link>
        <span className="mx-2 text-slate-300">|</span>
        <Link
          href={`/jobs${sortMode === "fresh" ? "?sort=fresh" : ""}`}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${!source ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600"}`}
        >
          Toutes ({all.length})
        </Link>
        {Object.entries(bySource).map(([s, n]) => (
          <Link
            key={s}
            href={`/jobs?source=${s}${sortMode === "fresh" ? "&sort=fresh" : ""}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${source === s ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600"}`}
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
          Aucune offre. Clique sur « Ingérer » pour récupérer les offres.
        </EmptyState>
      ) : (
        <div className="space-y-2">
          {jobs.map((j) => {
            const sal = fmtSalary(j.salary_min, j.salary_max);
            const sl = scoreLabel(j.match_score);
            return (
              <Card key={j.id} className="p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[11px] font-bold ${sl.cls}`}
                        title="Score de matching avec ton profil"
                      >
                        {j.match_score ?? "—"} · {sl.label}
                      </span>
                      <Freshness postedAt={j.posted_at} />
                      <Link href={`/jobs/${j.id}`} className="text-sm font-semibold text-slate-800 hover:underline">
                        {j.title}
                      </Link>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500">
                        {SOURCE_LABELS[j.source] ?? j.source}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                      {j.company_name && <span className="font-medium text-slate-600">{j.company_name}</span>}
                      {j.location && <span>{j.location}</span>}
                      {j.role_family && j.role_family !== "Autre" && <span>{j.role_family}</span>}
                      {sal && <span className="font-medium text-emerald-600">{sal}</span>}
                      <span className="text-slate-400">publiée {timeAgo(j.posted_at)}</span>
                    </div>
                    {(j.matched_skills?.length || j.missing_skills?.length) ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(j.matched_skills ?? []).map((s) => (
                          <span key={s} className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-700">
                            {s}
                          </span>
                        ))}
                        {(j.missing_skills ?? []).map((s) => (
                          <span key={s} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500" title="Compétence demandée que tu n'as pas listée">
                            +{s}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <form action={applyToJob}>
                      <input type="hidden" name="id" value={j.id} />
                      <button className="rounded bg-slate-800 px-2 py-1 text-xs text-white">Candidater</button>
                    </form>
                    {j.url && (
                      <a href={j.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">Voir</a>
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

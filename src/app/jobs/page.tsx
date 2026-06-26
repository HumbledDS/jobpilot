import { getJobs, getSavedSearches } from "@/lib/db";
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
import {
  createJob,
  deleteJob,
  applyToJob,
  ingestNow,
  saveSearch,
  deleteSavedSearch,
} from "./actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

type SP = {
  q?: string;
  source?: string;
  sort?: string;
  salary?: string;
  remote?: string;
  minScore?: string;
  role?: string;
};

function hrefFor(query: Record<string, string>) {
  const p = new URLSearchParams(query);
  const s = p.toString();
  return s ? `/jobs?${s}` : "/jobs";
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const source = sp.source ?? "";
  const sortMode = sp.sort === "fresh" ? "fresh" : "score";
  const salary = sp.salary ? Number(sp.salary) : 0;
  const remote = sp.remote ?? "";
  const minScore = sp.minScore ? Number(sp.minScore) : 0;
  const role = sp.role ?? "";

  const all = await getJobs(sortMode);
  const saved = await getSavedSearches();

  const sources = [...new Set(all.map((j) => j.source))];
  const roleOptions = [
    ...new Set(
      all.map((j) => j.role_family).filter((r): r is string => !!r && r !== "Autre"),
    ),
  ].sort();

  const jobs = all.filter((j) => {
    if (q && !`${j.title} ${j.company_name ?? ""}`.toLowerCase().includes(q.toLowerCase()))
      return false;
    if (source && j.source !== source) return false;
    if (salary && (j.salary_max ?? j.salary_min ?? 0) < salary) return false;
    if (minScore && (j.match_score ?? 0) < minScore) return false;
    if (role && j.role_family !== role) return false;
    if (remote) {
      const blob = `${j.remote ?? ""} ${j.location ?? ""} ${j.title}`.toLowerCase();
      if (remote === "remote") {
        if (!/remote|t[ée]l[ée]travail|distanciel/.test(blob)) return false;
      } else if (j.remote !== remote) return false;
    }
    return true;
  });

  const activeFilters = [q, source, salary, remote, minScore, role].filter(Boolean).length;
  const currentQuery: Record<string, string> = {};
  for (const [k, v] of Object.entries({ q, source, sort: sp.sort ?? "", salary: sp.salary ?? "", remote, minScore: sp.minScore ?? "", role }))
    if (v) currentQuery[k] = String(v);

  return (
    <div>
      <PageHeader
        title="Offres"
        subtitle={`${jobs.length} offre(s)${activeFilters ? ` filtrée(s) sur ${all.length}` : " ciblées, classées par pertinence"}`}
        action={
          <form action={ingestNow}>
            <button className="btn-primary">Ingérer (3 sources)</button>
          </form>
        }
      />
      {!hasAdmin() && <SetupBanner />}

      {/* Recherche & filtres */}
      <Card className="mb-4">
        <form action="/jobs" method="get" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            name="q"
            defaultValue={q}
            placeholder="Rechercher (intitulé, entreprise)…"
            className="input sm:col-span-2 lg:col-span-4"
          />
          <select name="source" defaultValue={source} className="input">
            <option value="">Toutes les sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>{SOURCE_LABELS[s] ?? s}</option>
            ))}
          </select>
          <select name="salary" defaultValue={sp.salary ?? ""} className="input">
            <option value="">Salaire : tous</option>
            <option value="45000">≥ 45k</option>
            <option value="50000">≥ 50k</option>
            <option value="60000">≥ 60k</option>
            <option value="70000">≥ 70k</option>
          </select>
          <select name="remote" defaultValue={remote} className="input">
            <option value="">Mode : tous</option>
            <option value="onsite">Sur site</option>
            <option value="hybrid">Hybride</option>
            <option value="remote">Télétravail</option>
          </select>
          <select name="minScore" defaultValue={sp.minScore ?? ""} className="input">
            <option value="">Match : tous</option>
            <option value="40">≥ 40</option>
            <option value="55">≥ 55 (bon)</option>
            <option value="75">≥ 75 (fort)</option>
          </select>
          <select name="role" defaultValue={role} className="input">
            <option value="">Métier : tous</option>
            {roleOptions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select name="sort" defaultValue={sp.sort ?? "score"} className="input">
            <option value="score">Tri : pertinence</option>
            <option value="fresh">Tri : fraîcheur</option>
          </select>
          <div className="flex items-center gap-2">
            <button className="btn-primary">Filtrer</button>
            {activeFilters > 0 && (
              <Link href="/jobs" className="text-xs text-slate-500 hover:underline">
                Réinitialiser
              </Link>
            )}
          </div>
        </form>

        {/* Recherches sauvegardées */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <span className="text-xs text-slate-400">Sauvegardées :</span>
          {saved.length === 0 && (
            <span className="text-xs text-slate-300">aucune</span>
          )}
          {saved.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs">
              <Link href={hrefFor(s.query)} className="text-slate-700 hover:underline">{s.name}</Link>
              <form action={deleteSavedSearch}>
                <input type="hidden" name="id" value={s.id} />
                <button className="text-rose-400 hover:text-rose-600" aria-label="Supprimer">×</button>
              </form>
            </span>
          ))}
          {activeFilters > 0 && (
            <form action={saveSearch} className="ml-auto flex items-center gap-1">
              {Object.entries(currentQuery).map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
              <input name="name" required placeholder="Nom de la recherche" className="rounded border border-slate-200 px-2 py-1 text-xs" />
              <button className="rounded bg-slate-800 px-2 py-1 text-xs text-white">Sauvegarder</button>
            </form>
          )}
        </div>
      </Card>

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
          {activeFilters
            ? "Aucune offre ne correspond à ces filtres."
            : "Aucune offre. Clique sur « Ingérer » pour récupérer les offres."}
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
                      <Link href={`/jobs/${j.id}`} className="break-words text-sm font-semibold text-slate-800 hover:underline">
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
                  <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-100 pt-2 md:border-0 md:pt-0">
                    <form action={applyToJob}>
                      <input type="hidden" name="id" value={j.id} />
                      <button className="rounded bg-slate-800 px-3 py-1.5 text-xs text-white">Candidater</button>
                    </form>
                    {j.url && (
                      <a href={j.url} target="_blank" rel="noreferrer" className="rounded px-3 py-1.5 text-xs text-blue-600 underline">Voir</a>
                    )}
                    <form action={deleteJob} className="ml-auto md:ml-0">
                      <input type="hidden" name="id" value={j.id} />
                      <button className="rounded px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-50" aria-label="Supprimer">×</button>
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

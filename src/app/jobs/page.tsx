import { getJobs, getSavedSearches, getTargetCompanies } from "@/lib/db";
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
  growth?: string;
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
  const growthMin = sp.growth ? Number(sp.growth) : 0;

  const [all, saved, targets] = await Promise.all([
    getJobs(sortMode),
    getSavedSearches(),
    getTargetCompanies(),
  ]);

  // Croissance de CA par entreprise (CAGR sinon YoY) pour filtrer les offres.
  const growthTargets = targets
    .map((t) => ({ n: t.name.toLowerCase(), g: t.ca_cagr ?? t.ca_growth }))
    .filter((t): t is { n: string; g: number } => t.g != null);
  const companyGrowth = (name: string | null): number | null => {
    if (!name) return null;
    const c = name.toLowerCase();
    const hit = growthTargets.find((t) => c.includes(t.n) || t.n.includes(c));
    return hit ? hit.g : null;
  };

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
    if (growthMin) {
      const g = companyGrowth(j.source_company ?? j.company_name);
      if (g == null || g < growthMin) return false;
    }
    if (remote) {
      const blob = `${j.remote ?? ""} ${j.location ?? ""} ${j.title}`.toLowerCase();
      if (remote === "remote") {
        if (!/remote|t[ée]l[ée]travail|distanciel/.test(blob)) return false;
      } else if (j.remote !== remote) return false;
    }
    return true;
  });

  const activeFilters = [q, source, salary, remote, minScore, role, growthMin].filter(Boolean).length;
  const currentQuery: Record<string, string> = {};
  for (const [k, v] of Object.entries({ q, source, sort: sp.sort ?? "", salary: sp.salary ?? "", remote, minScore: sp.minScore ?? "", role, growth: sp.growth ?? "" }))
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
        <form action="/jobs" method="get" className="flex flex-col gap-3">
          {/* Ligne 1 : recherche proéminente + actions */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                name="q"
                defaultValue={q}
                placeholder="Rechercher un intitulé ou une entreprise…"
                className="input w-full pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-primary">Filtrer</button>
              {activeFilters > 0 && (
                <Link
                  href="/jobs"
                  className="rounded-md px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                >
                  Réinitialiser
                </Link>
              )}
            </div>
          </div>

          {/* Ligne 2 : filtres groupés */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
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
            <select name="growth" defaultValue={sp.growth ?? ""} className="input">
              <option value="">Croissance : toutes</option>
              <option value="1">CA en croissance</option>
              <option value="15">CA +15%/an</option>
              <option value="30">CA +30%/an</option>
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
          </div>
        </form>

        {/* Recherches sauvegardées */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <span className="text-xs font-medium text-slate-400">Recherches sauvegardées</span>
          {saved.length === 0 && (
            <span className="text-xs text-slate-300">aucune pour l&apos;instant</span>
          )}
          {saved.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 py-1 pl-3 pr-1.5 text-xs">
              <Link href={hrefFor(s.query)} className="font-medium text-slate-700 hover:text-slate-900">{s.name}</Link>
              <form action={deleteSavedSearch}>
                <input type="hidden" name="id" value={s.id} />
                <button className="flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:bg-rose-100 hover:text-rose-600" aria-label="Supprimer">×</button>
              </form>
            </span>
          ))}
          {activeFilters > 0 && (
            <form action={saveSearch} className="ml-auto flex items-center gap-1">
              {Object.entries(currentQuery).map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
              <input name="name" required placeholder="Nom de la recherche" className="rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-slate-400 focus:outline-none" />
              <button className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">Sauvegarder</button>
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
        <div className="space-y-2.5">
          {jobs.map((j) => {
            const sal = fmtSalary(j.salary_min, j.salary_max);
            const sl = scoreLabel(j.match_score);
            const isTop = (j.match_score ?? 0) >= 75;
            return (
              <Card
                key={j.id}
                className={`p-4 transition-colors hover:border-slate-300 ${
                  isTop ? "border-emerald-200 bg-emerald-50/30" : ""
                }`}
              >
                <div className="flex gap-3">
                  {/* Pastille de score */}
                  <div
                    className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border text-center font-bold ${sl.cls}`}
                    title="Score de matching avec ton profil"
                  >
                    <span className="text-base leading-none">{j.match_score ?? "—"}</span>
                    <span className="mt-0.5 text-[9px] font-semibold uppercase leading-none opacity-80">{sl.label}</span>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/jobs/${j.id}`} className="break-words text-sm font-semibold text-slate-800 hover:text-slate-950 hover:underline">
                          {j.title}
                        </Link>
                        {isTop && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                            Top match
                          </span>
                        )}
                        {j.from_target && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent" title={`Offre émise directement par ${j.source_company ?? "une entreprise cible"}`}>
                            Directe
                          </span>
                        )}
                        <Freshness postedAt={j.posted_at} />
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500">
                          {SOURCE_LABELS[j.source] ?? j.source}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                        {j.company_name && <span className="font-semibold text-slate-700">{j.company_name}</span>}
                        {j.location && <span>{j.location}</span>}
                        {j.role_family && j.role_family !== "Autre" && <span>{j.role_family}</span>}
                        {sal && <span className="font-semibold text-emerald-600">{sal}</span>}
                        <span className="text-slate-400">publiée {timeAgo(j.posted_at)}</span>
                      </div>
                      {(j.matched_skills?.length || j.missing_skills?.length) ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(j.matched_skills ?? []).map((s) => (
                            <span key={s} className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700" title="Compétence que tu maîtrises">
                              {s}
                            </span>
                          ))}
                          {(j.missing_skills ?? []).map((s) => (
                            <span key={s} className="rounded border border-dashed border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-400" title="Compétence demandée que tu n'as pas listée">
                              +{s}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-100 pt-2 md:border-0 md:pt-0">
                      <form action={applyToJob}>
                        <input type="hidden" name="id" value={j.id} />
                        <button className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">Candidater</button>
                      </form>
                      {j.url && (
                        <a href={j.url} target="_blank" rel="noreferrer" className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Voir</a>
                      )}
                      <form action={deleteJob} className="ml-auto md:ml-0">
                        <input type="hidden" name="id" value={j.id} />
                        <button className="rounded-md px-2.5 py-1.5 text-xs text-rose-500 hover:bg-rose-50" aria-label="Supprimer">×</button>
                      </form>
                    </div>
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

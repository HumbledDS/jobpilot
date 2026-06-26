import { getJobs, getProfile } from "@/lib/db";
import { hasAdmin } from "@/lib/supabase/admin";
import { PageHeader, Card, SetupBanner, EmptyState, fmtSalary } from "@/components/ui";
import { skillDemand, roleDemand, salaryStats } from "@/lib/analytics";
import { scoreLabel } from "@/lib/scoring";

export const dynamic = "force-dynamic";

const TARGET_FAMILIES = new Set([
  "Data Engineer", "Analytics Engineer", "Cloud Engineer", "Data Platform",
  "Solutions / FDE", "ML / AI Engineer", "Data Architect", "Lead / Head of Data",
]);

export default async function MarchePage() {
  const [jobs, profile] = await Promise.all([getJobs("score"), getProfile()]);
  const profileSkills = new Set(profile?.skills ?? []);

  const demand = skillDemand(jobs);
  const roles = roleDemand(jobs);
  const sal = salaryStats(jobs);
  const maxDemand = demand[0]?.count ?? 1;

  // Compétences à développer : très demandées et absentes du profil.
  const gaps = demand.filter((d) => !profileSkills.has(d.skill)).slice(0, 8);
  // Top suggestions : meilleures offres par score.
  const topMatches = jobs.slice(0, 5);

  return (
    <div>
      <PageHeader
        title="Marché & matching"
        subtitle={`Analyse de ${jobs.length} offres ciblées : tendances, compétences à développer, métiers à explorer`}
      />
      {!hasAdmin() && <SetupBanner />}

      {jobs.length === 0 ? (
        <EmptyState>Ingère des offres pour générer l&apos;analyse.</EmptyState>
      ) : (
        <div className="space-y-6">
          {/* Profil */}
          <Card>
            <div className="mb-1 text-sm font-semibold text-slate-700">Ton profil</div>
            <div className="text-xs text-slate-500">{profile?.headline}</div>
            <div className="mt-3 flex flex-wrap gap-1">
              {(profile?.skills ?? []).map((s) => (
                <span key={s} className="rounded bg-slate-900 px-1.5 py-0.5 text-[11px] text-white">{s}</span>
              ))}
            </div>
          </Card>

          {/* Suggestions */}
          <Card>
            <div className="mb-3 text-sm font-semibold text-slate-700">
              Top suggestions (meilleur match avec ton profil)
            </div>
            <div className="space-y-2">
              {topMatches.map((j) => {
                const sl = scoreLabel(j.match_score);
                return (
                  <div key={j.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-0">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-800">{j.title}</div>
                      <div className="text-xs text-slate-500">
                        {j.company_name} {j.location ? `· ${j.location}` : ""} {fmtSalary(j.salary_min, j.salary_max) ? `· ${fmtSalary(j.salary_min, j.salary_max)}` : ""}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`rounded border px-1.5 py-0.5 text-[11px] font-bold ${sl.cls}`}>{j.match_score} · {sl.label}</span>
                      {j.url && <a href={j.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">Voir</a>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Compétences demandées */}
            <Card>
              <div className="mb-3 text-sm font-semibold text-slate-700">
                Compétences les plus demandées
              </div>
              <div className="space-y-1.5">
                {demand.slice(0, 14).map((d) => {
                  const has = profileSkills.has(d.skill);
                  return (
                    <div key={d.skill} className="flex items-center gap-2">
                      <div className="w-40 truncate text-xs text-slate-600">
                        {d.skill}{" "}
                        {has ? (
                          <span className="text-emerald-600">(acquis)</span>
                        ) : (
                          <span className="text-rose-500">(à acquérir)</span>
                        )}
                      </div>
                      <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100">
                        <div
                          className={`h-full rounded ${has ? "bg-emerald-500" : "bg-slate-400"}`}
                          style={{ width: `${(d.count / maxDemand) * 100}%` }}
                        />
                      </div>
                      <div className="w-8 text-right text-xs text-slate-500">{d.count}</div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* À développer + salaires */}
            <div className="space-y-6">
              <Card>
                <div className="mb-3 text-sm font-semibold text-slate-700">
                  Compétences à développer (demandées, hors de ton profil)
                </div>
                {gaps.length === 0 ? (
                  <div className="text-xs text-slate-400">Ton profil couvre déjà le top du marché.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {gaps.map((g) => (
                      <span key={g.skill} className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700">
                        {g.skill} · {g.count} offres
                      </span>
                    ))}
                  </div>
                )}
              </Card>

              <Card>
                <div className="mb-2 text-sm font-semibold text-slate-700">Salaires (offres avec salaire affiché)</div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div><div className="text-2xl font-bold text-slate-900">{sal.min ? `${Math.round(sal.min / 1000)}k` : "—"}</div><div className="text-[11px] text-slate-400">min</div></div>
                  <div><div className="text-2xl font-bold text-slate-900">{sal.median ? `${Math.round(sal.median / 1000)}k` : "—"}</div><div className="text-[11px] text-slate-400">médian</div></div>
                  <div><div className="text-2xl font-bold text-slate-900">{sal.max ? `${Math.round(sal.max / 1000)}k` : "—"}</div><div className="text-[11px] text-slate-400">max</div></div>
                </div>
                <div className="mt-2 text-center text-[11px] text-slate-400">{sal.n} offres avec salaire</div>
              </Card>
            </div>
          </div>

          {/* Métiers du marché */}
          <Card>
            <div className="mb-3 text-sm font-semibold text-slate-700">
              Métiers du marché (volume & salaire moyen) — explore ceux hors de ta cible
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {roles.filter((r) => r.role !== "Autre").map((r) => {
                const target = TARGET_FAMILIES.has(r.role);
                return (
                  <div key={r.role} className={`rounded-lg border p-3 ${target ? "border-slate-200 bg-white" : "border-violet-200 bg-violet-50"}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-800">{r.role}</span>
                      <span className="text-xs text-slate-400">{r.count}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {r.avgSalary ? `~${Math.round(r.avgSalary / 1000)}k moy.` : "salaire n.c."}
                      {!target && <span className="ml-1 text-violet-600">· à explorer</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

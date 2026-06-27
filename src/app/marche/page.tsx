import { getJobs, getProfile, getTargetCompanies } from "@/lib/db";
import { hasAdmin } from "@/lib/supabase/admin";
import { PageHeader, Card, SetupBanner, EmptyState, fmtSalary } from "@/components/ui";
import { skillDemand, roleDemand, salaryStats, offerSegments, nafSector } from "@/lib/analytics";
import { scoreLabel } from "@/lib/scoring";
import type { Company } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

const TARGET_FAMILIES = new Set([
  "Data Engineer", "Analytics Engineer", "Cloud Engineer", "Data Platform",
  "Solutions / FDE", "ML / AI Engineer", "Data Architect", "Lead / Head of Data",
]);

function fmtCA(v?: number | null): string | null {
  if (v == null) return null;
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(1)} Md€`;
  if (Math.abs(v) >= 1e6) return `${Math.round(v / 1e6)} M€`;
  return `${Math.round(v / 1e3)} k€`;
}

export default async function MarchePage() {
  const [jobs, profile, targets] = await Promise.all([
    getJobs("score"),
    getProfile(),
    getTargetCompanies(),
  ]);
  const profileSkills = new Set(profile?.skills ?? []);

  const demand = skillDemand(jobs);
  const roles = roleDemand(jobs);
  const sal = salaryStats(jobs);
  const maxDemand = demand[0]?.count ?? 1;

  // Compétences à développer : très demandées et absentes du profil.
  const gaps = demand.filter((d) => !profileSkills.has(d.skill)).slice(0, 8);
  // Top suggestions : meilleures offres par score.
  const topMatches = jobs.slice(0, 5);

  // Insight de tête
  const top10 = demand.slice(0, 10);
  const covered = top10.filter((d) => profileSkills.has(d.skill)).length;
  const coverPct = top10.length ? Math.round((covered / top10.length) * 100) : 0;
  const topRole = roles.find((r) => r.role !== "Autre");
  const topGap = gaps[0]?.skill;

  // --- Croisement enrichissement (INSEE/Pappers/NAF) + offres internes ---
  const seg = offerSegments(
    jobs,
    targets.map((t) => ({ name: t.name, category: t.category })),
  );
  const findComp = (name: string): Company | undefined => {
    const c = name.toLowerCase();
    return targets.find((t) => {
      const n = t.name.toLowerCase();
      return c === n || c.includes(n) || n.includes(c);
    });
  };
  // Marché interne : offres directes groupées par entreprise + assise.
  const directMap = new Map<string, { count: number; comp?: Company }>();
  for (const j of jobs.filter((x) => x.from_target)) {
    const name = j.source_company ?? j.company_name ?? "?";
    const e = directMap.get(name) ?? { count: 0, comp: findComp(name) };
    e.count++;
    directMap.set(name, e);
  }
  const directList = [...directMap.entries()]
    .map(([name, e]) => ({ name, ...e }))
    .sort((a, b) => b.count - a.count);
  // Secteurs (NAF) derrière les postes internes.
  const sectorMap = new Map<string, number>();
  for (const d of directList) {
    const s = nafSector(d.comp?.naf_code);
    if (s) sectorMap.set(s, (sectorMap.get(s) ?? 0) + d.count);
  }
  const sectors = [...sectorMap.entries()].sort((a, b) => b[1] - a[1]);
  const maxSector = sectors[0]?.[1] ?? 1;

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
          {/* Insight de tête */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card className="md:col-span-2">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">À retenir</div>
              <p className="mt-1 text-sm text-slate-700">
                Tu couvres <strong>{coverPct}%</strong> des {top10.length} compétences les plus demandées.
                {topRole && <> Le métier le plus offert : <strong>{topRole.role}</strong>{topRole.avgSalary ? ` (~${Math.round(topRole.avgSalary / 1000)}k)` : ""}.</>}
                {topGap && <> Priorité à monter : <strong>{topGap}</strong>.</>}
                {seg.etabli > 0 && (
                  <> <strong>{seg.pctEtabli}%</strong> des offres viennent d&apos;employeurs établis, <strong>{seg.pctInter}%</strong> d&apos;intermédiaires (ESN/freelance) ; <strong>{seg.direct}</strong> postes internes sourcés en direct.</>
                )}
              </p>
            </Card>
            <Card>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Employeurs établis</div>
              <div className="mt-1 text-3xl font-bold text-emerald-700">{seg.pctEtabli}%</div>
              <div className="text-[11px] text-slate-400">{seg.intermediaire} via intermédiaires</div>
            </Card>
            <Card>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Salaire médian</div>
              <div className="mt-1 text-3xl font-bold text-slate-900">{sal.median ? `${Math.round(sal.median / 1000)}k` : "—"}</div>
              <div className="text-[11px] text-slate-400">{sal.n} offres chiffrées</div>
            </Card>
          </div>

          {/* Marché interne + secteurs (croisement enrichissement + offres directes) */}
          {directList.length > 0 && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <div className="mb-1 text-sm font-semibold text-slate-700">
                  Marché interne — postes en entreprise (offres directes)
                </div>
                <div className="mb-3 text-xs text-slate-500">
                  Sourcés sur les ATS des entreprises (pas d&apos;intermédiaire), avec leur assise réelle (catégorie, effectifs, CA).
                </div>
                <div className="space-y-1.5">
                  {directList.slice(0, 12).map((d) => {
                    const c = d.comp;
                    return (
                      <div key={d.name} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-200 p-2">
                        <span className="min-w-0 flex-1 break-words text-sm font-medium text-slate-800">{d.name}</span>
                        <span className="text-xs text-slate-500">{d.count} poste(s)</span>
                        {c?.categorie_entreprise && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">{c.categorie_entreprise}</span>
                        )}
                        {c?.effectif_label && <span className="hidden text-xs text-slate-400 sm:inline">{c.effectif_label} sal.</span>}
                        {fmtCA(c?.ca) && <span className="text-xs font-medium text-emerald-600">CA {fmtCA(c?.ca)}</span>}
                        {(c?.ca_cagr ?? c?.ca_growth) != null && (() => {
                          const g = (c?.ca_cagr ?? c?.ca_growth) as number;
                          return (
                            <span className={`text-[11px] ${g > 0 ? "text-emerald-600" : "text-rose-500"}`}>
                              {g > 0 ? "+" : ""}{g}%{c?.ca_cagr != null ? "/an" : ""}
                            </span>
                          );
                        })()}
                        <Link href={`/jobs?q=${encodeURIComponent(d.name)}`} className="text-xs text-accent underline">voir</Link>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card>
                <div className="mb-3 text-sm font-semibold text-slate-700">Secteurs qui recrutent</div>
                {sectors.length === 0 ? (
                  <div className="text-xs text-slate-400">Enrichis les entreprises pour révéler les secteurs.</div>
                ) : (
                  <div className="space-y-1.5">
                    {sectors.slice(0, 10).map(([name, n]) => (
                      <div key={name} className="flex items-center gap-2">
                        <div className="w-28 shrink-0 truncate text-xs text-slate-600">{name}</div>
                        <div className="h-3.5 min-w-0 flex-1 overflow-hidden rounded bg-slate-100">
                          <div className="h-full rounded bg-slate-700" style={{ width: `${(n / maxSector) * 100}%` }} />
                        </div>
                        <div className="w-6 text-right text-xs text-slate-500">{n}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

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
                      {j.url && <a href={j.url} target="_blank" rel="noreferrer" className="text-xs text-accent underline">Voir</a>}
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
                      <div className="w-28 shrink-0 truncate text-xs text-slate-600 sm:w-40">
                        {d.skill}{" "}
                        {has ? (
                          <span className="text-emerald-600">(acquis)</span>
                        ) : (
                          <span className="text-rose-500">(à acquérir)</span>
                        )}
                      </div>
                      <div className="h-4 min-w-0 flex-1 overflow-hidden rounded bg-slate-100">
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

import {
  getApplications,
  getJobs,
  getContacts,
  getSkillProjects,
  getRecentIngestRuns,
  getSettings,
  getPosts,
  getProfile,
  getTargetCompanies,
  getCoachTasks,
} from "@/lib/db";
import { hasAdmin } from "@/lib/supabase/admin";
import {
  PageHeader,
  StatCard,
  Card,
  SetupBanner,
  EmptyState,
  SOURCE_LABELS,
  timeAgo,
} from "@/components/ui";
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
  type ApplicationStatus,
} from "@/lib/types";
import { skillDemand, companiesHiring } from "@/lib/analytics";
import { buildRecommendations, doneInWindow } from "@/lib/coach";
import { aiEnabled } from "@/lib/ai";
import {
  completeRecommendation,
  addCustomTask,
  completeTask,
  deleteTask,
  generateAiFocus,
} from "./_coach/actions";
import Link from "next/link";

const CADENCE_LABEL: Record<string, string> = {
  daily: "quotidien",
  weekly: "hebdo",
  once: "ponctuel",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [apps, jobs, contacts, projects, ingestRuns, settings, posts, profile, targets, coachTasks] =
    await Promise.all([
      getApplications(),
      getJobs(),
      getContacts(),
      getSkillProjects(),
      getRecentIngestRuns(),
      getSettings(),
      getPosts(),
      getProfile(),
      getTargetCompanies(),
      getCoachTasks(),
    ]);

  const weekAgo = Date.now() - 7 * 86400000;
  const appsThisWeek = apps.filter(
    (a) => new Date(a.created_at).getTime() >= weekAgo,
  ).length;
  const postsThisWeek = posts.filter(
    (p) => p.published_at && new Date(p.published_at).getTime() >= weekAgo,
  ).length;

  const ALL_SOURCES = ["apec", "france_travail", "adzuna", "manual"];
  const jobsBySource = (s: string) => jobs.filter((j) => j.source === s).length;
  const lastRun = (s: string) =>
    ingestRuns.find((r) => r.source === s && r.finished_at)?.finished_at ?? null;

  const byStatus = (s: ApplicationStatus) =>
    apps.filter((a) => a.status === s).length;

  const sent = apps.filter((a) =>
    ["postule", "relance", "entretien", "offre", "refuse", "sans_reponse"].includes(
      a.status,
    ),
  ).length;
  const interviews = byStatus("entretien") + byStatus("offre");
  const responseRate = sent ? Math.round((interviews / sent) * 100) : 0;

  const upcoming = apps
    .filter((a) => a.next_action_at)
    .sort((a, b) => (a.next_action_at! < b.next_action_at! ? -1 : 1))
    .slice(0, 6);

  const projectsDone = projects.filter(
    (p) => p.status === "deployed" || p.status === "done",
  ).length;

  const freshWindow = Date.now() - 2 * 86400000;
  const freshJobs = jobs.filter(
    (j) => j.posted_at && new Date(j.posted_at).getTime() >= freshWindow,
  ).length;

  // --- Coach : contexte -> recommandations -> suivi ---
  const profileSkills = new Set(profile?.skills ?? []);
  const topGapSkill =
    skillDemand(jobs).find((d) => !profileSkills.has(d.skill))?.skill ?? null;
  const hiring = companiesHiring(
    jobs,
    targets.map((t) => ({
      name: t.name,
      category: t.category,
      categorieEntreprise: t.categorie_entreprise,
      caGrowth: t.ca_growth,
      caCagr: t.ca_cagr,
      ca: t.ca,
      effectifLabel: t.effectif_label,
      effectifCode: t.effectif_code,
    })),
  );
  const topCompany =
    hiring.find((h) => h.trust === "solide" || h.trust === "ok")?.company ??
    hiring[0]?.company ??
    null;
  // Boîtes établies, en croissance, qui recrutent.
  const growthHiring = hiring
    .filter(
      (h) =>
        (h.trust === "solide" || h.trust === "ok") &&
        (h.caCagr ?? h.caGrowth) != null &&
        (h.caCagr ?? h.caGrowth)! > 0,
    )
    .sort((a, b) => (b.caCagr ?? b.caGrowth ?? 0) - (a.caCagr ?? a.caGrowth ?? 0))
    .slice(0, 6);
  const pendingFollowups = apps.filter(
    (a) =>
      (a.status === "postule" || a.status === "relance") &&
      new Date(a.updated_at).getTime() < weekAgo,
  ).length;

  const recs = buildRecommendations({
    appsThisWeek,
    weeklyAppGoal: settings.weekly_application_goal,
    postsThisWeek,
    weeklyPostGoal: settings.weekly_post_goal,
    pendingFollowups,
    strongMatches: jobs.filter((j) => (j.match_score ?? 0) >= 75).length,
    topGapSkill,
    inProgressProjects: projects.filter((p) => p.status === "in_progress").length,
    remainingProjects: projects.filter(
      (p) => p.status !== "deployed" && p.status !== "done",
    ).length,
    topCompany,
    responseRate,
    sentTotal: sent,
  });

  const completedAt = new Map<string, string>();
  for (const t of coachTasks) {
    if (t.status === "done" && t.done_at) {
      const ex = completedAt.get(t.key);
      if (!ex || t.done_at > ex) completedAt.set(t.key, t.done_at);
    }
  }
  const activeRecs = recs.filter(
    (r) => !doneInWindow(r.cadence, completedAt.get(r.key)),
  );
  const doneRecsCount = recs.length - activeRecs.length;
  const aiTasks = coachTasks.filter((t) => t.status === "todo" && t.key.startsWith("ai:"));
  const customTodos = coachTasks.filter(
    (t) => t.status === "todo" && !t.key.startsWith("ai:"),
  );
  const dailyRecs = activeRecs.filter((r) => r.cadence === "daily");
  const weeklyRecs = activeRecs.filter((r) => r.cadence === "weekly");

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Vue d'ensemble de ta recherche d'emploi data / cloud / IA"
      />
      {!hasAdmin() && <SetupBanner />}

      {/* Hero insight — one-sentence state of the search */}
      <p className="mb-6 text-sm text-muted">
        <span className="mono tnum font-semibold text-ink">{apps.length}</span>{" "}
        candidature{apps.length > 1 ? "s" : ""}
        {" · "}taux de réponse{" "}
        <span className="mono tnum font-semibold text-accent">{responseRate}%</span>
        {" · "}
        <span className="mono tnum font-semibold text-ink">{jobs.length}</span> offre
        {jobs.length > 1 ? "s" : ""} ciblée{jobs.length > 1 ? "s" : ""}
        {freshJobs > 0 && (
          <>
            {" "}dont{" "}
            <span className="mono tnum font-semibold text-ink">{freshJobs}</span>{" "}
            fraîche{freshJobs > 1 ? "s" : ""}
          </>
        )}
        .
      </p>

      {/* Coach — focus piloté par le contexte */}
      <Card className="mb-6 border-accent/25 bg-accent-soft/40">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <div className="eyebrow text-accent-strong">Coach</div>
            <div className="mt-1.5 text-sm font-semibold text-ink">Focus du moment</div>
            <div className="text-xs text-muted">
              Priorités calées sur ton marché, tes candidatures et tes projets.
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {doneRecsCount > 0 && (
              <span className="mono rounded-full bg-accent-soft px-2 py-1 text-[11px] font-medium text-accent-strong">
                {doneRecsCount} fait{doneRecsCount > 1 ? "s" : ""}
              </span>
            )}
            {aiEnabled() && (
              <form action={generateAiFocus}>
                <button className="btn-ghost text-xs">
                  {aiTasks.length ? "Régénérer le focus IA" : "Focus IA"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Focus généré par l'IA */}
        {aiTasks.length > 0 && (
          <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50/40 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-500">
              Focus IA
              <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-600">personnalisé</span>
            </div>
            <ul className="space-y-2">
              {aiTasks.map((t) => (
                <li key={t.id} className="rounded-lg border border-violet-100 bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-600">{t.category}</span>
                        <span className="text-[10px] text-slate-400">{CADENCE_LABEL[t.cadence]}</span>
                        <span className="text-sm font-medium text-slate-800">{t.label}</span>
                      </div>
                      {t.rationale && <p className="mt-1 text-xs text-slate-500">{t.rationale}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <form action={completeTask}>
                        <input type="hidden" name="id" value={t.id} />
                        <button className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700">Fait</button>
                      </form>
                      <form action={deleteTask}>
                        <input type="hidden" name="id" value={t.id} />
                        <button className="rounded px-1 text-xs text-rose-400 hover:bg-rose-50" aria-label="Supprimer">×</button>
                      </form>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeRecs.length === 0 ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            Tout est à jour pour le moment. Beau travail — reviens plus tard pour le prochain focus.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              { items: dailyRecs, title: "Aujourd'hui" },
              { items: weeklyRecs, title: "Cette semaine" },
            ].map(
              (g) =>
                g.items.length > 0 && (
                  <div key={g.title}>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {g.title}
                    </div>
                    <ul className="space-y-2">
                      {g.items.map((r) => (
                        <li key={r.key} className="rounded-lg border border-slate-200 bg-white p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                                  {r.category}
                                </span>
                                <span className="text-sm font-medium text-slate-800">{r.label}</span>
                              </div>
                              <p className="mt-1 text-xs text-slate-500">{r.rationale}</p>
                              {r.href && (
                                <Link href={r.href} className="mt-1 inline-block text-xs text-accent underline">
                                  Y aller
                                </Link>
                              )}
                            </div>
                            <form action={completeRecommendation} className="shrink-0">
                              <input type="hidden" name="key" value={r.key} />
                              <input type="hidden" name="label" value={r.label} />
                              <input type="hidden" name="category" value={r.category} />
                              <input type="hidden" name="cadence" value={r.cadence} />
                              <input type="hidden" name="rationale" value={r.rationale} />
                              <button className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700">
                                Fait
                              </button>
                            </form>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ),
            )}
          </div>
        )}

        {/* Tâches perso */}
        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Mes tâches
          </div>
          {customTodos.length > 0 && (
            <ul className="mb-2 space-y-1.5">
              {customTodos.map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1 break-words text-slate-700">{t.label}</span>
                  <span className="text-[10px] text-slate-400">{CADENCE_LABEL[t.cadence]}</span>
                  <form action={completeTask}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className="rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-600 hover:bg-emerald-50 hover:text-emerald-700">
                      Fait
                    </button>
                  </form>
                  <form action={deleteTask}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className="rounded px-1 text-xs text-rose-400 hover:bg-rose-50" aria-label="Supprimer">
                      ×
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <form action={addCustomTask} className="flex flex-wrap items-center gap-2">
            <input name="label" placeholder="Ajouter une tâche perso…" className="input min-w-0 flex-1" />
            <select name="cadence" defaultValue="weekly" className="input w-auto">
              <option value="daily">Quotidien</option>
              <option value="weekly">Hebdo</option>
              <option value="once">Ponctuel</option>
            </select>
            <button className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-white">Ajouter</button>
          </form>
        </div>
      </Card>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Candidatures" value={apps.length} hint={`${sent} envoyées`} />
        <StatCard label="Entretiens" value={interviews} />
        <Card className="min-w-0 border-emerald-200 bg-emerald-50/40">
          <div className="truncate text-xs font-medium uppercase tracking-wide text-emerald-600">
            Taux de réponse
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700 sm:text-3xl">
            {responseRate}%
          </div>
          <div className="mt-1 text-xs text-emerald-600/70">
            entretien+ / envoyées
          </div>
        </Card>
        <StatCard label="Offres reçues" value={byStatus("offre")} />
      </div>

      {/* Boîtes en croissance qui recrutent */}
      {growthHiring.length > 0 && (
        <Card className="mt-6">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-700">Boîtes en croissance qui recrutent</span>
            <Link href="/companies" className="text-xs text-accent underline">toutes les entreprises</Link>
          </div>
          <div className="mb-3 text-xs text-slate-500">
            Employeurs établis, en croissance de CA (comptes INPI), avec des offres en cours — les meilleures cibles.
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {growthHiring.map((h) => {
              const g = (h.caCagr ?? h.caGrowth) as number;
              const caTxt =
                h.ca == null ? null : Math.abs(h.ca) >= 1e9 ? `${(h.ca / 1e9).toFixed(1)} Md€` : `${Math.round(h.ca / 1e6)} M€`;
              return (
                <Link
                  key={h.company}
                  href={`/jobs?q=${encodeURIComponent(h.company)}`}
                  className="rounded-lg border border-slate-200 p-3 hover:border-emerald-300 hover:bg-emerald-50/30"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 break-words text-sm font-medium text-slate-800">{h.company}</span>
                    <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">+{g}%/an</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-slate-500">
                    <span>{h.offers} offre(s)</span>
                    {caTxt && <span>· CA {caTxt}</span>}
                    {h.effectifLabel && <span className="hidden sm:inline">· {h.effectifLabel} sal.</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      {/* Cadence + Pipeline + Prochaines actions */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <div className="mb-4 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-700">
            Cadence cette semaine
          </div>
          <div className="space-y-4">
            {[
              { label: "Candidatures", n: appsThisWeek, goal: settings.weekly_application_goal },
              { label: "Posts publiés", n: postsThisWeek, goal: settings.weekly_post_goal },
            ].map((c) => {
              const pct = c.goal ? Math.min(100, Math.round((c.n / c.goal) * 100)) : 0;
              return (
                <div key={c.label}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-slate-500">{c.label}</span>
                    <span className="font-medium text-slate-700">{c.n} / {c.goal}</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : "bg-slate-700"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="mb-4 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-700">
            Pipeline des candidatures
          </div>
          {apps.length === 0 ? (
            <EmptyState>
              Aucune candidature.{" "}
              <Link href="/applications" className="text-slate-900 underline">
                Ajoute-en une
              </Link>
              .
            </EmptyState>
          ) : (
            <div className="space-y-2.5">
              {APPLICATION_STATUSES.map((s) => {
                const n = byStatus(s);
                const pct = apps.length ? (n / apps.length) * 100 : 0;
                return (
                  <div key={s} className="flex items-center gap-2 sm:gap-3">
                    <div className="w-20 shrink-0 text-xs text-slate-500 sm:w-28">
                      {STATUS_LABELS[s]}
                    </div>
                    <div className="h-4 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${n > 0 ? "bg-slate-700" : ""}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="w-8 text-right text-xs font-semibold text-slate-700">
                      {n}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Prochaines actions */}
      <Card className="mt-6">
        <div className="mb-4 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-700">
          Prochaines actions
        </div>
        {upcoming.length === 0 ? (
          <EmptyState>Rien de planifié.</EmptyState>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-slate-200 p-3 text-sm"
              >
                <div className="font-medium break-words text-slate-800">
                  {a.jp_jobs?.title ?? "Candidature"}
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
                  <span
                    className={`rounded border px-1.5 py-0.5 ${STATUS_COLORS[a.status]}`}
                  >
                    {STATUS_LABELS[a.status]}
                  </span>
                  <span>
                    {new Date(a.next_action_at!).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Sources d'offres */}
      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="text-sm font-semibold text-slate-700">
            Sources d&apos;offres
          </div>
          <div className="text-xs text-slate-400">{jobs.length} offres au total</div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {ALL_SOURCES.map((s) => {
            const n = jobsBySource(s);
            const last = lastRun(s);
            return (
              <div key={s} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {SOURCE_LABELS[s] ?? s}
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-900">{n}</div>
                <div className="mt-1 text-[11px] text-slate-400">
                  {s === "manual"
                    ? "saisie manuelle"
                    : last
                      ? `ingéré ${timeAgo(last)}`
                      : "jamais ingéré"}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Secondary KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Offres en base" value={jobs.length} />
        <StatCard label="Contacts" value={contacts.length} />
        <StatCard label="Projets faits" value={`${projectsDone}/${projects.length}`} />
        <StatCard label="Objectif" value="50k€+" hint="IDF · data/cloud/IA" />
      </div>
    </div>
  );
}

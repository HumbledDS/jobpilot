import {
  getApplications,
  getJobs,
  getContacts,
  getSkillProjects,
  getRecentIngestRuns,
  getSettings,
  getPosts,
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
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [apps, jobs, contacts, projects, ingestRuns, settings, posts] =
    await Promise.all([
      getApplications(),
      getJobs(),
      getContacts(),
      getSkillProjects(),
      getRecentIngestRuns(),
      getSettings(),
      getPosts(),
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

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Vue d'ensemble de ta recherche d'emploi data / cloud / IA"
      />
      {!hasAdmin() && <SetupBanner />}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Candidatures" value={apps.length} hint={`${sent} envoyées`} />
        <StatCard label="Entretiens" value={interviews} />
        <StatCard label="Taux de réponse" value={`${responseRate}%`} hint="entretien+ / envoyées" />
        <StatCard label="Offres reçues" value={byStatus("offre")} />
      </div>

      <Card className="mt-6">
        <div className="mb-3 text-sm font-semibold text-slate-700">
          Cadence cette semaine
        </div>
        <div className="grid grid-cols-2 gap-6">
          {[
            { label: "Candidatures", n: appsThisWeek, goal: settings.weekly_application_goal },
            { label: "Posts publiés", n: postsThisWeek, goal: settings.weekly_post_goal },
          ].map((c) => {
            const pct = c.goal ? Math.min(100, Math.round((c.n / c.goal) * 100)) : 0;
            return (
              <div key={c.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-slate-500">{c.label}</span>
                  <span className="font-medium text-slate-700">{c.n} / {c.goal}</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded bg-slate-100">
                  <div className={`h-full rounded ${pct >= 100 ? "bg-emerald-500" : "bg-slate-800"}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 text-sm font-semibold text-slate-700">
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
            <div className="space-y-2">
              {APPLICATION_STATUSES.map((s) => {
                const n = byStatus(s);
                const pct = apps.length ? (n / apps.length) * 100 : 0;
                return (
                  <div key={s} className="flex items-center gap-2 sm:gap-3">
                    <div className="w-20 shrink-0 text-xs text-slate-500 sm:w-28">
                      {STATUS_LABELS[s]}
                    </div>
                    <div className="h-5 min-w-0 flex-1 overflow-hidden rounded bg-slate-100">
                      <div
                        className="h-full rounded bg-slate-800"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="w-8 text-right text-xs font-medium text-slate-600">
                      {n}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-4 text-sm font-semibold text-slate-700">
            Prochaines actions
          </div>
          {upcoming.length === 0 ? (
            <EmptyState>Rien de planifié.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((a) => (
                <li key={a.id} className="text-sm">
                  <div className="font-medium break-words text-slate-800">
                    {a.jp_jobs?.title ?? "Candidature"}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
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
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-700">
            Sources d&apos;offres
          </div>
          <div className="text-xs text-slate-400">{jobs.length} offres au total</div>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {ALL_SOURCES.map((s) => {
            const n = jobsBySource(s);
            const last = lastRun(s);
            return (
              <div key={s} className="rounded-lg border border-slate-200 p-3">
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

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Offres en base" value={jobs.length} />
        <StatCard label="Contacts" value={contacts.length} />
        <StatCard label="Projets faits" value={`${projectsDone}/${projects.length}`} />
        <StatCard label="Objectif" value="50k€+" hint="IDF · data/cloud/IA" />
      </div>
    </div>
  );
}

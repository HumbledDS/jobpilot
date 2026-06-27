import { getApplications, getJobs } from "@/lib/db";
import { hasAdmin } from "@/lib/supabase/admin";
import { PageHeader, StatCard, Card, SetupBanner, EmptyState } from "@/components/ui";
import { applicationStats } from "@/lib/analytics";
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<string, string> = {
  "co-pilote": "Co-pilote",
  manuel: "Manuel",
  apec: "APEC",
  france_travail: "France Travail",
  adzuna: "Adzuna",
};

export default async function StatsPage() {
  const [apps, jobs] = await Promise.all([getApplications(), getJobs("score")]);
  const s = applicationStats(apps);

  const fresh48 = jobs.filter(
    (j) => j.posted_at && Date.now() - new Date(j.posted_at).getTime() < 2 * 86400000,
  ).length;
  const scored = jobs.filter((j) => j.match_score != null);
  const avgScore = scored.length
    ? Math.round(scored.reduce((a, j) => a + (j.match_score ?? 0), 0) / scored.length)
    : 0;
  const over50 = jobs.filter((j) => (j.salary_max ?? j.salary_min ?? 0) >= 50000).length;
  const maxWeek = Math.max(1, ...s.weeks.map((w) => w.n));

  return (
    <div>
      <PageHeader
        title="Stats"
        subtitle="Ton entonnoir de candidature et la santé de ton pipeline d'offres"
      />
      {!hasAdmin() && <SetupBanner />}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Candidatures" value={s.total} hint={`${s.sent} envoyées`} />
        <StatCard label="Taux de réponse" value={`${s.responseRate}%`} hint="réponses / envoyées" />
        <StatCard label="Taux d'entretien" value={`${s.interviewRate}%`} hint="entretiens / envoyées" />
        <StatCard label="Offres reçues" value={s.offers} />
      </div>

      {apps.length === 0 ? (
        <Card className="mt-6">
          <EmptyState>
            Pas encore de candidature. Le funnel et les taux se calculeront automatiquement dès que tu commences à postuler (les chiffres ci-dessus restent à 0 en attendant).
          </EmptyState>
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Funnel */}
          <Card>
            <div className="mb-3 text-sm font-semibold text-ink">Entonnoir des candidatures</div>
            <div className="space-y-2">
              {APPLICATION_STATUSES.map((st) => {
                const n = s.by(st);
                const pct = s.total ? (n / s.total) * 100 : 0;
                return (
                  <div key={st} className="flex items-center gap-2 sm:gap-3">
                    <div className="w-20 shrink-0 text-xs text-muted sm:w-28">{STATUS_LABELS[st]}</div>
                    <div className="h-5 min-w-0 flex-1 overflow-hidden rounded bg-subtle">
                      <div className={`h-full rounded border ${STATUS_COLORS[st]}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="w-8 text-right text-xs font-medium text-muted">{n}</div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Cadence + sources */}
          <div className="space-y-6">
            <Card>
              <div className="mb-3 text-sm font-semibold text-ink">Cadence (6 dernières semaines)</div>
              <div className="flex items-end gap-2" style={{ height: "96px" }}>
                {s.weeks.map((w) => (
                  <div key={w.label} className="flex flex-1 flex-col items-center justify-end gap-1">
                    <div className="w-full rounded-t bg-ink" style={{ height: `${(w.n / maxWeek) * 72}px` }} title={`${w.n}`} />
                    <div className="text-[10px] text-faint">{w.label}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="mb-3 text-sm font-semibold text-ink">Par canal</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(s.bySource).map(([src, n]) => (
                  <span key={src} className="rounded-full border border-line px-2 py-1 text-xs text-muted">
                    {SOURCE_LABEL[src] ?? src} · {n}
                  </span>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Pipeline d'offres */}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Offres en base" value={jobs.length} />
        <StatCard label="Fraîches < 48h" value={fresh48} />
        <StatCard label="Score moyen" value={avgScore} hint="match / 100" />
        <StatCard label="≥ 50k" value={`${jobs.length ? Math.round((over50 / jobs.length) * 100) : 0}%`} hint={`${over50} offres`} />
      </div>
    </div>
  );
}

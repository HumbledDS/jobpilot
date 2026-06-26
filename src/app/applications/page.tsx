import { getApplications } from "@/lib/db";
import { hasAdmin } from "@/lib/supabase/admin";
import { PageHeader, Card, SetupBanner, EmptyState, fmtSalary } from "@/components/ui";
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
} from "@/lib/types";
import {
  createApplication,
  updateApplicationStatus,
  deleteApplication,
} from "./actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const apps = await getApplications();

  return (
    <div>
      <PageHeader
        title="Candidatures"
        subtitle="Pipeline de tes candidatures, de « à postuler » à « offre »"
      />
      {!hasAdmin() && <SetupBanner />}

      <Card className="mb-6">
        <div className="mb-3 text-sm font-semibold text-slate-700">
          + Nouvelle candidature
        </div>
        <form
          action={createApplication}
          className="grid grid-cols-1 gap-3 md:grid-cols-3"
        >
          <input name="title" required placeholder="Intitulé du poste *" className="input" />
          <input name="company_name" placeholder="Entreprise" className="input" />
          <input name="location" placeholder="Lieu (ex: Paris)" className="input" />
          <input name="url" placeholder="URL de l'offre" className="input" />
          <input name="salary_min" placeholder="Salaire (ex: 50)" className="input" />
          <input name="next_action_at" type="date" className="input" />
          <select name="status" className="input" defaultValue="a_postuler">
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <input name="notes" placeholder="Notes" className="input md:col-span-1" />
          <button className="btn-primary md:col-span-1">Ajouter</button>
        </form>
      </Card>

      {apps.length === 0 ? (
        <EmptyState>Aucune candidature pour l&apos;instant.</EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {APPLICATION_STATUSES.filter((s) => s !== "sans_reponse").map((s) => {
            const col = apps.filter((a) => a.status === s);
            return (
              <div key={s} className="flex min-w-0 flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded border px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[s]}`}
                  >
                    {STATUS_LABELS[s]}
                  </span>
                  <span className="text-xs text-slate-400">{col.length}</span>
                </div>
                {col.map((a) => (
                  <div
                    key={a.id}
                    className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    <Link href={`/applications/${a.id}`} className="block break-words text-sm font-semibold text-slate-800 hover:underline">
                      {a.jp_jobs?.title ?? "—"}
                    </Link>
                    <div className="break-words text-xs text-slate-500">
                      {a.jp_jobs?.company_name ?? ""}
                      {a.jp_jobs?.location ? ` · ${a.jp_jobs.location}` : ""}
                    </div>
                    {fmtSalary(
                      a.jp_jobs?.salary_min ?? null,
                      a.jp_jobs?.salary_max ?? null,
                    ) && (
                      <div className="mt-1 text-xs font-medium text-emerald-600">
                        {fmtSalary(
                          a.jp_jobs?.salary_min ?? null,
                          a.jp_jobs?.salary_max ?? null,
                        )}
                      </div>
                    )}
                    {a.jp_jobs?.url && (
                      <a
                        href={a.jp_jobs.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs text-blue-600 underline"
                      >
                        Voir l&apos;offre
                      </a>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <form action={updateApplicationStatus} className="flex min-w-0 flex-1 gap-1">
                        <input type="hidden" name="id" value={a.id} />
                        <select
                          name="status"
                          defaultValue={a.status}
                          className="min-w-0 flex-1 rounded border border-slate-200 px-1 py-1 text-xs"
                        >
                          {APPLICATION_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {STATUS_LABELS[st]}
                            </option>
                          ))}
                        </select>
                        <button className="rounded bg-slate-800 px-2 py-1 text-xs text-white">
                          OK
                        </button>
                      </form>
                      <form action={deleteApplication}>
                        <input type="hidden" name="id" value={a.id} />
                        <button className="rounded px-2 py-1 text-xs text-rose-500 hover:bg-rose-50">
                          ×
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

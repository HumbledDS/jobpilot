import { getJobs } from "@/lib/db";
import { hasAdmin } from "@/lib/supabase/admin";
import { PageHeader, Card, SetupBanner, EmptyState, fmtSalary } from "@/components/ui";
import { createJob, deleteJob, applyToJob } from "./actions";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const jobs = await getJobs();

  return (
    <div>
      <PageHeader
        title="Offres"
        subtitle="Offres en base (ajout manuel aujourd'hui, ingestion API à venir)"
      />
      {!hasAdmin() && <SetupBanner />}

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
        <EmptyState>Aucune offre en base.</EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((j) => (
            <Card key={j.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-semibold text-slate-800">{j.title}</div>
                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500">
                  {j.source}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {j.company_name ?? "—"}
                {j.location ? ` · ${j.location}` : ""}
                {j.remote ? ` · ${j.remote}` : ""}
              </div>
              {fmtSalary(j.salary_min, j.salary_max) && (
                <div className="mt-1 text-xs font-medium text-emerald-600">
                  {fmtSalary(j.salary_min, j.salary_max)}
                </div>
              )}
              <div className="mt-3 flex items-center gap-2">
                <form action={applyToJob}>
                  <input type="hidden" name="id" value={j.id} />
                  <button className="rounded bg-slate-800 px-2 py-1 text-xs text-white">
                    → Candidature
                  </button>
                </form>
                {j.url && (
                  <a
                    href={j.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 underline"
                  >
                    Voir
                  </a>
                )}
                <form action={deleteJob} className="ml-auto">
                  <input type="hidden" name="id" value={j.id} />
                  <button className="rounded px-2 py-1 text-xs text-rose-500 hover:bg-rose-50">
                    ✕
                  </button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

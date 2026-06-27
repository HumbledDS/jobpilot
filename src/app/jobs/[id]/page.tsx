import { getJobById } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { Card, Freshness, fmtSalary, SOURCE_LABELS, timeAgo } from "@/components/ui";
import { scoreLabel } from "@/lib/scoring";
import { extractEmails, aiEnabled } from "@/lib/ai";
import { applyToJob } from "../actions";
import { prepareApplication } from "../../applications/actions";
import { createContactFromJob } from "../../contacts/actions";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const job = await getJobById(id);
  if (!job) notFound();

  const sl = scoreLabel(job.match_score);
  const sal = fmtSalary(job.salary_min, job.salary_max);
  const emails = extractEmails(job.description);

  return (
    <div className="max-w-3xl break-words">
      <Link href="/jobs" className="text-xs text-faint hover:underline">
        ← Retour aux offres
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`rounded border px-2 py-0.5 text-xs font-bold ${sl.cls}`}>
          {job.match_score ?? "—"} · {sl.label}
        </span>
        <Freshness postedAt={job.posted_at} />
        <span className="rounded bg-subtle px-1.5 py-0.5 text-[10px] uppercase text-muted">
          {SOURCE_LABELS[job.source] ?? job.source}
        </span>
      </div>

      <h1 className="mt-2 text-2xl font-bold text-ink">{job.title}</h1>
      <div className="mt-1 flex flex-wrap gap-x-3 text-sm text-muted">
        {job.company_name && <span className="font-medium text-ink">{job.company_name}</span>}
        {job.location && <span>{job.location}</span>}
        {job.role_family && job.role_family !== "Autre" && <span>{job.role_family}</span>}
        {sal && <span className="font-medium text-emerald-600">{sal}</span>}
        <span className="text-faint">publiée {timeAgo(job.posted_at)}</span>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <form action={prepareApplication} className="contents sm:block">
          <input type="hidden" name="job_id" value={job.id} />
          <button className="btn-primary w-full sm:w-auto">
            Préparer la candidature{aiEnabled() ? " (IA)" : ""}
          </button>
        </form>
        <form action={applyToJob} className="contents sm:block">
          <input type="hidden" name="id" value={job.id} />
          <button className="w-full rounded-lg border border-line px-4 py-2 text-center text-sm hover:bg-canvas sm:w-auto">
            Ajouter au suivi
          </button>
        </form>
        {job.url && (
          <a href={job.url} target="_blank" rel="noreferrer" className="rounded-lg border border-line px-4 py-2 text-center text-sm hover:bg-canvas">
            Voir l&apos;offre d&apos;origine
          </a>
        )}
      </div>
      {aiEnabled() && (
        <p className="mt-2 text-xs text-faint">
          « Préparer la candidature » crée le suivi, choisit le CV adapté et génère lettre + email sur-mesure.
        </p>
      )}

      <Card className="mt-6">
        <div className="mb-2 text-sm font-semibold text-ink">Adéquation avec ton profil</div>
        <div className="flex flex-wrap gap-1">
          {(job.matched_skills ?? []).map((s) => (
            <span key={s} className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">{s}</span>
          ))}
          {(job.missing_skills ?? []).map((s) => (
            <span key={s} className="rounded bg-subtle px-1.5 py-0.5 text-xs text-muted">+{s}</span>
          ))}
          {!(job.matched_skills?.length || job.missing_skills?.length) && (
            <span className="text-xs text-faint">Aucune compétence détectée dans le texte.</span>
          )}
        </div>
      </Card>

      {emails.length > 0 && (
        <Card className="mt-6">
          <div className="mb-1 text-sm font-semibold text-ink">
            Emails de contact détectés dans l&apos;offre
          </div>
          <p className="mb-3 text-xs text-faint">
            Ajoute le contact pour générer un email de candidature{aiEnabled() ? " (rédigé par l'IA)" : ""}, signé avec tes infos.
          </p>
          <div className="flex flex-col gap-2">
            {emails.map((email) => (
              <div key={email} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-2">
                <a href={`mailto:${email}`} className="text-sm text-accent underline break-all">{email}</a>
                <form action={createContactFromJob}>
                  <input type="hidden" name="job_id" value={job.id} />
                  <input type="hidden" name="email" value={email} />
                  <button className="rounded bg-ink px-3 py-1.5 text-xs text-surface">
                    Ajouter au contact{aiEnabled() ? " + rédiger l'email" : ""}
                  </button>
                </form>
              </div>
            ))}
          </div>
        </Card>
      )}

      {job.description && (
        <Card className="mt-6">
          <div className="mb-2 text-sm font-semibold text-ink">Description</div>
          <p className="whitespace-pre-wrap text-sm text-muted">{job.description}</p>
        </Card>
      )}
    </div>
  );
}

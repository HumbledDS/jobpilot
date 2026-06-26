import { getJobById } from "@/lib/db";
import { Card, Freshness, fmtSalary, SOURCE_LABELS, timeAgo } from "@/components/ui";
import { scoreLabel } from "@/lib/scoring";
import { applyToJob } from "../actions";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getJobById(id);
  if (!job) notFound();

  const sl = scoreLabel(job.match_score);
  const sal = fmtSalary(job.salary_min, job.salary_max);

  return (
    <div className="max-w-3xl">
      <Link href="/jobs" className="text-xs text-slate-400 hover:underline">
        ← Retour aux offres
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`rounded border px-2 py-0.5 text-xs font-bold ${sl.cls}`}>
          {job.match_score ?? "—"} · {sl.label}
        </span>
        <Freshness postedAt={job.posted_at} />
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500">
          {SOURCE_LABELS[job.source] ?? job.source}
        </span>
      </div>

      <h1 className="mt-2 text-2xl font-bold text-slate-900">{job.title}</h1>
      <div className="mt-1 flex flex-wrap gap-x-3 text-sm text-slate-500">
        {job.company_name && <span className="font-medium text-slate-700">{job.company_name}</span>}
        {job.location && <span>{job.location}</span>}
        {job.role_family && job.role_family !== "Autre" && <span>{job.role_family}</span>}
        {sal && <span className="font-medium text-emerald-600">{sal}</span>}
        <span className="text-slate-400">publiée {timeAgo(job.posted_at)}</span>
      </div>

      <div className="mt-4 flex gap-2">
        <form action={applyToJob}>
          <input type="hidden" name="id" value={job.id} />
          <button className="btn-primary">Candidater</button>
        </form>
        {job.url && (
          <a href={job.url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50">
            Voir l&apos;offre d&apos;origine
          </a>
        )}
      </div>

      <Card className="mt-6">
        <div className="mb-2 text-sm font-semibold text-slate-700">Adéquation avec ton profil</div>
        <div className="flex flex-wrap gap-1">
          {(job.matched_skills ?? []).map((s) => (
            <span key={s} className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">{s}</span>
          ))}
          {(job.missing_skills ?? []).map((s) => (
            <span key={s} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">+{s}</span>
          ))}
          {!(job.matched_skills?.length || job.missing_skills?.length) && (
            <span className="text-xs text-slate-400">Aucune compétence détectée dans le texte.</span>
          )}
        </div>
      </Card>

      {job.description && (
        <Card className="mt-6">
          <div className="mb-2 text-sm font-semibold text-slate-700">Description</div>
          <p className="whitespace-pre-wrap text-sm text-slate-600">{job.description}</p>
        </Card>
      )}
    </div>
  );
}

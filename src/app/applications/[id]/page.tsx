import { getApplicationById } from "@/lib/db";
import { Card, fmtSalary } from "@/components/ui";
import { CopyButton } from "@/components/CopyButton";
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
} from "@/lib/types";
import {
  updateApplicationStatus,
  deleteApplication,
  regenerateLetter,
} from "../actions";
import { aiEnabled } from "@/lib/ai";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function ApplicationDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const app = await getApplicationById(id);
  if (!app) notFound();

  const job = app.jp_jobs;
  const cv = app.jp_cv_versions;
  const letter = app.jp_cover_letters;
  const sal = fmtSalary(job?.salary_min ?? null, job?.salary_max ?? null);

  return (
    <div className="max-w-3xl">
      <Link href="/applications" className="text-xs text-slate-400 hover:underline">
        ← Retour aux candidatures
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[app.status]}`}>
          {STATUS_LABELS[app.status]}
        </span>
        {job?.role_family && job.role_family !== "Autre" && (
          <span className="text-xs text-slate-500">{job.role_family}</span>
        )}
      </div>
      <h1 className="mt-1 break-words text-2xl font-bold text-slate-900">
        {job?.title ?? "Candidature"}
      </h1>
      <div className="mt-1 flex flex-wrap gap-x-3 text-sm text-slate-500">
        {job?.company_name && <span className="font-medium text-slate-700">{job.company_name}</span>}
        {job?.location && <span>{job.location}</span>}
        {sal && <span className="font-medium text-emerald-600">{sal}</span>}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {job?.url && (
          <a href={job.url} target="_blank" rel="noreferrer" className="btn-primary text-center">
            Postuler sur l&apos;offre
          </a>
        )}
        <form action={updateApplicationStatus} className="flex items-center gap-2">
          <input type="hidden" name="id" value={app.id} />
          <select name="status" defaultValue={app.status} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">Mettre à jour</button>
        </form>
        <form action={deleteApplication} className="sm:ml-auto">
          <input type="hidden" name="id" value={app.id} />
          <button className="rounded-lg px-3 py-2 text-sm text-rose-500 hover:bg-rose-50">Supprimer</button>
        </form>
      </div>

      {/* CV choisi */}
      <Card className="mt-6">
        <div className="text-sm font-semibold text-slate-700">CV recommandé</div>
        {cv ? (
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-slate-700">{cv.label}</span>
            {cv.target_role && <span className="text-xs text-slate-400">{cv.target_role}</span>}
            {cv.file_url && (
              <a href={cv.file_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">
                Ouvrir le CV
              </a>
            )}
          </div>
        ) : (
          <div className="mt-1 text-xs text-slate-400">
            Aucun CV sélectionné (ajoute des versions dans Documents).
          </div>
        )}
      </Card>

      {/* Lettre de motivation */}
      <Card className="mt-6">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold text-slate-700">Lettre de motivation</span>
          <div className="flex items-center gap-2">
            {letter?.content && <CopyButton text={letter.content} label="Copier" />}
            {aiEnabled() && (
              <form action={regenerateLetter}>
                <input type="hidden" name="id" value={app.id} />
                <button className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100">
                  {letter?.content ? "Régénérer" : "Générer"}
                </button>
              </form>
            )}
          </div>
        </div>
        {letter?.content ? (
          <p className="whitespace-pre-wrap break-words rounded bg-slate-50 p-3 text-sm text-slate-700">{letter.content}</p>
        ) : (
          <div className="text-xs text-slate-400">Pas encore de lettre.</div>
        )}
      </Card>

      {/* Email de candidature */}
      {app.draft_email && (
        <Card className="mt-6">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-700">
              Email de candidature{app.draft_subject ? ` — ${app.draft_subject}` : ""}
            </span>
            <div className="flex items-center gap-2">
              <CopyButton text={app.draft_email} label="Copier" />
              <a
                href={`mailto:?subject=${encodeURIComponent(app.draft_subject ?? "")}&body=${encodeURIComponent(app.draft_email)}`}
                className="rounded bg-slate-800 px-2 py-1 text-xs text-white"
              >
                Ouvrir dans ma messagerie
              </a>
            </div>
          </div>
          <p className="whitespace-pre-wrap break-words rounded bg-slate-50 p-3 text-sm text-slate-700">{app.draft_email}</p>
        </Card>
      )}
    </div>
  );
}

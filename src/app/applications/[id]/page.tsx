import { getApplicationById, getAppEvents } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { Card, fmtSalary, timeAgo } from "@/components/ui";
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
  addAppEvent,
  deleteAppEvent,
} from "../actions";
import { aiEnabled } from "@/lib/ai";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const EVENT_STYLE: Record<string, { label: string; cls: string }> = {
  statut: { label: "Statut", cls: "bg-subtle text-muted" },
  relance: { label: "Relance", cls: "bg-amber-100 text-amber-700" },
  entretien: { label: "Entretien", cls: "bg-violet-100 text-violet-700" },
  email: { label: "Email", cls: "bg-blue-100 text-accent" },
  offre: { label: "Offre", cls: "bg-emerald-100 text-emerald-700" },
  refus: { label: "Refus", cls: "bg-rose-100 text-rose-600" },
  note: { label: "Note", cls: "bg-subtle text-muted" },
};

export default async function ApplicationDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const app = await getApplicationById(id);
  if (!app) notFound();
  const events = await getAppEvents(id);

  const job = app.jp_jobs;
  const cv = app.jp_cv_versions;
  const letter = app.jp_cover_letters;
  const sal = fmtSalary(job?.salary_min ?? null, job?.salary_max ?? null);
  const nextAction = app.next_action_at ? new Date(app.next_action_at) : null;
  const nextOverdue = nextAction ? nextAction.getTime() < Date.now() : false;

  return (
    <div className="max-w-5xl">
      <Link href="/applications" className="text-xs text-faint hover:underline">
        ← Retour aux candidatures
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[app.status]}`}>
          {STATUS_LABELS[app.status]}
        </span>
        {job?.role_family && job.role_family !== "Autre" && (
          <span className="text-xs text-muted">{job.role_family}</span>
        )}
      </div>
      <h1 className="mt-1 break-words text-2xl font-bold text-ink">
        {job?.title ?? "Candidature"}
      </h1>
      <div className="mt-1 flex flex-wrap gap-x-3 text-sm text-muted">
        {job?.company_name && <span className="font-medium text-ink">{job.company_name}</span>}
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
          <select name="status" defaultValue={app.status} className="rounded-lg border border-line px-3 py-2 text-sm">
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <button className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-canvas">Mettre à jour</button>
        </form>
        <form action={deleteApplication} className="sm:ml-auto">
          <input type="hidden" name="id" value={app.id} />
          <button className="rounded-lg px-3 py-2 text-sm text-rose-500 hover:bg-rose-50">Supprimer</button>
        </form>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
      {/* CV choisi */}
      <Card>
        <div className="text-sm font-semibold text-ink">CV recommandé</div>
        {cv ? (
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-ink">{cv.label}</span>
            {cv.target_role && <span className="text-xs text-faint">{cv.target_role}</span>}
            {cv.file_url && (
              <a href={cv.file_url} target="_blank" rel="noreferrer" className="text-xs text-accent underline">
                Ouvrir le CV
              </a>
            )}
          </div>
        ) : (
          <div className="mt-1 text-xs text-faint">
            Aucun CV sélectionné (ajoute des versions dans Documents).
          </div>
        )}
      </Card>

      {/* Lettre de motivation */}
      <Card>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold text-ink">Lettre de motivation</span>
          <div className="flex items-center gap-2">
            {letter?.content && <CopyButton text={letter.content} label="Copier" />}
            {aiEnabled() && (
              <form action={regenerateLetter}>
                <input type="hidden" name="id" value={app.id} />
                <button className="rounded border border-line px-2 py-1 text-xs text-muted hover:bg-subtle">
                  {letter?.content ? "Régénérer" : "Générer"}
                </button>
              </form>
            )}
          </div>
        </div>
        {letter?.content ? (
          <p className="whitespace-pre-wrap break-words rounded bg-canvas p-3 text-sm text-ink">{letter.content}</p>
        ) : (
          <div className="text-xs text-faint">Pas encore de lettre.</div>
        )}
      </Card>

      {/* Email de candidature */}
      {app.draft_email && (
        <Card>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-ink">
              Email de candidature{app.draft_subject ? ` · ${app.draft_subject}` : ""}
            </span>
            <div className="flex items-center gap-2">
              <CopyButton text={app.draft_email} label="Copier" />
              <a
                href={`mailto:?subject=${encodeURIComponent(app.draft_subject ?? "")}&body=${encodeURIComponent(app.draft_email)}`}
                className="rounded bg-ink px-2 py-1 text-xs text-surface"
              >
                Ouvrir dans ma messagerie
              </a>
            </div>
          </div>
          <p className="whitespace-pre-wrap break-words rounded bg-canvas p-3 text-sm text-ink">{app.draft_email}</p>
        </Card>
      )}
        </div>

        <div className="space-y-6">
      {/* Timeline : relances / entretiens / notes */}
      <Card>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold text-ink">Suivi</span>
          {nextAction && (
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${nextOverdue ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
              Prochaine action : {nextAction.toLocaleDateString("fr-FR")}
              {nextOverdue ? " (en retard)" : ""}
            </span>
          )}
        </div>

        <form action={addAppEvent} className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center">
          <input type="hidden" name="application_id" value={app.id} />
          <select name="kind" defaultValue="relance" className="rounded-lg border border-line px-2 py-2 text-sm">
            <option value="relance">Relance</option>
            <option value="entretien">Entretien</option>
            <option value="email">Email</option>
            <option value="note">Note</option>
            <option value="offre">Offre</option>
            <option value="refus">Refus</option>
          </select>
          <input name="label" placeholder="Détail (ex: relance LinkedIn au recruteur)" className="input" />
          <input name="event_at" type="date" className="rounded-lg border border-line px-2 py-2 text-sm" />
          <button className="rounded-lg bg-ink px-3 py-2 text-sm font-medium text-surface">Ajouter</button>
        </form>

        {events.length === 0 ? (
          <div className="text-xs text-faint">Aucun événement. Ajoute une relance ou un entretien pour suivre l&apos;avancée.</div>
        ) : (
          <ol className="relative space-y-3 border-l border-line pl-4">
            {events.map((e) => {
              const st = EVENT_STYLE[e.kind] ?? EVENT_STYLE.note;
              return (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-line-strong" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${st.cls}`}>{st.label}</span>
                    <span className="text-xs text-faint">{new Date(e.event_at).toLocaleDateString("fr-FR")} · {timeAgo(e.event_at)}</span>
                    <form action={deleteAppEvent} className="ml-auto">
                      <input type="hidden" name="id" value={e.id} />
                      <input type="hidden" name="application_id" value={app.id} />
                      <button className="rounded px-1 text-xs text-rose-400 hover:bg-rose-50" aria-label="Supprimer">×</button>
                    </form>
                  </div>
                  {e.label && <div className="mt-0.5 break-words text-sm text-ink">{e.label}</div>}
                </li>
              );
            })}
          </ol>
        )}
      </Card>
        </div>
      </div>
    </div>
  );
}

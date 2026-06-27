import { getJobById, getTargetCompanies } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { Card, Freshness, fmtSalary, SOURCE_LABELS, timeAgo } from "@/components/ui";
import { scoreLabel } from "@/lib/scoring";
import { extractEmails, aiEnabled } from "@/lib/ai";
import { applyToJob } from "../actions";
import { prepareApplication } from "../../applications/actions";
import { createContactFromJob } from "../../contacts/actions";
import type { Company } from "@/lib/types";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function fmtCA(v?: number | null): string | null {
  if (v == null) return null;
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(1)} Md€`;
  if (Math.abs(v) >= 1e6) return `${Math.round(v / 1e6)} M€`;
  return `${Math.round(v / 1e3)} k€`;
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const [job, companies] = await Promise.all([getJobById(id), getTargetCompanies()]);
  if (!job) notFound();

  const sl = scoreLabel(job.match_score);
  const sal = fmtSalary(job.salary_min, job.salary_max);
  const emails = extractEmails(job.description);

  // Assise de l'entreprise (si dans le référentiel cible).
  const names = [job.source_company, job.company_name]
    .filter(Boolean)
    .map((s) => (s as string).toLowerCase());
  const comp: Company | undefined = companies.find((c) => {
    const n = c.name.toLowerCase();
    return names.some((x) => x === n || x.includes(n) || n.includes(x));
  });
  const growth = comp?.ca_cagr ?? comp?.ca_growth;

  const matched = job.matched_skills ?? [];
  const missing = job.missing_skills ?? [];

  return (
    <div className="max-w-4xl break-words">
      <Link href="/jobs" className="text-xs text-faint hover:text-ink">
        ← Retour aux offres
      </Link>

      {/* Hero */}
      <Card className="mt-3">
        <div className="flex items-start gap-4">
          <div className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border ${sl.cls}`}>
            <span className="mono text-xl font-bold leading-none">{job.match_score ?? "—"}</span>
            <span className="mt-1 text-[9px] font-medium uppercase tracking-wide">{sl.label}</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {job.from_target && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                  Directe
                </span>
              )}
              {(job.match_score ?? 0) >= 75 && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  Top match
                </span>
              )}
              <Freshness postedAt={job.posted_at} />
              <span className="rounded bg-subtle px-1.5 py-0.5 text-[10px] uppercase text-muted">
                {SOURCE_LABELS[job.source] ?? job.source}
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{job.title}</h1>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              {job.company_name && <span className="font-semibold text-ink">{job.company_name}</span>}
              {job.location && <span>{job.location}</span>}
              {job.role_family && job.role_family !== "Autre" && <span>{job.role_family}</span>}
              {job.contract_type && <span className="uppercase text-faint">{job.contract_type}</span>}
              {sal && <span className="mono font-medium text-emerald-600">{sal}</span>}
              <span className="text-faint">publiée {timeAgo(job.posted_at)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:flex-wrap">
          <form action={prepareApplication} className="contents sm:block">
            <input type="hidden" name="job_id" value={job.id} />
            <button className="btn-primary w-full sm:w-auto">
              Préparer la candidature{aiEnabled() ? " (IA)" : ""}
            </button>
          </form>
          <form action={applyToJob} className="contents sm:block">
            <input type="hidden" name="id" value={job.id} />
            <button className="btn-ghost w-full justify-center sm:w-auto">Ajouter au suivi</button>
          </form>
          {job.url && (
            <a href={job.url} target="_blank" rel="noreferrer" className="btn-ghost w-full justify-center sm:w-auto">
              Voir l&apos;offre d&apos;origine
            </a>
          )}
        </div>
        {aiEnabled() && (
          <p className="mt-2 text-xs text-faint">
            « Préparer la candidature » crée le suivi, choisit le CV adapté et génère lettre + email sur-mesure.
          </p>
        )}
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-5 lg:col-span-2">
          {job.description && (
            <Card>
              <div className="eyebrow mb-2">Description</div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{job.description}</p>
            </Card>
          )}

          {emails.length > 0 && (
            <Card>
              <div className="text-sm font-semibold text-ink">Contacts détectés dans l&apos;offre</div>
              <p className="mb-3 mt-0.5 text-xs text-faint">
                Ajoute le contact pour générer un email de candidature{aiEnabled() ? " (rédigé par l'IA)" : ""}, signé avec tes infos.
              </p>
              <div className="flex flex-col gap-2">
                {emails.map((email) => (
                  <div key={email} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-2">
                    <a href={`mailto:${email}`} className="break-all text-sm text-accent underline">{email}</a>
                    <form action={createContactFromJob}>
                      <input type="hidden" name="job_id" value={job.id} />
                      <input type="hidden" name="email" value={email} />
                      <button className="rounded bg-ink px-3 py-1.5 text-xs text-surface">
                        Ajouter + rédiger
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Colonne latérale */}
        <div className="space-y-5">
          {/* Adéquation */}
          <Card>
            <div className="eyebrow mb-2">Adéquation profil</div>
            {matched.length || missing.length ? (
              <div className="space-y-3">
                {matched.length > 0 && (
                  <div>
                    <div className="mb-1 text-[11px] font-medium text-emerald-700">Tu as ({matched.length})</div>
                    <div className="flex flex-wrap gap-1">
                      {matched.map((s) => (
                        <span key={s} className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {missing.length > 0 && (
                  <div>
                    <div className="mb-1 text-[11px] font-medium text-muted">À démontrer ({missing.length})</div>
                    <div className="flex flex-wrap gap-1">
                      {missing.map((s) => (
                        <span key={s} className="rounded border border-dashed border-line-strong px-1.5 py-0.5 text-xs text-muted">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-xs text-faint">Aucune compétence détectée dans le texte.</span>
            )}
          </Card>

          {/* L'entreprise (assise) */}
          {comp && (comp.categorie_entreprise || comp.effectif_label || comp.ca != null) && (
            <Card>
              <div className="eyebrow mb-2">L&apos;entreprise</div>
              <div className="text-sm font-semibold text-ink">{comp.name}</div>
              {comp.category && <div className="text-xs text-muted">{comp.category}</div>}
              <dl className="mt-3 space-y-2 text-xs">
                {comp.categorie_entreprise && (
                  <div className="flex justify-between"><dt className="text-muted">Catégorie</dt><dd className="font-medium text-ink">{comp.categorie_entreprise}</dd></div>
                )}
                {comp.effectif_label && (
                  <div className="flex justify-between"><dt className="text-muted">Effectifs</dt><dd className="mono text-ink">{comp.effectif_label}</dd></div>
                )}
                {fmtCA(comp.ca) && (
                  <div className="flex justify-between"><dt className="text-muted">CA</dt><dd className="mono font-medium text-emerald-600">{fmtCA(comp.ca)}</dd></div>
                )}
                {growth != null && (
                  <div className="flex justify-between">
                    <dt className="text-muted">Croissance</dt>
                    <dd className={`mono font-medium ${growth > 0 ? "text-emerald-600" : "text-rose-500"}`}>
                      {growth > 0 ? "+" : ""}{growth}%{comp.ca_cagr != null ? "/an" : ""}
                    </dd>
                  </div>
                )}
              </dl>
              <Link href={`/jobs?q=${encodeURIComponent(comp.name)}`} className="mt-3 inline-block text-xs text-accent hover:text-accent-strong">
                Voir leurs autres offres →
              </Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

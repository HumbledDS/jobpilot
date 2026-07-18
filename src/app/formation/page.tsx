import { getCourses, getJobs, getProfile } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { hasAdmin } from "@/lib/supabase/admin";
import { aiEnabled } from "@/lib/ai";
import { skillDemand } from "@/lib/analytics";
import { PageHeader, Card, SetupBanner, EmptyState } from "@/components/ui";
import { CopyButton } from "@/components/CopyButton";
import Link from "next/link";
import {
  createCourse,
  updateCourse,
  generateCoursePlan,
  saveCourseNotes,
  deleteCourse,
} from "./actions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STATUS = [
  { v: "todo", label: "À réviser" },
  { v: "in_progress", label: "En cours" },
  { v: "done", label: "Maîtrisé" },
];
const STATUS_STYLE: Record<string, string> = {
  todo: "bg-subtle text-muted",
  in_progress: "bg-amber-100 text-amber-700",
  done: "bg-emerald-100 text-emerald-700",
};

export default async function FormationPage({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string }>;
}) {
  await requireUser();
  const { skill } = await searchParams;
  const [courses, jobs, profile] = await Promise.all([
    getCourses(),
    getJobs("score"),
    getProfile(),
  ]);

  const done = courses.filter((c) => c.status === "done").length;
  const inProgress = courses.filter((c) => c.status === "in_progress").length;
  // Progression globale = moyenne des progressions (les "maîtrisés" comptent 100).
  const avg = courses.length
    ? Math.round(courses.reduce((s, c) => s + (c.status === "done" ? 100 : c.progress), 0) / courses.length)
    : 0;

  // Compétences à réviser en priorité : très demandées par le marché et hors profil.
  const profileSkills = new Set(profile?.skills ?? []);
  const tracked = new Set(courses.map((c) => c.skill).filter(Boolean));
  const gaps = skillDemand(jobs)
    .filter((d) => !profileSkills.has(d.skill) && !tracked.has(d.skill))
    .slice(0, 8);

  return (
    <div>
      <PageHeader
        title="Formation"
        subtitle={`Monter en compétence · relire, réviser et creuser les technos · ${done}/${courses.length} maîtrisés`}
      />
      {!hasAdmin() && <SetupBanner />}

      {/* Progression */}
      <Card className="mb-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold text-ink">Progression globale</span>
          <span className="text-muted">
            {done} maîtrisés · {inProgress} en cours · {courses.length} au total ({avg}%)
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded bg-subtle">
          <div className="h-full rounded bg-emerald-500" style={{ width: `${avg}%` }} />
        </div>
      </Card>

      {/* Compétences à réviser depuis le marché */}
      {gaps.length > 0 && (
        <Card className="mb-4">
          <div className="eyebrow mb-2">À réviser en priorité · demandé par le marché</div>
          <div className="flex flex-wrap gap-1.5">
            {gaps.map((g) => (
              <Link
                key={g.skill}
                href={`/formation?skill=${encodeURIComponent(g.skill)}`}
                className="rounded-md border border-line bg-canvas px-2 py-0.5 text-xs text-ink hover:border-accent hover:text-accent-strong"
              >
                {g.skill} <span className="mono text-[10px] text-faint">·{g.count}</span>
              </Link>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-faint">
            Clique une compétence pour préremplir le formulaire, puis génère un plan de révision.
          </p>
        </Card>
      )}

      {/* Ajouter un cours / ressource */}
      <Card className="mb-6">
        <div className="mb-3 text-sm font-semibold text-ink">+ Ajouter un cours / une ressource</div>
        <form action={createCourse} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input name="title" required placeholder="Titre (ex: Spark Performance Tuning) *" className="input sm:col-span-2" />
          <input name="skill" defaultValue={skill ?? ""} placeholder="Techno (ex: Spark, Kafka, Terraform)" className="input" />
          <input name="provider" placeholder="Source (Udemy, Docs, YouTube…)" className="input" />
          <input name="url" placeholder="Lien" className="input sm:col-span-2" />
          <button className="btn-primary sm:col-span-2">Ajouter</button>
        </form>
      </Card>

      {courses.length === 0 ? (
        <EmptyState>Aucun cours. Ajoute une ressource ou pars d&apos;une compétence du marché ci-dessus.</EmptyState>
      ) : (
        <div className="space-y-3">
          {courses.map((c) => (
            <Card key={c.id}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="break-words text-sm font-semibold text-ink">{c.title}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLE[c.status]}`}>
                      {STATUS.find((s) => s.v === c.status)?.label}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                    {c.skill && <span className="rounded border border-line bg-canvas px-1.5 py-0.5 text-[11px] text-ink">{c.skill}</span>}
                    {c.provider && <span>{c.provider}</span>}
                    {c.url && (
                      <a href={c.url} target="_blank" rel="noreferrer" className="text-accent underline">ouvrir</a>
                    )}
                  </div>
                  {/* mini barre de progression */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 w-32 overflow-hidden rounded bg-subtle">
                      <div className="h-full rounded bg-accent" style={{ width: `${c.status === "done" ? 100 : c.progress}%` }} />
                    </div>
                    <span className="mono text-[10px] text-faint">{c.status === "done" ? 100 : c.progress}%</span>
                  </div>
                </div>

                <div className="flex w-full flex-col gap-2 md:w-auto md:shrink-0">
                  <form action={updateCourse} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={c.id} />
                    <select name="status" defaultValue={c.status} className="rounded border border-line px-2 py-1 text-xs">
                      {STATUS.map((s) => (
                        <option key={s.v} value={s.v}>{s.label}</option>
                      ))}
                    </select>
                    <input
                      name="progress"
                      type="number"
                      min={0}
                      max={100}
                      defaultValue={c.progress}
                      className="w-16 rounded border border-line px-2 py-1 text-xs"
                      aria-label="Progression %"
                    />
                    <input name="url" defaultValue={c.url ?? ""} placeholder="lien" className="min-w-0 flex-1 rounded border border-line px-2 py-1 text-xs md:w-28 md:flex-none" />
                    <button className="rounded bg-ink px-2 py-1 text-xs text-surface">Maj</button>
                  </form>
                  <div className="flex items-center gap-2">
                    {aiEnabled() && (
                      <form action={generateCoursePlan}>
                        <input type="hidden" name="id" value={c.id} />
                        <button className="rounded border border-line px-2 py-1 text-xs text-muted hover:bg-subtle">
                          {c.plan ? "Régénérer le plan" : "Plan de révision (IA)"}
                        </button>
                      </form>
                    )}
                    <form action={deleteCourse} className="ml-auto">
                      <input type="hidden" name="id" value={c.id} />
                      <button className="rounded px-2 py-1 text-xs text-rose-500 hover:bg-rose-50" aria-label="Supprimer">×</button>
                    </form>
                  </div>
                </div>
              </div>

              {/* Plan de révision + notes */}
              <div className="mt-3 grid grid-cols-1 gap-3 border-t border-line pt-3 lg:grid-cols-2">
                {c.plan && (
                  <details>
                    <summary className="cursor-pointer text-xs font-semibold text-ink">Plan de révision</summary>
                    <p className="mt-2 whitespace-pre-wrap break-words rounded bg-canvas p-2 text-xs text-muted">{c.plan}</p>
                    <div className="mt-2"><CopyButton text={c.plan} label="Copier le plan" /></div>
                  </details>
                )}
                <form action={saveCourseNotes} className="flex flex-col gap-2">
                  <textarea name="notes" defaultValue={c.notes ?? ""} rows={3} placeholder="Tes notes / ce qui reste à revoir…" className="input" />
                  <button className="self-start rounded bg-ink px-2 py-1 text-xs text-surface">Enregistrer les notes</button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

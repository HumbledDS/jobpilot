import { getSkillProjects } from "@/lib/db";
import { hasAdmin } from "@/lib/supabase/admin";
import { aiEnabled } from "@/lib/ai";
import { PageHeader, Card, SetupBanner, EmptyState } from "@/components/ui";
import { CopyButton } from "@/components/CopyButton";
import {
  updateProject,
  createProject,
  generateProjectIdea,
  generateBrief,
  saveProjectNotes,
  deleteProject,
} from "./actions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STATUS = [
  { v: "todo", label: "À faire" },
  { v: "in_progress", label: "En cours" },
  { v: "deployed", label: "Déployé" },
  { v: "done", label: "Terminé" },
];
const STATUS_STYLE: Record<string, string> = {
  todo: "bg-slate-100 text-slate-600",
  in_progress: "bg-amber-100 text-amber-700",
  deployed: "bg-blue-100 text-accent",
  done: "bg-emerald-100 text-emerald-700",
};

export default async function ProjectsPage() {
  const projects = await getSkillProjects();
  const done = projects.filter(
    (p) => p.status === "deployed" || p.status === "done",
  ).length;
  const inProgress = projects.filter((p) => p.status === "in_progress").length;
  const pct = projects.length ? Math.round((done / projects.length) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Projets"
        subtitle={`Montée en compétence — ${done}/${projects.length} aboutis · prouver le titre FDE / Cloud / Architect`}
      />
      {!hasAdmin() && <SetupBanner />}

      <Card className="mb-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-700">Progression</span>
          <span className="text-slate-500">
            {done} aboutis · {inProgress} en cours · {projects.length} au total ({pct}%)
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded bg-slate-100">
          <div className="h-full rounded bg-emerald-500" style={{ width: `${pct}%` }} />
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* AI idea generator */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Générer une idée (IA)</span>
            <span className={`rounded px-1.5 py-0.5 text-[11px] ${aiEnabled() ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
              {aiEnabled() ? "IA active" : "clé IA requise"}
            </span>
          </div>
          <form action={generateProjectIdea} className="grid grid-cols-1 gap-3">
            <input name="theme" placeholder="Thème (ex: streaming, MCP, RAG, FinOps)" className="input" />
            <div className="grid grid-cols-2 gap-3">
              <input name="role" placeholder="Rôle visé (ex: Cloud)" className="input" />
              <input name="cloud" placeholder="Cloud (AWS/GCP/Azure)" className="input" />
            </div>
            <button className="btn-primary" disabled={!aiEnabled()}>
              {aiEnabled() ? "Proposer un projet (Claude)" : "Ajoute ANTHROPIC_API_KEY"}
            </button>
          </form>
        </Card>

        {/* Manual add */}
        <Card>
          <div className="mb-3 text-sm font-semibold text-slate-700">+ Ajouter un projet</div>
          <form action={createProject} className="grid grid-cols-1 gap-3">
            <input name="name" required placeholder="Nom du projet *" className="input" />
            <input name="description" placeholder="Description courte" className="input" />
            <div className="grid grid-cols-2 gap-3">
              <input name="target_role" placeholder="Rôle visé" className="input" />
              <input name="cloud" placeholder="Cloud" className="input" />
            </div>
            <button className="btn-primary">Ajouter</button>
          </form>
        </Card>
      </div>

      {projects.length === 0 ? (
        <EmptyState>Aucun projet. Génère une idée ou ajoute-en un.</EmptyState>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <Card key={p.id}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {p.order_index != null && (
                      <span className="text-xs font-bold text-slate-300">#{p.order_index}</span>
                    )}
                    <span className="break-words text-sm font-semibold text-slate-800">{p.name}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLE[p.status]}`}>
                      {STATUS.find((s) => s.v === p.status)?.label}
                    </span>
                  </div>
                  <div className="break-words text-xs text-slate-500">
                    {p.description}
                    {p.cloud ? ` · ${p.cloud}` : ""}
                    {p.target_role ? ` · ${p.target_role}` : ""}
                  </div>
                  <div className="mt-1 flex gap-3 text-xs">
                    {p.repo_url && (
                      <a href={p.repo_url} target="_blank" rel="noreferrer" className="text-accent underline">repo</a>
                    )}
                    {p.deployed_url && (
                      <a href={p.deployed_url} target="_blank" rel="noreferrer" className="text-accent underline">live</a>
                    )}
                  </div>
                </div>
                <div className="flex w-full flex-col gap-2 md:w-auto md:shrink-0">
                  <form action={updateProject} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <select name="status" defaultValue={p.status} className="rounded border border-slate-200 px-2 py-1 text-xs">
                      {STATUS.map((s) => (
                        <option key={s.v} value={s.v}>{s.label}</option>
                      ))}
                    </select>
                    <input name="repo_url" defaultValue={p.repo_url ?? ""} placeholder="repo url" className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-xs md:w-28 md:flex-none" />
                    <input name="deployed_url" defaultValue={p.deployed_url ?? ""} placeholder="live url" className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-xs md:w-28 md:flex-none" />
                    <button className="rounded bg-slate-800 px-2 py-1 text-xs text-white">Maj</button>
                  </form>
                  <div className="flex items-center gap-2">
                    {aiEnabled() && (
                      <form action={generateBrief}>
                        <input type="hidden" name="id" value={p.id} />
                        <button className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100">
                          {p.brief ? "Régénérer le brief" : "Générer le brief (IA)"}
                        </button>
                      </form>
                    )}
                    <form action={deleteProject} className="ml-auto">
                      <input type="hidden" name="id" value={p.id} />
                      <button className="rounded px-2 py-1 text-xs text-rose-500 hover:bg-rose-50" aria-label="Supprimer">×</button>
                    </form>
                  </div>
                </div>
              </div>

              {/* Brief + notes : l'espace de travail */}
              <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 lg:grid-cols-2">
                  {p.brief && (
                    <details>
                      <summary className="cursor-pointer text-xs font-semibold text-slate-700">Brief du projet</summary>
                      <p className="mt-2 whitespace-pre-wrap break-words rounded bg-slate-50 p-2 text-xs text-slate-600">{p.brief}</p>
                      <div className="mt-2"><CopyButton text={p.brief} label="Copier le brief" /></div>
                    </details>
                  )}
                  <form action={saveProjectNotes} className="flex flex-col gap-2">
                    <textarea name="notes" defaultValue={p.notes ?? ""} rows={3} placeholder="Tes notes / avancement…" className="input" />
                    <button className="self-start rounded bg-slate-800 px-2 py-1 text-xs text-white">Enregistrer les notes</button>
                  </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

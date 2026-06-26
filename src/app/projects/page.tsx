import { getSkillProjects } from "@/lib/db";
import { hasAdmin } from "@/lib/supabase/admin";
import { PageHeader, Card, SetupBanner, EmptyState } from "@/components/ui";
import { updateProject } from "./actions";

export const dynamic = "force-dynamic";

const STATUS = [
  { v: "todo", label: "À faire" },
  { v: "in_progress", label: "En cours" },
  { v: "deployed", label: "Déployé" },
  { v: "done", label: "Terminé" },
];
const STATUS_STYLE: Record<string, string> = {
  todo: "bg-slate-100 text-slate-600",
  in_progress: "bg-amber-100 text-amber-700",
  deployed: "bg-blue-100 text-blue-700",
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
        subtitle={`Montée en compétence — ${done}/${projects.length} aboutis · objectif : prouver le titre FDE / Cloud / Architect`}
      />
      {!hasAdmin() && <SetupBanner />}

      <Card className="mb-6">
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

      {projects.length === 0 ? (
        <EmptyState>Aucun projet (le seed n&apos;a pas tourné).</EmptyState>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <Card key={p.id}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300">
                      #{p.order_index}
                    </span>
                    <span className="text-sm font-semibold text-slate-800">
                      {p.name}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLE[p.status]}`}
                    >
                      {STATUS.find((s) => s.v === p.status)?.label}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {p.description}
                    {p.cloud ? ` · ${p.cloud}` : ""}
                    {p.target_role ? ` · ${p.target_role}` : ""}
                  </div>
                  <div className="mt-1 flex gap-3 text-xs">
                    {p.repo_url && (
                      <a href={p.repo_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                        repo
                      </a>
                    )}
                    {p.deployed_url && (
                      <a href={p.deployed_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                        live
                      </a>
                    )}
                  </div>
                </div>
                <form
                  action={updateProject}
                  className="flex shrink-0 flex-wrap items-center gap-2"
                >
                  <input type="hidden" name="id" value={p.id} />
                  <select
                    name="status"
                    defaultValue={p.status}
                    className="rounded border border-slate-200 px-2 py-1 text-xs"
                  >
                    {STATUS.map((s) => (
                      <option key={s.v} value={s.v}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <input
                    name="repo_url"
                    defaultValue={p.repo_url ?? ""}
                    placeholder="repo url"
                    className="w-32 rounded border border-slate-200 px-2 py-1 text-xs"
                  />
                  <input
                    name="deployed_url"
                    defaultValue={p.deployed_url ?? ""}
                    placeholder="live url"
                    className="w-32 rounded border border-slate-200 px-2 py-1 text-xs"
                  />
                  <button className="rounded bg-slate-800 px-2 py-1 text-xs text-white">
                    Maj
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

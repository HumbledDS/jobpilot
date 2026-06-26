import { getPosts } from "@/lib/db";
import { hasAdmin } from "@/lib/supabase/admin";
import { PageHeader, Card, SetupBanner, EmptyState } from "@/components/ui";
import { CopyButton } from "@/components/CopyButton";
import { POST_STATUS_LABELS, type Post } from "@/lib/types";
import { generateDraft, updatePost, setPostStatus, deletePost } from "./actions";

export const dynamic = "force-dynamic";

const TOPICS = [
  "Deep Learning", "Data Engineering", "Django", "DevOps",
  "Bases de données", "Ad Tech", "Pédagogie", "Cloud", "Machine Learning",
];
const ANGLES = [
  "Explication pédagogique", "Décryptage technique",
  "Retour d'expérience enseignant", "Mythe vs réalité", "Tutoriel court",
];

function fullText(p: Post) {
  return [p.hook, p.body, (p.hashtags ?? []).join(" ")].filter(Boolean).join("\n\n");
}

export default async function ContenuPage() {
  const posts = await getPosts();
  const cols: Post["status"][] = ["idea", "draft", "published"];

  return (
    <div>
      <PageHeader
        title="Studio de contenu LinkedIn"
        subtitle="Transforme tes cours (Deep Learning, Data, Django, DevOps, Ad Tech…) en posts qui construisent ton personal branding"
      />
      {!hasAdmin() && <SetupBanner />}

      <Card className="mb-6">
        <div className="mb-3 text-sm font-semibold text-slate-700">
          Générer un brouillon (canevas prêt à éditer)
        </div>
        <form action={generateDraft} className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input name="title" placeholder="Titre (optionnel)" className="input md:col-span-2" />
          <select name="topic" className="input" defaultValue="Deep Learning">
            {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select name="angle" className="input" defaultValue="Explication pédagogique">
            {ANGLES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <input name="course" placeholder="Cours / école (ex: M2 EFREI)" className="input md:col-span-3" />
          <button className="btn-primary">Générer</button>
        </form>
        <p className="mt-2 text-xs text-slate-400">
          Le canevas est un point de départ structuré (accroche + corps + hashtags) que tu complètes. Une génération par IA pourra être branchée avec une clé API.
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {cols.map((col) => {
          const list = posts.filter((p) => p.status === col);
          return (
            <div key={col}>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">
                  {POST_STATUS_LABELS[col]}
                </span>
                <span className="text-xs text-slate-400">{list.length}</span>
              </div>
              <div className="space-y-3">
                {list.length === 0 ? (
                  <EmptyState>Rien ici.</EmptyState>
                ) : (
                  list.map((p) => (
                    <Card key={p.id} className="p-3">
                      <details>
                        <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                          {p.title}
                        </summary>
                        <div className="mt-1 text-[11px] text-slate-400">
                          {p.topic}{p.course ? ` · ${p.course}` : ""}{p.angle ? ` · ${p.angle}` : ""}
                        </div>
                        <form action={updatePost} className="mt-3 space-y-2">
                          <input type="hidden" name="id" value={p.id} />
                          <input name="title" defaultValue={p.title} className="input" />
                          <textarea name="hook" defaultValue={p.hook ?? ""} rows={2} className="input" placeholder="Accroche" />
                          <textarea name="body" defaultValue={p.body ?? ""} rows={8} className="input" placeholder="Corps du post" />
                          <input name="hashtags" defaultValue={(p.hashtags ?? []).join(" ")} className="input" placeholder="#hashtags" />
                          <div className="flex flex-wrap items-center gap-2">
                            <select name="status" defaultValue={p.status} className="rounded border border-slate-200 px-2 py-1 text-xs">
                              <option value="idea">Idée</option>
                              <option value="draft">Brouillon</option>
                              <option value="published">Publié</option>
                            </select>
                            <button className="rounded bg-slate-800 px-2 py-1 text-xs text-white">Enregistrer</button>
                          </div>
                        </form>
                        <div className="mt-2 flex items-center gap-2">
                          <CopyButton text={fullText(p)} label="Copier le post" />
                          {p.status !== "published" && (
                            <form action={setPostStatus}>
                              <input type="hidden" name="id" value={p.id} />
                              <input type="hidden" name="status" value="published" />
                              <button className="rounded border border-emerald-200 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50">Marquer publié</button>
                            </form>
                          )}
                          <form action={deletePost} className="ml-auto">
                            <input type="hidden" name="id" value={p.id} />
                            <button className="rounded px-2 py-1 text-xs text-rose-500 hover:bg-rose-50">×</button>
                          </form>
                        </div>
                      </details>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

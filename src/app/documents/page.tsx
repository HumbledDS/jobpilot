import { getCvVersions, getCoverLetters } from "@/lib/db";
import { hasAdmin } from "@/lib/supabase/admin";
import { aiEnabled } from "@/lib/ai";
import { PageHeader, Card, SetupBanner, EmptyState } from "@/components/ui";
import {
  createCvVersion,
  deleteCvVersion,
  createCoverLetter,
  generateCoverLetter,
  deleteCoverLetter,
} from "./actions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function DocumentsPage() {
  const [cvs, letters] = await Promise.all([getCvVersions(), getCoverLetters()]);

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle="Versioning de tes CV et lettres de motivation"
      />
      {!hasAdmin() && <SetupBanner />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* CV versions */}
        <div>
          <Card className="mb-4">
            <div className="mb-3 text-sm font-semibold text-ink">+ Version de CV</div>
            <form action={createCvVersion} className="grid grid-cols-1 gap-3">
              <input name="label" required placeholder="Label (ex: CV Master 2026) *" className="input" />
              <input name="target_role" placeholder="Rôle cible (ex: FDE / Cloud)" className="input" />
              <input name="file_url" placeholder="Lien du fichier (Drive, Storage…)" className="input" />
              <button className="btn-primary">Ajouter</button>
            </form>
          </Card>
          <div className="space-y-3">
            {cvs.length === 0 ? (
              <EmptyState>Aucune version de CV.</EmptyState>
            ) : (
              cvs.map((cv) => (
                <Card key={cv.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 break-words">
                      <div className="text-sm font-semibold text-ink">
                        {cv.label}{" "}
                        <span className="text-xs font-normal text-faint">
                          v{cv.version}
                        </span>
                      </div>
                      <div className="text-xs text-muted">{cv.target_role}</div>
                      {cv.file_url && (
                        <a
                          href={cv.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-accent underline"
                        >
                          Ouvrir
                        </a>
                      )}
                    </div>
                    <form action={deleteCvVersion}>
                      <input type="hidden" name="id" value={cv.id} />
                      <button className="rounded px-2 py-1 text-xs text-rose-500 hover:bg-rose-50">
                        ×
                      </button>
                    </form>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Cover letters */}
        <div>
          <Card className="mb-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-ink">
                Générer une lettre avec l&apos;IA
              </span>
              <span className={`rounded px-1.5 py-0.5 text-[11px] ${aiEnabled() ? "bg-emerald-100 text-emerald-700" : "bg-subtle text-faint"}`}>
                {aiEnabled() ? "IA active" : "clé IA requise"}
              </span>
            </div>
            <form action={generateCoverLetter} className="grid grid-cols-1 gap-3">
              <input name="job_title" required placeholder="Intitulé du poste *" className="input" />
              <input name="company" placeholder="Entreprise" className="input" />
              <input name="tone" placeholder="Ton (ex: direct, formel)" className="input" />
              <textarea name="job_description" placeholder="Description de l'offre (collée ici)…" rows={3} className="input" />
              <button className="btn-primary" disabled={!aiEnabled()}>
                {aiEnabled() ? "Générer la lettre (Claude)" : "Ajoute ANTHROPIC_API_KEY"}
              </button>
            </form>
          </Card>

          <Card className="mb-4">
            <div className="mb-3 text-sm font-semibold text-ink">
              + Lettre de motivation (manuelle)
            </div>
            <form action={createCoverLetter} className="grid grid-cols-1 gap-3">
              <input name="label" required placeholder="Label (ex: LM Data Engineer) *" className="input" />
              <input name="tone" placeholder="Ton (ex: direct, formel)" className="input" />
              <textarea name="content" placeholder="Contenu…" rows={4} className="input" />
              <button className="btn-primary">Ajouter</button>
            </form>
          </Card>
          <div className="space-y-3">
            {letters.length === 0 ? (
              <EmptyState>Aucune lettre.</EmptyState>
            ) : (
              letters.map((l) => (
                <Card key={l.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 break-words">
                      <div className="text-sm font-semibold text-ink">{l.label}</div>
                      <div className="text-xs text-faint">{l.tone}</div>
                    </div>
                    <form action={deleteCoverLetter}>
                      <input type="hidden" name="id" value={l.id} />
                      <button className="rounded px-2 py-1 text-xs text-rose-500 hover:bg-rose-50">
                        ×
                      </button>
                    </form>
                  </div>
                  {l.content && (
                    <p className="mt-2 line-clamp-3 text-xs text-muted">{l.content}</p>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

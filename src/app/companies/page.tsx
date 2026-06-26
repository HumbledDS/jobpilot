import { getTargetCompanies, getJobs } from "@/lib/db";
import { hasAdmin } from "@/lib/supabase/admin";
import { PageHeader, Card, SetupBanner, EmptyState } from "@/components/ui";
import { companiesHiring } from "@/lib/analytics";
import { sourceTargets } from "./actions";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  const [all, jobs] = await Promise.all([getTargetCompanies(), getJobs("score")]);

  const hiring = companiesHiring(
    jobs,
    all.map((c) => ({ name: c.name, category: c.category })),
  );
  const priority = hiring.filter(
    (h) => (h.trust === "solide" || h.trust === "ok") && h.offers >= 2,
  );
  const top = hiring.slice(0, 14);

  const directCount = jobs.filter((j) => j.from_target).length;

  const TRUST_BADGE: Record<string, { label: string; cls: string } | null> = {
    solide: { label: "établie", cls: "bg-emerald-100 text-emerald-700" },
    ok: { label: "référencée", cls: "bg-blue-100 text-blue-700" },
    esn: { label: "ESN mission — déprioritisée", cls: "bg-amber-100 text-amber-700" },
    freelance: { label: "plateforme freelance", cls: "bg-purple-100 text-purple-700" },
    inconnue: null,
  };

  const categories = Array.from(
    all.reduce((m, c) => {
      const k = c.category ?? "Autre";
      m.set(k, (m.get(k) ?? 0) + 1);
      return m;
    }, new Map<string, number>()),
  ).sort((a, b) => b[1] - a[1]);
  const list = cat ? all.filter((c) => c.category === cat) : all;

  const linkedinUrl = (name: string) =>
    `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(name + " data")}&location=%C3%8Ele-de-France`;

  return (
    <div>
      <PageHeader
        title="Entreprises"
        subtitle="Qui viser en priorité, à partir de leur activité de recrutement réelle"
      />
      {!hasAdmin() && <SetupBanner />}

      {/* Directive */}
      <Card className="mb-4 border-slate-300 bg-slate-50">
        <div className="text-sm font-semibold text-slate-800">Qui viser maintenant</div>
        <p className="mt-1 text-xs text-slate-600">
          On privilégie les entreprises <strong>établies et de confiance</strong> (produit, scale-up, grand compte, éditeur) qui recrutent activement en data/cloud, à bon salaire et avec un fort match. Une boîte solide qui recrute = un pied dans la porte qui débouche vraiment.
          {priority.length > 0 && (
            <>
              {" "}En priorité : <strong>{priority.slice(0, 5).map((p) => p.company).join(", ")}</strong>.
            </>
          )}
        </p>
        <p className="mt-1 text-[11px] text-amber-600">
          Méfiance avec les ESN qui publient beaucoup d&apos;offres similaires : souvent du sourcing de candidats (CV mis en vivier) plus que des postes réels. Elles sont signalées « ESN — vérifier ».
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          Pour ajouter le CA, la croissance et l&apos;évolution d&apos;effectifs, il faut une source externe (INSEE Sirene, gratuite) — on peut l&apos;enrichir ensuite.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-3">
          <form action={sourceTargets}>
            <button className="btn-primary" disabled={!hasAdmin()}>
              Sourcer les offres des entreprises cibles
            </button>
          </form>
          <span className="text-xs text-slate-500">
            Interroge directement un lot d&apos;entreprises établies (vrais postes internes), en filtrant les intermédiaires.
            {directCount > 0 && (
              <>
                {" "}<strong className="text-slate-700">{directCount}</strong> offre(s) directe(s) déjà sourcée(s).
              </>
            )}
          </span>
        </div>
      </Card>

      {top.length > 0 && (
        <Card className="mb-6">
          <div className="mb-3 text-sm font-semibold text-slate-700">
            Entreprises qui recrutent (dans tes {jobs.length} offres ciblées)
          </div>
          <div className="space-y-1.5">
            {top.map((h) => {
              const sal = h.avgSalary ? `${Math.round(h.avgSalary / 1000)}k moy.` : null;
              const badge = TRUST_BADGE[h.trust];
              return (
                <div
                  key={h.company}
                  className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border p-2 ${h.trust === "solide" ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200"}`}
                >
                  <span className="min-w-0 flex-1 break-words text-sm font-medium text-slate-800">
                    {h.company}
                    {badge && <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium ${badge.cls}`}>{badge.label}</span>}
                    {h.category && <span className="ml-2 text-[11px] text-slate-400">{h.category}</span>}
                  </span>
                  <span className="text-xs text-slate-500">{h.offers} offre(s)</span>
                  {sal && <span className="text-xs font-medium text-emerald-600">{sal}</span>}
                  <span className="text-xs text-slate-400">match {h.avgScore}</span>
                  {h.harvestFlag && (
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">publie en volume</span>
                  )}
                  <Link href={`/jobs?q=${encodeURIComponent(h.company)}`} className="text-xs text-blue-600 underline">voir leurs offres</Link>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Référentiel cible (303) */}
      <div className="mb-2 text-sm font-semibold text-slate-700">Référentiel d&apos;entreprises cibles ({all.length})</div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href="/companies"
          className={`rounded-full border px-3 py-1 text-xs font-medium ${!cat ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600"}`}
        >
          Toutes ({all.length})
        </Link>
        {categories.map(([c, n]) => (
          <Link
            key={c}
            href={`/companies?cat=${encodeURIComponent(c)}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${cat === c ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600"}`}
          >
            {c} ({n})
          </Link>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState>Aucune entreprise (le seed n&apos;a pas tourné).</EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((c) => (
            <Card key={c.id} className="flex flex-col gap-2 p-4">
              <div className="min-w-0">
                <div className="break-words text-sm font-semibold text-slate-800">{c.name}</div>
                <div className="text-[11px] uppercase tracking-wide text-slate-400">{c.category}</div>
              </div>
              <div className="mt-auto flex gap-3 text-xs">
                <Link href={`/jobs?q=${encodeURIComponent(c.name)}`} className="text-blue-600 underline">offres ici</Link>
                <a href={linkedinUrl(c.name)} target="_blank" rel="noreferrer" className="text-blue-600 underline">LinkedIn</a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

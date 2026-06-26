import { getTargetCompanies } from "@/lib/db";
import { hasAdmin } from "@/lib/supabase/admin";
import { PageHeader, Card, SetupBanner, EmptyState } from "@/components/ui";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  const all = await getTargetCompanies();

  const categories = Array.from(
    all.reduce((m, c) => {
      const k = c.category ?? "Autre";
      m.set(k, (m.get(k) ?? 0) + 1);
      return m;
    }, new Map<string, number>()),
  ).sort((a, b) => b[1] - a[1]);

  const list = cat ? all.filter((c) => c.category === cat) : all;

  const apecUrl = (name: string) =>
    `https://www.apec.fr/candidat/recherche-emploi.html/emploi?motsCles=${encodeURIComponent(name)}`;
  const linkedinUrl = (name: string) =>
    `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(name + " data")}&location=%C3%8Ele-de-France`;

  return (
    <div>
      <PageHeader
        title="Entreprises cibles"
        subtitle={`${all.length} ESN, cabinets data/IA, cloud, éditeurs, scale-ups et grands comptes`}
      />
      {!hasAdmin() && <SetupBanner />}

      <div className="mb-5 flex flex-wrap gap-2">
        <Link
          href="/companies"
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            !cat
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          Toutes ({all.length})
        </Link>
        {categories.map(([c, n]) => (
          <Link
            key={c}
            href={`/companies?cat=${encodeURIComponent(c)}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              cat === c
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600"
            }`}
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
                <div className="text-[11px] uppercase tracking-wide text-slate-400">
                  {c.category}
                </div>
              </div>
              <div className="mt-auto flex gap-3 text-xs">
                <a
                  href={apecUrl(c.name)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  Offres APEC
                </a>
                <a
                  href={linkedinUrl(c.name)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  LinkedIn
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

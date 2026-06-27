import { GoogleSignIn } from "@/components/GoogleSignIn";

const FEATURES = [
  ["Sourcing automatique", "APEC, France Travail, Adzuna + ATS internes (Greenhouse, Lever, Workday) — chaque jour."],
  ["Ciblage intelligent", "Entreprises établies, en croissance (CA/effectifs INPI), qui recrutent vraiment en interne."],
  ["Co-pilote de candidature", "CV adapté + lettre + email rédigés par l'IA. Tu valides, tu envoies."],
  ["Coach & montée en compétence", "Un focus quotidien piloté par ton marché, tes candidatures et tes projets."],
];

export function Landing({ notAllowed = false }: { notAllowed?: boolean }) {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
        {/* Wordmark */}
        <div className="mb-8 flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="dot relative bg-accent" />
          </span>
          <span className="text-base font-semibold tracking-tight text-ink">JobPilot</span>
          <span className="eyebrow ml-1">Career OS</span>
        </div>

        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
          Ton OS de recherche d&apos;emploi <span className="text-accent">Data / Cloud / IA</span>.
        </h1>
        <p className="mt-4 max-w-xl text-sm text-muted sm:text-base">
          Sourcer les bonnes offres, viser les bonnes entreprises, et industrialiser des candidatures
          de qualité au bon moment — pour décrocher un poste à 50k€+ en Île-de-France.
        </p>

        <div className="mt-8">
          <GoogleSignIn />
          {notAllowed ? (
            <form action="/auth/signout" method="post" className="mt-4">
              <p className="text-xs text-rose-500">
                Ce compte Google n&apos;est pas autorisé sur cet espace.
              </p>
              <button className="mt-1 text-xs text-accent underline">Se déconnecter</button>
            </form>
          ) : (
            <p className="mt-3 text-[11px] text-faint">Accès réservé — connexion sécurisée par Google.</p>
          )}
        </div>

        {/* Features */}
        <div className="mt-14 grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          {FEATURES.map(([title, desc]) => (
            <div key={title} className="rounded-xl border border-line bg-surface p-5 text-left shadow-[0_1px_2px_rgba(20,22,25,0.04)]">
              <div className="text-sm font-semibold text-ink">{title}</div>
              <div className="mt-1 text-xs text-muted">{desc}</div>
            </div>
          ))}
        </div>

        <div className="mono mt-12 text-[11px] text-faint">
          Next.js · Supabase · Claude · MCP — conçu par Babacar Gueye
        </div>
      </div>
    </main>
  );
}

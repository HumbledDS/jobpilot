import { getJobs, getTargetCompanies, getApplications } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { hasAdmin } from "@/lib/supabase/admin";
import { PageHeader, Card, StatCard, SetupBanner } from "@/components/ui";

export const dynamic = "force-dynamic";

function Section({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <Card className="mb-5">
      {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
      <div className="mb-3 text-sm font-semibold text-ink">{title}</div>
      {children}
    </Card>
  );
}

const SOURCES = [
  ["APEC", "Offres cadres (endpoint public, sans clé)", "Cron 6h"],
  ["France Travail", "Offres IDF (API OAuth, région 11)", "Cron 6h"],
  ["Adzuna", "Agrégateur multi-sources (clé app)", "Cron 6h"],
  ["ATS entreprises", "Postes INTERNES réels — Greenhouse, Lever, SmartRecruiters, Workday (par entreprise cible)", "Cron 6h30"],
  ["Sirene / data.gouv", "Catégorie (PME/ETI/GE), effectifs, NAF, CA dernière année (sans clé)", "Cron 7h"],
  ["INPI ratios (Opendatasoft)", "CA multi-années → croissance YoY + CAGR (sans clé)", "Cron 7h15"],
  ["Anthropic (Claude Opus)", "Lettres, emails, posts, briefs projets, coach génératif, idées", "À la demande"],
];

const MODULES = [
  ["Dashboard", "Vue d'ensemble + coach (focus du jour piloté par ton contexte) + boîtes en croissance qui recrutent."],
  ["Stats", "Entonnoir de candidatures, taux de réponse/entretien, cadence, santé du pipeline d'offres."],
  ["Candidatures", "Kanban + fiche détail avec timeline (relances, entretiens, statuts tracés)."],
  ["Offres", "Recherche + filtres (match, salaire, mode, métier, croissance CA), badges Directe / Top match, recherches sauvegardées."],
  ["Marché", "Compétences les plus demandées, top skills à acquérir (actionnable), salaires, segmentation employeurs vs intermédiaires, secteurs, marché interne."],
  ["Entreprises", "Qui viser maintenant : classement par activité de recrutement + assise réelle (catégorie, effectifs, CA, croissance) ; ESN/intermédiaires déclassés."],
  ["Contacts", "Recruteurs par entreprise + email de prise de contact rédigé par l'IA."],
  ["Documents", "Versions de CV et lettres de motivation."],
  ["Contenu", "Génération de posts LinkedIn techniques (cours, projets) pour la visibilité."],
  ["Projets", "Espace de montée en compétence : idées + briefs IA, suivi (todo → déployé)."],
];

const AUTOMATION = [
  ["Co-pilote de candidature", "Sur une offre : choisit le CV adapté, rédige lettre + email, crée la candidature. Tu valides et envoies."],
  ["Crons quotidiens (Vercel, région cdg1)", "Ingestion 6h · sourcing entreprises 6h30 · enrichissement Sirene 7h · croissance CA (INPI) 7h15."],
  ["Serveur MCP (HTTP)", "Expose tes données d'offres/candidatures à Claude Desktop via un endpoint authentifié."],
  ["Routes sécurisées", "Les déclencheurs d'ingestion/enrichissement sont protégés par CRON_SECRET (401 sans secret)."],
];

export default async function SystemePage() {
  await requireUser();
  const [jobs, companies, apps] = await Promise.all([
    getJobs("score"),
    getTargetCompanies(),
    getApplications(),
  ]);
  const direct = jobs.filter((j) => j.from_target).length;
  const enriched = companies.filter((c) => c.ca != null).length;

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Système"
        subtitle="Ce qui a été construit, connecté, et à quoi ça sert — JobPilot, ton OS de recherche d'emploi."
      />
      {!hasAdmin() && <SetupBanner />}

      <Card className="mb-5 border-accent/25 bg-accent-soft/40">
        <div className="eyebrow text-accent-strong">Objectif</div>
        <p className="mt-1.5 text-sm text-ink">
          Décrocher un poste <strong>Data / Cloud / IA à 50k€+ en Île-de-France</strong> — en automatisant le sourcing,
          en visant les bonnes entreprises (établies, qui recrutent en interne, en croissance), et en industrialisant
          des candidatures de qualité au bon moment.
        </p>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Offres en base" value={jobs.length} />
        <StatCard label="Offres directes" value={direct} hint="ATS internes" />
        <StatCard label="Entreprises cibles" value={companies.length} />
        <StatCard label="Enrichies (CA)" value={enriched} />
        <StatCard label="Candidatures" value={apps.length} />
      </div>

      <Section eyebrow="Données" title="Ce qui est connecté (sources)">
        <div className="space-y-1.5">
          {SOURCES.map(([name, what, freq]) => (
            <div key={name} className="flex flex-col gap-0.5 rounded-lg border border-line p-2.5 sm:flex-row sm:items-center sm:gap-3">
              <span className="w-44 shrink-0 text-sm font-medium text-ink">{name}</span>
              <span className="min-w-0 flex-1 text-xs text-muted">{what}</span>
              <span className="mono shrink-0 text-[10px] text-faint">{freq}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-faint">
          Les sources financières (Sirene, INPI) sont des données <strong>publiques gratuites</strong> — celles que des
          services payants (ex. Pappers) ne font que revendre.
        </p>
      </Section>

      <Section eyebrow="Modules" title="Les pages et leur utilité">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {MODULES.map(([name, use]) => (
            <div key={name} className="rounded-lg border border-line p-3">
              <div className="text-sm font-medium text-ink">{name}</div>
              <div className="mt-0.5 text-xs text-muted">{use}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Automatisation & IA" title="Ce qui tourne tout seul">
        <div className="space-y-2">
          {AUTOMATION.map(([name, what]) => (
            <div key={name} className="rounded-lg border border-line p-3">
              <div className="text-sm font-medium text-ink">{name}</div>
              <div className="mt-0.5 text-xs text-muted">{what}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Stack" title="Technique">
        <p className="text-sm text-muted">
          <strong className="text-ink">Next.js 16</strong> (App Router, server components) ·{" "}
          <strong className="text-ink">Tailwind v4</strong> ·{" "}
          <strong className="text-ink">Supabase</strong> (Postgres, tables jp_*) ·{" "}
          <strong className="text-ink">Vercel</strong> (hébergement + crons, région cdg1) ·{" "}
          <strong className="text-ink">Claude Opus</strong> (SDK officiel) ·{" "}
          <strong className="text-ink">MCP</strong> (serveur HTTP) · design « Terminal Control Center » (Geist, clair/sombre).
        </p>
      </Section>

      <Section eyebrow="Méthode" title="Comment l'utiliser (la boucle gagnante)">
        <ol className="space-y-2 text-sm text-ink">
          <li><span className="mono mr-2 text-xs text-faint">01</span><strong>Offres</strong> — filtre Match ≥ 75, Salaire ≥ 50k, Croissance ; vise les badges « Directe ».</li>
          <li><span className="mono mr-2 text-xs text-faint">02</span><strong>Entreprises</strong> — prends tes cibles dans « Qui viser » (établies + en croissance).</li>
          <li><span className="mono mr-2 text-xs text-faint">03</span><strong>Co-pilote</strong> — prépare la candidature (CV + lettre + email), valide, envoie.</li>
          <li><span className="mono mr-2 text-xs text-faint">04</span><strong>Candidatures</strong> — logge relances/entretiens sur la timeline.</li>
          <li><span className="mono mr-2 text-xs text-faint">05</span><strong>Marché → Projets</strong> — comble les compétences manquantes via un projet déployé.</li>
          <li><span className="mono mr-2 text-xs text-faint">06</span><strong>Dashboard / Coach</strong> — suis ton focus du jour ; ajuste avec Stats.</li>
        </ol>
        <p className="mt-3 text-xs text-muted">
          Rythme cible : 2 candidatures ciblées/jour · relances à J+7 · 1 post LinkedIn/sem · 1 projet qui avance/sem.
        </p>
      </Section>
    </div>
  );
}

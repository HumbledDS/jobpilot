"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { CopyButton } from "@/components/CopyButton";
import { CV_PROFILES, type CvProfile } from "@/lib/cvProfiles";

function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <span
          key={s}
          className="rounded-md border border-line bg-canvas px-2 py-0.5 text-xs text-ink"
        >
          {s}
        </span>
      ))}
    </div>
  );
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <div className="eyebrow">{children}</div>
      {action}
    </div>
  );
}

function ProfileView({ p }: { p: CvProfile }) {
  return (
    <div className="space-y-5">
      {/* En-tête du profil */}
      <Card className="border-accent/25 bg-accent-soft/30">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="eyebrow text-accent-strong">Titre professionnel</div>
          <span className="mono rounded border border-accent/30 px-1.5 py-0.5 text-[10px] text-accent-strong">
            {p.share} des candidatures
          </span>
        </div>
        <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-ink">{p.title}</h2>
        <p className="mt-2 text-xs text-muted">{p.angle}</p>
      </Card>

      {/* Résumé */}
      <Card>
        <SectionTitle action={<CopyButton text={p.summary} />}>Résumé de profil</SectionTitle>
        <p className="text-sm leading-relaxed text-ink">{p.summary}</p>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Compétences */}
        <Card>
          <SectionTitle action={<CopyButton text={p.skills.join(" · ")} />}>Compétences clés</SectionTitle>
          <Chips items={p.skills} />
        </Card>

        {/* Mots-clés ATS */}
        <Card>
          <SectionTitle action={<CopyButton text={p.ats.join(", ")} label="Copier (ATS)" />}>
            Mots-clés ATS
          </SectionTitle>
          <Chips items={p.ats} />
        </Card>
      </div>

      {/* Expériences réécrites */}
      <Card>
        <SectionTitle>Expériences · réécrites pour l&apos;angle</SectionTitle>
        <div className="space-y-4">
          {p.experiences.map((e, i) => (
            <div key={i} className="border-l-2 border-line pl-3.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <div className="text-sm font-semibold text-ink">{e.company}</div>
                <div className="mono text-[11px] text-faint">{e.period}</div>
              </div>
              <div className="text-xs text-muted">{e.role}</div>
              <ul className="mt-1.5 space-y-1">
                {e.bullets.map((b, j) => (
                  <li key={j} className="flex gap-2 text-xs text-ink">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              {e.stack && (
                <div className="mono mt-1.5 text-[10px] text-faint">Stack : {e.stack}</div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Formation */}
        <Card className="lg:col-span-2">
          <SectionTitle>Formation</SectionTitle>
          <ul className="space-y-1.5">
            {p.education.map((ed, i) => (
              <li key={i} className="text-xs text-ink">{ed}</li>
            ))}
          </ul>
        </Card>

        {/* Salaire */}
        <Card>
          <SectionTitle>Fourchette visée</SectionTitle>
          <div className="text-sm font-semibold text-ink">{p.salary}</div>
        </Card>
      </div>

      {/* Entreprises cibles */}
      <Card>
        <SectionTitle action={<CopyButton text={p.targets.join(", ")} />}>Entreprises ciblées</SectionTitle>
        <Chips items={p.targets} />
      </Card>
    </div>
  );
}

export function CvProfiles() {
  const [active, setActive] = useState(CV_PROFILES[0].id);
  const profile = CV_PROFILES.find((p) => p.id === active) ?? CV_PROFILES[0];

  return (
    <div>
      {/* Onglets */}
      <div className="mb-6 flex flex-wrap gap-2">
        {CV_PROFILES.map((p, i) => {
          const on = p.id === active;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setActive(p.id)}
              aria-pressed={on}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                on
                  ? "border-ink bg-ink font-medium text-surface"
                  : "border-line bg-surface font-medium text-muted hover:border-line-strong hover:text-ink"
              }`}
            >
              <span className={`mono text-[10px] ${on ? "text-surface/55" : "text-faint"}`}>
                {String(i + 1).padStart(2, "0")}
              </span>
              {p.tab}
            </button>
          );
        })}
      </div>

      <ProfileView p={profile} />
    </div>
  );
}

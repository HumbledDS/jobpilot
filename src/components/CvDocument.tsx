import { CV_CONTACT, type CvProfile } from "@/lib/cvProfiles";

// Document CV imprimable — style « papier » forcé en clair (couleurs en dur,
// indépendantes du thème) pour un rendu identique à l'écran et en PDF.
// L'utilisateur exporte via la boîte d'impression → « Enregistrer en PDF ».

function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4">
      <h2 className="mb-2 border-b border-[#141619] pb-1 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-[#141619]">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function CvDocument({ profile: p }: { profile: CvProfile }) {
  const c = CV_CONTACT;
  return (
    <div className="cv-doc mx-auto max-w-[820px] overflow-hidden rounded-lg border border-line bg-white text-[#141619] shadow-[0_1px_3px_rgba(20,22,25,0.08)]">
      {/* En-tête */}
      <header className="flex flex-col gap-4 bg-[#16211f] px-8 py-6 text-white sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{c.name}</h1>
          <div className="mt-1 text-[13px] font-medium text-[#5eead4]">{p.title}</div>
          <div className="mono mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-white/65">
            <span>{c.linkedin}</span>
            <span>{c.github}</span>
          </div>
        </div>
        <div className="mono shrink-0 space-y-0.5 text-[11px] text-white/80 sm:text-right">
          <div className="text-[12px] font-semibold text-white">
            {p.tab} · {c.experience}
          </div>
          <div>{c.phone}</div>
          <div>{c.email}</div>
          <div>{c.location}</div>
        </div>
      </header>

      <div className="px-8 py-6">
        {/* Résumé */}
        <p className="text-[12.5px] italic leading-relaxed text-[#3f4650]">{p.summary}</p>

        {/* Expériences */}
        <DocSection title="Expériences">
          <div className="space-y-3">
            {p.experiences.map((e, i) => (
              <div key={i}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <div className="text-[13px]">
                    <span className="font-semibold text-[#141619]">{e.company}</span>
                    <span className="italic text-[#5b616b]"> | {e.role}</span>
                  </div>
                  <div className="mono shrink-0 text-[11px] font-medium text-[#141619]">{e.period}</div>
                </div>
                <ul className="mt-1 space-y-0.5">
                  {e.bullets.map((b, j) => (
                    <li key={j} className="flex gap-2 text-[12px] leading-snug text-[#20242a]">
                      <span className="mt-[3px] text-[#0d9488]">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                {e.stack && (
                  <div className="mono mt-1 text-[10.5px] text-[#0f766e]">Stacks : {e.stack}</div>
                )}
              </div>
            ))}
          </div>
        </DocSection>

        {/* Formation */}
        <DocSection title="Formation">
          <ul className="space-y-1">
            {p.education.map((ed, i) => (
              <li key={i} className="text-[12px] text-[#20242a]">{ed}</li>
            ))}
          </ul>
        </DocSection>

        {/* Compétences */}
        <DocSection title="Compétences clés">
          <div className="flex flex-wrap gap-1.5">
            {p.skills.map((s) => (
              <span
                key={s}
                className="rounded border border-[#d3d7db] bg-[#f5f6f7] px-2 py-0.5 text-[11px] text-[#141619]"
              >
                {s}
              </span>
            ))}
          </div>
        </DocSection>

        {/* Langues & centres d'intérêt */}
        <DocSection title="Langues & centres d'intérêt">
          <div className="text-[12px] text-[#20242a]">
            <div><span className="font-semibold">Langues :</span> {c.languages}</div>
            <div className="mt-0.5"><span className="font-semibold">Centres d&apos;intérêt :</span> {c.interests}</div>
          </div>
        </DocSection>
      </div>
    </div>
  );
}

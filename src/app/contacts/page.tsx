import { getContacts, getCompanies } from "@/lib/db";
import { hasAdmin } from "@/lib/supabase/admin";
import { aiEnabled } from "@/lib/ai";
import { PageHeader, Card, SetupBanner, EmptyState } from "@/components/ui";
import { CopyButton } from "@/components/CopyButton";
import { createContact, deleteContact, draftEmailForContact } from "./actions";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const [contacts, companies] = await Promise.all([getContacts(), getCompanies()]);
  const companyName = (id: string | null) =>
    companies.find((c) => c.id === id)?.name ?? null;

  return (
    <div>
      <PageHeader
        title="Contacts"
        subtitle="Recruteurs et interlocuteurs par entreprise"
      />
      {!hasAdmin() && <SetupBanner />}

      <Card className="mb-6">
        <div className="mb-3 text-sm font-semibold text-slate-700">+ Nouveau contact</div>
        <form action={createContact} className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input name="full_name" required placeholder="Nom complet *" className="input" />
          <input name="role" placeholder="Poste (ex: Talent Acquisition)" className="input" />
          <input name="company_name" placeholder="Entreprise" className="input" />
          <input name="email" placeholder="Email" className="input" />
          <input name="linkedin_url" placeholder="LinkedIn" className="input" />
          <input name="notes" placeholder="Notes" className="input" />
          <button className="btn-primary md:col-span-3">Ajouter le contact</button>
        </form>
      </Card>

      {contacts.length === 0 ? (
        <EmptyState>Aucun contact.</EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {contacts.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="break-words text-sm font-semibold text-slate-800">
                    {c.full_name}
                  </div>
                  <div className="break-words text-xs text-slate-500">
                    {c.role ?? ""}
                    {companyName(c.company_id) ? ` · ${companyName(c.company_id)}` : ""}
                  </div>
                </div>
                <form action={deleteContact}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="rounded px-2 py-1 text-xs text-rose-500 hover:bg-rose-50">
                    ×
                  </button>
                </form>
              </div>
              <div className="mt-2 flex flex-col gap-1 break-words text-xs">
                {c.email && (
                  <a href={`mailto:${c.email}`} className="break-all text-blue-600 underline">
                    {c.email}
                  </a>
                )}
                {c.linkedin_url && (
                  <a
                    href={c.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline"
                  >
                    Profil LinkedIn
                  </a>
                )}
                {c.notes && <div className="text-slate-500">{c.notes}</div>}
              </div>

              {c.email && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  {c.draft_email ? (
                    <details>
                      <summary className="cursor-pointer text-xs font-semibold text-slate-700">
                        Email rédigé{c.draft_subject ? ` — ${c.draft_subject}` : ""}
                      </summary>
                      <p className="mt-2 whitespace-pre-wrap break-words rounded bg-slate-50 p-2 text-xs text-slate-600">
                        {c.draft_email}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <CopyButton
                          text={c.draft_email}
                          label="Copier l'email"
                        />
                        <a
                          href={`mailto:${c.email}?subject=${encodeURIComponent(c.draft_subject ?? "")}&body=${encodeURIComponent(c.draft_email)}`}
                          className="rounded bg-slate-800 px-2 py-1 text-xs text-white"
                        >
                          Ouvrir dans ma messagerie
                        </a>
                        {aiEnabled() && (
                          <form action={draftEmailForContact}>
                            <input type="hidden" name="id" value={c.id} />
                            <button className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100">
                              Régénérer
                            </button>
                          </form>
                        )}
                      </div>
                    </details>
                  ) : aiEnabled() ? (
                    <form action={draftEmailForContact}>
                      <input type="hidden" name="id" value={c.id} />
                      <button className="rounded bg-slate-800 px-2 py-1 text-xs text-white">
                        Rédiger l&apos;email (IA)
                      </button>
                    </form>
                  ) : null}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

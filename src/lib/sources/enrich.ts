import { getAdmin } from "@/lib/supabase/admin";

// Tranches d'effectifs INSEE (code -> libellé).
const EFFECTIF: Record<string, string> = {
  NN: "non employeur",
  "00": "0 sal.",
  "01": "1-2",
  "02": "3-5",
  "03": "6-9",
  "11": "10-19",
  "12": "20-49",
  "21": "50-99",
  "22": "100-199",
  "31": "200-249",
  "32": "250-499",
  "41": "500-999",
  "42": "1000-1999",
  "51": "2000-4999",
  "52": "5000-9999",
  "53": "10000+",
};

type ApiCompany = {
  siren?: string;
  nom_complet?: string;
  categorie_entreprise?: string;
  tranche_effectif_salarie?: string;
  annee_tranche_effectif_salarie?: number;
  activite_principale?: string;
  date_creation?: string;
  finances?: Record<string, { ca?: number; resultat_net?: number }>;
};

async function chunk<T>(items: T[], size: number, fn: (x: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
}

export type EnrichResult = {
  ok: boolean;
  error?: string;
  processed: number;
  matched: number;
};

/**
 * Enrichit les entreprises cibles via l'API publique "Recherche d'entreprises" (data.gouv, sans clé) :
 * catégorie (PME/ETI/GE), tranche d'effectifs, CA + croissance, NAF, ancienneté.
 */
export async function enrichCompanies(cap = 400): Promise<EnrichResult> {
  const db = getAdmin();
  if (!db) return { ok: false, error: "service role manquante", processed: 0, matched: 0 };

  const { data: companies } = await db
    .from("jp_companies")
    .select("id, name, enriched_at")
    .order("enriched_at", { ascending: true, nullsFirst: true })
    .limit(cap);

  let matched = 0;
  const list = companies ?? [];

  await chunk(list, 6, async (c) => {
    try {
      const res = await fetch(
        `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(
          c.name as string,
        )}&page=1&per_page=1&etat_administratif=A`,
        { cache: "no-store" },
      );
      const update: Record<string, unknown> = { enriched_at: new Date().toISOString() };
      if (res.ok) {
        const data = (await res.json()) as { results?: ApiCompany[] };
        const r = (data.results ?? [])[0];
        if (r) {
          matched++;
          update.siren = r.siren ?? null;
          update.insee_name = r.nom_complet ?? null;
          update.categorie_entreprise = r.categorie_entreprise ?? null;
          update.effectif_code = r.tranche_effectif_salarie ?? null;
          update.effectif_label = r.tranche_effectif_salarie
            ? (EFFECTIF[r.tranche_effectif_salarie] ?? null)
            : null;
          update.effectif_year = r.annee_tranche_effectif_salarie ?? null;
          update.naf_code = r.activite_principale ?? null;
          update.date_creation = r.date_creation ?? null;

          const fin = r.finances ?? {};
          const years = Object.keys(fin)
            .map(Number)
            .filter((y) => Number.isFinite(y))
            .sort((a, b) => a - b);
          if (years.length) {
            const ly = years[years.length - 1];
            update.ca = fin[String(ly)]?.ca ?? null;
            update.ca_year = ly;
            update.resultat_net = fin[String(ly)]?.resultat_net ?? null;
            if (years.length >= 2) {
              const prev = fin[String(years[years.length - 2])]?.ca;
              update.ca_prev = prev ?? null;
              if (prev && update.ca)
                update.ca_growth =
                  Math.round((((update.ca as number) - prev) / prev) * 1000) / 10;
            }
          }
        }
      }
      await db.from("jp_companies").update(update).eq("id", c.id);
    } catch {
      /* on laisse enriched_at vide pour réessayer plus tard */
    }
  });

  return { ok: true, processed: list.length, matched };
}

/** Rang de taille à partir du code de tranche d'effectifs (plus grand = plus gros). */
export function effectifRank(code: string | null | undefined): number {
  const order = ["NN", "00", "01", "02", "03", "11", "12", "21", "22", "31", "32", "41", "42", "51", "52", "53"];
  if (!code) return -1;
  return order.indexOf(code);
}

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

  // Concurrence faible : l'API plafonne ~7 req/s ; on évite les 429.
  await chunk(list, 2, async (c) => {
    try {
      const res = await fetch(
        `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(
          c.name as string,
        )}&page=1&per_page=1&etat_administratif=A`,
        { cache: "no-store" },
      );
      // 429 / erreur : on NE tamponne PAS -> la ligne sera réessayée au prochain passage.
      if (!res.ok) return;
      const update: Record<string, unknown> = { enriched_at: new Date().toISOString() };
      {
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

const TYPE_PRIO: Record<string, number> = { C: 3, K: 2, S: 1 };

/**
 * Croissance du CA multi-années via l'API Opendatasoft ratios_inpi_bce (INPI, gratuit, sans clé).
 * Nettoie les exercices "moignon" (filiale/partiel) et plafonne les valeurs aberrantes.
 */
export async function enrichFinancials(cap = 120): Promise<EnrichResult> {
  const db = getAdmin();
  if (!db) return { ok: false, error: "service role manquante", processed: 0, matched: 0 };

  const { data: companies } = await db
    .from("jp_companies")
    .select("id, siren, financials_at")
    .not("siren", "is", null)
    .order("financials_at", { ascending: true, nullsFirst: true })
    .limit(cap);

  const list = companies ?? [];
  let matched = 0;

  await chunk(list, 3, async (c) => {
    try {
      const url = `https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/ratios_inpi_bce/records?where=siren%3D%22${c.siren}%22&select=date_cloture_exercice,chiffre_d_affaires,resultat_net,type_bilan&order_by=date_cloture_exercice&limit=100`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        results?: { date_cloture_exercice?: string; chiffre_d_affaires?: number; resultat_net?: number; type_bilan?: string }[];
      };
      const byYear = new Map<number, { year: number; ca: number; rn: number | null; prio: number }>();
      for (const r of data.results ?? []) {
        if (!r.date_cloture_exercice || r.chiffre_d_affaires == null) continue;
        const y = Number(r.date_cloture_exercice.slice(0, 4));
        const prio = TYPE_PRIO[r.type_bilan ?? ""] ?? 0;
        const ex = byYear.get(y);
        if (!ex || prio > ex.prio) byYear.set(y, { year: y, ca: r.chiffre_d_affaires, rn: r.resultat_net ?? null, prio });
      }
      const s = [...byYear.values()].sort((a, b) => a.year - b.year);
      if (!s.length) return;
      const cas = s.map((x) => x.ca).filter((v) => v > 0).sort((a, b) => a - b);
      const median = cas.length ? cas[Math.floor(cas.length / 2)] : 0;
      const clean = s.filter((x) => x.ca > 0 && (median === 0 || x.ca >= median * 0.15));
      const latest = clean[clean.length - 1] ?? s[s.length - 1];
      const update: Record<string, unknown> = {
        ca: latest.ca,
        ca_year: latest.year,
        resultat_net: latest.rn,
        ca_history: clean.slice(-6).map((x) => ({ year: x.year, ca: x.ca })),
        financials_at: new Date().toISOString(),
        ca_prev: null,
        ca_growth: null,
        ca_cagr: null,
      };
      if (clean.length >= 2) {
        const prev = clean[clean.length - 2];
        const first = clean[0];
        const span = latest.year - first.year;
        const yoy = prev.ca > 0 ? Math.round(((latest.ca - prev.ca) / prev.ca) * 1000) / 10 : null;
        const cagr = span > 0 && first.ca > 0 ? Math.round((Math.pow(latest.ca / first.ca, 1 / span) - 1) * 1000) / 10 : null;
        update.ca_prev = prev.ca;
        update.ca_growth = yoy != null && Math.abs(yoy) <= 400 ? yoy : null;
        update.ca_cagr = cagr != null && cagr <= 150 && cagr >= -95 ? cagr : null;
      }
      matched++;
      await db.from("jp_companies").update(update).eq("id", c.id);
    } catch {
      /* réessai au prochain passage */
    }
  });

  return { ok: true, processed: list.length, matched };
}

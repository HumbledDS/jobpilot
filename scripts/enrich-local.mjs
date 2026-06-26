// Enrichit jp_companies via l'API publique recherche-entreprises, depuis une IP propre.
// Usage: node scripts/enrich-local.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// charge .env.local
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const EFFECTIF = {
  NN: "non employeur", "00": "0 sal.", "01": "1-2", "02": "3-5", "03": "6-9",
  "11": "10-19", "12": "20-49", "21": "50-99", "22": "100-199", "31": "200-249",
  "32": "250-499", "41": "500-999", "42": "1000-1999", "51": "2000-4999",
  "52": "5000-9999", "53": "10000+",
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ORDER = ["NN","00","01","02","03","11","12","21","22","31","32","41","42","51","52","53"];
const erank = (code) => (code ? ORDER.indexOf(code) : -1);
// Parmi les résultats, prend l'entité opérationnelle (plus gros effectif, puis comptes dispo).
function pickBest(results) {
  if (!results?.length) return undefined;
  return [...results].sort((a, b) =>
    (erank(b.tranche_effectif_salarie) - erank(a.tranche_effectif_salarie)) ||
    ((b.finances ? 1 : 0) - (a.finances ? 1 : 0)),
  )[0];
}

const { data: companies, error } = await db
  .from("jp_companies")
  .select("id, name, siren")
  .order("name");
if (error) throw error;

let matched = 0, done = 0;
for (const c of companies) {
  let r;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(
        `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(c.name)}&page=1&per_page=1&etat_administratif=A`,
      );
      if (res.status === 429) { await sleep(1500); continue; }
      if (!res.ok) break;
      const data = await res.json();
      r = (data.results ?? [])[0];
      break;
    } catch {
      await sleep(800);
    }
  }
  const update = { enriched_at: new Date().toISOString() };
  if (r) {
    matched++;
    update.siren = r.siren ?? null;
    update.insee_name = r.nom_complet ?? null;
    update.categorie_entreprise = r.categorie_entreprise ?? null;
    update.effectif_code = r.tranche_effectif_salarie ?? null;
    update.effectif_label = r.tranche_effectif_salarie ? (EFFECTIF[r.tranche_effectif_salarie] ?? null) : null;
    update.effectif_year = r.annee_tranche_effectif_salarie ?? null;
    update.naf_code = r.activite_principale ?? null;
    update.date_creation = r.date_creation ?? null;
    const fin = r.finances ?? {};
    const years = Object.keys(fin).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
    if (years.length) {
      const ly = years[years.length - 1];
      update.ca = fin[String(ly)]?.ca ?? null;
      update.ca_year = ly;
      update.resultat_net = fin[String(ly)]?.resultat_net ?? null;
      if (years.length >= 2) {
        const prev = fin[String(years[years.length - 2])]?.ca;
        update.ca_prev = prev ?? null;
        if (prev && update.ca) update.ca_growth = Math.round(((update.ca - prev) / prev) * 1000) / 10;
      }
    }
  }
  await db.from("jp_companies").update(update).eq("id", c.id);
  done++;
  if (done % 25 === 0) console.log(`${done}/${companies.length} (matched ${matched})`);
  await sleep(160);
}
console.log(`DONE: ${done} traitées, ${matched} enrichies`);

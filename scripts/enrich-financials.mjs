// Historique de CA multi-années via l'API Opendatasoft ratios_inpi_bce (data.economie.gouv.fr, INPI, gratuit, sans clé).
// Calcule croissance YoY + CAGR à partir des SIREN déjà enrichis. Usage: node scripts/enrich-financials.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TYPE_PRIO = { C: 3, K: 2, S: 1 };

async function seriesFor(siren) {
  const url = `https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/ratios_inpi_bce/records?where=siren%3D%22${siren}%22&select=date_cloture_exercice,chiffre_d_affaires,resultat_net,type_bilan&order_by=date_cloture_exercice&limit=100`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  // par année, on garde le bilan le plus prioritaire (C > K > S)
  const byYear = new Map();
  for (const r of data.results ?? []) {
    if (!r.date_cloture_exercice || r.chiffre_d_affaires == null) continue;
    const y = Number(r.date_cloture_exercice.slice(0, 4));
    const prio = TYPE_PRIO[r.type_bilan] ?? 0;
    const ex = byYear.get(y);
    if (!ex || prio > ex.prio) byYear.set(y, { year: y, ca: r.chiffre_d_affaires, rn: r.resultat_net ?? null, prio });
  }
  return [...byYear.values()].sort((a, b) => a.year - b.year);
}

const { data: companies, error } = await db
  .from("jp_companies")
  .select("id, name, siren")
  .not("siren", "is", null)
  .order("name");
if (error) throw error;

let done = 0, withGrowth = 0;
for (const c of companies) {
  let s = null;
  for (let i = 0; i < 3; i++) {
    try { s = await seriesFor(c.siren); break; } catch { await sleep(800); }
  }
  if (s && s.length) {
    // Nettoyage : écarte les années "moignon" (CA hors d'échelle vs la médiane = filiale/exercice partiel).
    const cas = s.map((x) => x.ca).filter((v) => v > 0).sort((a, b) => a - b);
    const median = cas.length ? cas[Math.floor(cas.length / 2)] : 0;
    const clean = s.filter((x) => x.ca > 0 && (median === 0 || x.ca >= median * 0.15));
    const latest = clean[clean.length - 1] ?? s[s.length - 1];
    const update = {
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
      const cagr =
        span > 0 && first.ca > 0
          ? Math.round((Math.pow(latest.ca / first.ca, 1 / span) - 1) * 1000) / 10
          : null;
      // Garde-fous anti-aberration.
      update.ca_prev = prev.ca;
      update.ca_growth = yoy != null && Math.abs(yoy) <= 400 ? yoy : null;
      update.ca_cagr = cagr != null && cagr <= 150 && cagr >= -95 ? cagr : null;
    }
    if (update.ca_growth != null) withGrowth++;
    await db.from("jp_companies").update(update).eq("id", c.id);
  }
  done++;
  if (done % 25 === 0) console.log(`${done}/${companies.length} (croissance: ${withGrowth})`);
  await sleep(120);
}
console.log(`DONE: ${done} sociétés, ${withGrowth} avec croissance CA calculée`);

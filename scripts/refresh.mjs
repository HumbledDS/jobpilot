// Relance le pipeline d'offres : enchaîne les 4 routes cron dans l'ordre
// (ingest → source-targets → enrich-companies → enrich-financials), avec le
// CRON_SECRET lu depuis .env.local. Reproduit les crons Vercel, à la demande.
//
// Usage :
//   npm run refresh                      # cible http://localhost:3000 (dev lancé)
//   npm run refresh -- https://ton-app.vercel.app   # cible la prod
//   APP_BASE_URL=https://ton-app.vercel.app npm run refresh
//
import { readFileSync } from "node:fs";

// Charge .env.local si présent (sinon on se rabat sur l'env du process).
try {
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  // pas de .env.local : on utilise les variables déjà présentes dans l'env.
}

const BASE = (process.argv[2] || process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const SECRET = process.env.CRON_SECRET || "";

// Ordre = celui des crons dans vercel.json.
const STEPS = [
  { label: "Offres (APEC · France Travail · Adzuna)", path: "/api/ingest" },
  { label: "Postes internes ATS (entreprises cibles)", path: "/api/source-targets", query: { cap: 60 } },
  { label: "Enrichissement Sirene (catégorie, effectifs)", path: "/api/enrich-companies", query: { cap: 120 } },
  { label: "Enrichissement financier INPI (CA, croissance)", path: "/api/enrich-financials", query: { cap: 120 } },
];

function urlFor({ path, query }) {
  const u = new URL(path, BASE);
  for (const [k, v] of Object.entries(query || {})) u.searchParams.set(k, String(v));
  if (SECRET) u.searchParams.set("secret", SECRET);
  return u;
}

function redact(u) {
  const c = new URL(u);
  if (c.searchParams.has("secret")) c.searchParams.set("secret", "***");
  return c.toString();
}

console.log(`\n▸ Pipeline JobPilot → ${BASE}`);
if (!SECRET) console.log("  ⚠ CRON_SECRET absent : ok si les routes ne sont pas protégées, sinon 401.");

let failures = 0;

for (let i = 0; i < STEPS.length; i++) {
  const step = STEPS[i];
  const u = urlFor(step);
  const n = `${i + 1}/${STEPS.length}`;
  const t0 = Date.now();
  process.stdout.write(`\n[${n}] ${step.label}\n      ${redact(u)}\n`);
  try {
    const res = await fetch(u, { headers: SECRET ? { authorization: `Bearer ${SECRET}` } : {} });
    const ms = Date.now() - t0;
    const body = await res.text();
    let summary = body.slice(0, 400);
    try {
      const j = JSON.parse(body);
      // /api/ingest renvoie { runs, total_inserted } : on résume joliment.
      if (Array.isArray(j.runs)) {
        const per = j.runs.map((r) => `${r.source}: ${r.ok ? `${r.inserted} insérées` : `ERR ${r.error ?? ""}`}`).join(" · ");
        summary = `total insérées: ${j.total_inserted} — ${per}`;
      } else {
        summary = JSON.stringify(j);
      }
    } catch {
      // corps non-JSON : on garde le texte tronqué.
    }
    if (res.ok) {
      console.log(`      ✓ ${res.status} en ${ms} ms — ${summary}`);
    } else {
      failures++;
      console.log(`      ✗ ${res.status} en ${ms} ms — ${summary}`);
      if (res.status === 401) console.log("        → 401 : vérifie CRON_SECRET (doit matcher la valeur déployée).");
    }
  } catch (e) {
    failures++;
    console.log(`      ✗ échec réseau — ${e instanceof Error ? e.message : String(e)}`);
    if (BASE.includes("localhost")) console.log("        → serveur dev non lancé ? fais `npm run dev` dans un autre terminal.");
  }
}

console.log(`\n${failures === 0 ? "✓ Pipeline terminé sans erreur." : `✗ Pipeline terminé avec ${failures} étape(s) en échec.`}\n`);
process.exit(failures === 0 ? 0 : 1);

import type { Job, Application, ApplicationStatus } from "@/lib/types";

export function skillDemand(jobs: Job[]): { skill: string; count: number }[] {
  const m = new Map<string, number>();
  for (const j of jobs) {
    const set = new Set([...(j.matched_skills ?? []), ...(j.missing_skills ?? [])]);
    for (const s of set) m.set(s, (m.get(s) ?? 0) + 1);
  }
  return [...m]
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count);
}

export function roleDemand(
  jobs: Job[],
): { role: string; count: number; avgSalary: number | null }[] {
  const m = new Map<string, { count: number; sal: number[] }>();
  for (const j of jobs) {
    const r = j.role_family ?? "Autre";
    const e = m.get(r) ?? { count: 0, sal: [] };
    e.count++;
    const top = j.salary_max ?? j.salary_min;
    if (top) e.sal.push(top);
    m.set(r, e);
  }
  return [...m]
    .map(([role, e]) => ({
      role,
      count: e.count,
      avgSalary: e.sal.length
        ? Math.round(e.sal.reduce((a, b) => a + b, 0) / e.sal.length)
        : null,
    }))
    .sort((a, b) => b.count - a.count);
}

export function salaryStats(jobs: Job[]): {
  n: number;
  min: number | null;
  median: number | null;
  max: number | null;
} {
  const vals = jobs
    .map((j) => j.salary_max ?? j.salary_min)
    .filter((v): v is number => !!v && v > 0)
    .sort((a, b) => a - b);
  if (!vals.length) return { n: 0, min: null, median: null, max: null };
  return {
    n: vals.length,
    min: vals[0],
    median: vals[Math.floor(vals.length / 2)],
    max: vals[vals.length - 1],
  };
}

// Agrégateurs / job boards qui apparaissent comme "entreprise" mais ne sont pas l'employeur réel.
const AGGREGATORS = /hellowork|meteojob|talents handicap|direct emploi|jobijoba|regionsjob|cadremploi|indeed|jobteaser|figaro|keljob/i;

export type Trust = "solide" | "ok" | "esn" | "freelance" | "inconnue";
const SOLID_CATS = new Set(["Big Tech", "Produit/Scale-up", "Grand compte", "Éditeur", "Data/IA"]);
const OK_CATS = new Set(["Conseil", "Cloud/DevOps"]);

// Plateformes de freelancing : on ne connaît pas le vrai donneur d'ordre derrière l'offre.
const FREELANCE_PLATFORMS =
  /collective\.?work|\bmalt\b|\bcomet\b|cr[eè]me de la cr[eè]me|freelance\.com|\bfiverr\b|\bupwork\b|\bcrme\b|beager|404\s*works/i;
// ESN qui recrutent sur mission (pas d'emploi interne) : postes "vivier", marge sur le candidat.
const MISSION_ESN =
  /\bjems\b|soma\s*group|soma\b|datatorii|valoway|pme\s*job|pmejob|\besn\b|infotel|akka|alten|expleo|mindquest|free-?work|consulting group|talan|astek|sopra|capgemini|inetum|devoteam|umanis|micropole|keyrus|hardis|sqli/i;

function trustForName(name: string): Trust | null {
  if (FREELANCE_PLATFORMS.test(name)) return "freelance";
  if (MISSION_ESN.test(name)) return "esn";
  return null;
}

/** Confiance d'une entreprise par nom puis catégorie du référentiel. */
export function resolveTrust(
  name: string | null,
  targets: { name: string; category: string | null }[],
): Trust {
  if (!name) return "inconnue";
  const byName = trustForName(name);
  if (byName) return byName;
  const c = name.toLowerCase();
  const t = targets.find((x) => {
    const n = x.name.toLowerCase();
    return c.includes(n) || n.includes(c);
  });
  return trustForCategory(t?.category ?? null);
}

/** Segmentation du marché : employeurs établis vs intermédiaires (ESN/freelance). */
export function offerSegments(
  jobs: Job[],
  targets: { name: string; category: string | null }[],
) {
  let etabli = 0, intermediaire = 0, autre = 0, direct = 0;
  for (const j of jobs) {
    if (j.from_target) direct++;
    const t = resolveTrust(j.company_name, targets);
    if (t === "solide" || t === "ok") etabli++;
    else if (t === "esn" || t === "freelance") intermediaire++;
    else autre++;
  }
  const n = jobs.length || 1;
  return {
    total: jobs.length,
    direct,
    etabli,
    intermediaire,
    autre,
    pctEtabli: Math.round((etabli / n) * 100),
    pctInter: Math.round((intermediaire / n) * 100),
  };
}

// Divisions NAF -> secteur lisible.
const NAF_SECTOR: Record<string, string> = {
  "58": "Édition / logiciel", "59": "Audiovisuel", "60": "Médias", "61": "Télécoms",
  "62": "Informatique / logiciel", "63": "Services d'information",
  "64": "Banque / finance", "65": "Assurance", "66": "Services financiers",
  "68": "Immobilier", "70": "Conseil / siège", "71": "Ingénierie", "72": "R&D",
  "73": "Publicité / marketing", "74": "Activités spécialisées", "77": "Location",
  "78": "RH / recrutement", "82": "Services aux entreprises",
  "46": "Commerce de gros", "47": "Commerce de détail", "45": "Automobile",
  "35": "Énergie", "49": "Transport", "50": "Transport maritime", "51": "Transport aérien",
  "52": "Logistique", "53": "Courrier", "85": "Enseignement", "86": "Santé",
  "10": "Industrie", "20": "Chimie", "21": "Pharmacie", "26": "Électronique",
  "27": "Équipements", "28": "Machines", "29": "Automobile (industrie)", "30": "Aéronautique",
};
export function nafSector(code: string | null | undefined): string | null {
  if (!code) return null;
  const d = code.replace(/\D/g, "").slice(0, 2);
  return NAF_SECTOR[d] ?? "Autre secteur";
}

function trustForCategory(cat: string | null): Trust {
  if (!cat) return "inconnue";
  if (SOLID_CATS.has(cat)) return "solide";
  if (OK_CATS.has(cat)) return "ok";
  if (cat === "ESN") return "esn";
  return "inconnue";
}

export type TargetMeta = {
  name: string;
  category: string | null;
  categorieEntreprise?: string | null; // PME / ETI / GE
  caGrowth?: number | null;
  caCagr?: number | null;
  ca?: number | null;
  effectifLabel?: string | null;
  effectifCode?: string | null;
};

export type HiringRow = {
  company: string;
  offers: number;
  avgSalary: number | null;
  avgScore: number;
  topRole: string | null;
  latest: string | null;
  category: string | null;
  trust: Trust;
  harvestFlag: boolean; // ESN/inconnue qui publie beaucoup -> sourcing probable
  priority: number;
  categorieEntreprise?: string | null;
  caGrowth?: number | null;
  caCagr?: number | null;
  ca?: number | null;
  effectifLabel?: string | null;
};

const BIG_EFFECTIF = new Set(["42", "51", "52", "53"]); // >= 1000 salariés

/**
 * Which companies are actively hiring (targeting signal), pondéré par la confiance.
 * On privilégie les entreprises établies (produit/scale-up/grand compte/éditeur),
 * on déclasse les ESN qui publient en masse (souvent pour sourcer des candidats).
 */
export function companiesHiring(
  jobs: Job[],
  targets: TargetMeta[] = [],
): HiringRow[] {
  const m = new Map<
    string,
    { offers: number; sal: number[]; scores: number[]; roles: Record<string, number>; latest: string | null }
  >();
  for (const j of jobs) {
    const name = (j.company_name ?? "").trim();
    if (!name || AGGREGATORS.test(name)) continue;
    const e = m.get(name) ?? { offers: 0, sal: [], scores: [], roles: {}, latest: null };
    e.offers++;
    const top = j.salary_max ?? j.salary_min;
    if (top) e.sal.push(top);
    if (j.match_score != null) e.scores.push(j.match_score);
    const rf = j.role_family ?? "Autre";
    e.roles[rf] = (e.roles[rf] ?? 0) + 1;
    if (j.posted_at && (!e.latest || j.posted_at > e.latest)) e.latest = j.posted_at;
    m.set(name, e);
  }

  const findTarget = (company: string): TargetMeta | null => {
    const c = company.toLowerCase();
    return (
      targets.find((x) => {
        const n = x.name.toLowerCase();
        return c.includes(n) || n.includes(c);
      }) ?? null
    );
  };

  return [...m]
    .map(([company, e]) => {
      const avgSalary = e.sal.length ? Math.round(e.sal.reduce((a, b) => a + b, 0) / e.sal.length) : null;
      const avgScore = e.scores.length ? Math.round(e.scores.reduce((a, b) => a + b, 0) / e.scores.length) : 0;
      const t = findTarget(company);
      const category = t?.category ?? null;
      // Le nom prime (freelance/ESN-mission), sinon la catégorie du référentiel.
      const trust = trustForName(company) ?? trustForCategory(category);
      const harvestFlag =
        (trust === "esn" || trust === "freelance" || trust === "inconnue") && e.offers >= 4;
      let priority = avgScore;
      priority +=
        trust === "solide" ? 25
        : trust === "ok" ? 10
        : trust === "esn" ? -25
        : trust === "freelance" ? -40
        : -5;
      if (avgSalary && avgSalary >= 60000) priority += 10;
      else if (avgSalary && avgSalary >= 50000) priority += 5;
      if (harvestFlag) priority -= 15;
      // Assise (enrichissement INSEE/data.gouv) : taille + croissance du CA
      if (t?.categorieEntreprise === "GE") priority += 12;
      else if (t?.categorieEntreprise === "ETI") priority += 6;
      if (t?.effectifCode && BIG_EFFECTIF.has(t.effectifCode)) priority += 5;
      // Croissance : on préfère le CAGR (plus stable) au YoY.
      const growth = t?.caCagr ?? t?.caGrowth;
      if (growth != null) {
        if (growth >= 15) priority += 10;
        else if (growth > 0) priority += 5;
        else if (growth < 0) priority -= 8;
      }
      return {
        company,
        offers: e.offers,
        avgSalary,
        avgScore,
        topRole: Object.entries(e.roles).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
        latest: e.latest,
        category,
        trust,
        harvestFlag,
        priority,
        categorieEntreprise: t?.categorieEntreprise ?? null,
        caGrowth: t?.caGrowth ?? null,
        caCagr: t?.caCagr ?? null,
        ca: t?.ca ?? null,
        effectifLabel: t?.effectifLabel ?? null,
      };
    })
    .sort((a, b) => b.priority - a.priority || b.offers - a.offers);
}

const SENT_STATUSES: ApplicationStatus[] = [
  "postule", "relance", "entretien", "offre", "refuse", "sans_reponse",
];

/** Funnel + rates + weekly cadence over the user's applications. */
export function applicationStats(apps: Application[]) {
  const by = (s: ApplicationStatus) => apps.filter((a) => a.status === s).length;
  const total = apps.length;
  const sent = apps.filter((a) => SENT_STATUSES.includes(a.status)).length;
  const interviews = by("entretien") + by("offre");
  const offers = by("offre");
  const responded = interviews + by("refuse");
  const responseRate = sent ? Math.round((responded / sent) * 100) : 0;
  const interviewRate = sent ? Math.round((interviews / sent) * 100) : 0;

  // last 6 ISO-ish weeks by created_at
  const now = Date.now();
  const weeks = Array.from({ length: 6 }, (_, i) => {
    const end = now - i * 7 * 86400000;
    const start = end - 7 * 86400000;
    const n = apps.filter((a) => {
      const t = new Date(a.created_at).getTime();
      return t >= start && t < end;
    }).length;
    return { label: i === 0 ? "cette sem." : `-${i} sem.`, n };
  }).reverse();

  const bySource: Record<string, number> = {};
  for (const a of apps) {
    const s = a.source_channel ?? "manuel";
    bySource[s] = (bySource[s] ?? 0) + 1;
  }

  return { total, sent, interviews, offers, responded, responseRate, interviewRate, weeks, bySource, by };
}

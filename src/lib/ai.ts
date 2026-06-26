import Anthropic from "@anthropic-ai/sdk";

/** AI is optional: everything degrades gracefully when no key is set. */
export function aiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const MODEL = process.env.AI_MODEL || "claude-opus-4-8";

function client() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic(); // reads ANTHROPIC_API_KEY from env
}

async function complete(
  system: string,
  user: string,
  maxTokens = 1500,
): Promise<string | null> {
  const c = client();
  if (!c) return null;
  const res = await c.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  return res.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("\n")
    .trim();
}

function parseJson<T>(text: string): T | null {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]) as T;
      } catch {}
    }
    return null;
  }
}

export const SIGNATURE = `Babacar Gueye
babacar.work2024@gmail.com · +33 6 79 81 97 72
LinkedIn : linkedin.com/in/babacargueye1 · GitHub : github.com/humbledDS`;

/** Detect candidate contact emails inside an offer's text. */
export function extractEmails(text?: string | null): string[] {
  if (!text) return [];
  const found = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) ?? [];
  return [
    ...new Set(
      found
        .map((e) => e.toLowerCase())
        .filter((e) => !/(no-?reply|noreply|exemple|example|\.png|\.jpg)/.test(e)),
    ),
  ];
}

const PROFILE_CONTEXT = `Babacar Gueye — Forward Deployed / Solutions Engineer, profil Cloud & Data.
Socle maths/stats (M2 Stats + DU Big Data), ~3 ans de pratique (stages, CDD quant, missions freelance).
Stack: Python, SQL, Spark, Airflow, dbt, Snowflake, Databricks, AWS/GCP/Azure, Docker, Kubernetes, Terraform, APIs, MCP.
Enseigne la data (Deep Learning, Data Engineering, Django, DevOps) en Master. Cible: postes data/cloud/IA à 50k€+ en Île-de-France.`;

/** Generate a LinkedIn post draft. Returns null if AI disabled. */
export async function generatePostAI(input: {
  topic: string;
  angle: string;
  course?: string | null;
}): Promise<{ hook: string; body: string; hashtags: string[] } | null> {
  const system = `Tu es un assistant qui écrit des posts LinkedIn techniques en français pour ${PROFILE_CONTEXT}
Règles: ton authentique et expert, jamais arrogant. Pas d'emojis. Pas de superlatifs creux. Accroche courte et percutante, corps clair et structuré (listes courtes ok), termine par une question d'engagement. 150-250 mots max pour le corps.
Réponds UNIQUEMENT en JSON: {"hook": "...", "body": "...", "hashtags": ["#...","#..."]}`;
  const user = `Sujet: ${input.topic}\nAngle: ${input.angle}${input.course ? `\nContexte (cours enseigné): ${input.course}` : ""}\nÉcris le post.`;
  const out = await complete(system, user, 1500);
  if (!out) return null;
  const parsed = parseJson<{ hook: string; body: string; hashtags: string[] }>(out);
  if (!parsed) return { hook: "", body: out, hashtags: [] };
  return {
    hook: parsed.hook ?? "",
    body: parsed.body ?? "",
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
  };
}

/** Generate a cover letter tailored to an offer. Returns null if AI disabled. */
export async function generateCoverLetterAI(input: {
  jobTitle: string;
  company?: string | null;
  jobDescription?: string | null;
  tone?: string | null;
}): Promise<string | null> {
  const system = `Tu écris des lettres de motivation en français pour ${PROFILE_CONTEXT}
Règles: honnête (ne jamais inventer d'expérience), concis (250-320 mots), structuré (accroche, adéquation profil/poste, valeur ajoutée, conclusion), ${input.tone ? `ton ${input.tone}, ` : ""}orienté impact. Pas d'emojis. Pas de formules creuses ("dynamique et motivé").`;
  const user = `Poste: ${input.jobTitle}${input.company ? `\nEntreprise: ${input.company}` : ""}${input.jobDescription ? `\nDescription de l'offre:\n${input.jobDescription.slice(0, 2000)}` : ""}\nÉcris la lettre.`;
  return complete(system, user, 1200);
}

/** Generate a portfolio project idea aligned with the target positioning. */
export async function generateProjectIdeaAI(input: {
  theme?: string | null;
  role?: string | null;
  cloud?: string | null;
}): Promise<{
  name: string;
  description: string;
  target_role: string;
  cloud: string;
} | null> {
  const system = `Tu proposes des idées de projets portfolio data/cloud/IA pour ${PROFILE_CONTEXT}
But: prouver les compétences pour des postes Data Engineer / Cloud / Platform / Forward Deployed / Architect. Le projet doit être réalisable seul, déployable, et différenciant (idéalement MCP, API, cloud-native, streaming, data quality, IaC…).
Réponds UNIQUEMENT en JSON: {"name":"...","description":"... (1-2 phrases, ce qu'on construit et ce que ça prouve)","target_role":"...","cloud":"AWS|GCP|Azure|multi|Vercel..."}`;
  const user = `${input.theme ? `Thème souhaité: ${input.theme}\n` : ""}${input.role ? `Rôle visé: ${input.role}\n` : ""}${input.cloud ? `Cloud préféré: ${input.cloud}\n` : ""}Propose UNE idée de projet.`;
  const out = await complete(system, user, 700);
  if (!out) return null;
  const p = parseJson<{ name: string; description: string; target_role: string; cloud: string }>(out);
  if (!p) return null;
  return {
    name: p.name ?? "Projet",
    description: p.description ?? "",
    target_role: p.target_role ?? "",
    cloud: p.cloud ?? "",
  };
}

/** Generate a concrete build brief for a project (objective, stack, steps, deliverables). */
export async function generateProjectBriefAI(input: {
  name: string;
  description?: string | null;
  targetRole?: string | null;
  cloud?: string | null;
}): Promise<string | null> {
  const system = `Tu écris un brief de projet technique actionnable en français pour ${PROFILE_CONTEXT}
Format en sections courtes: Objectif · Stack · Architecture (3-5 puces) · Étapes (numérotées, MVP d'abord) · Livrables (repo, déploiement, README, tests) · Ce que ça prouve en entretien. Concret et réaliste pour une personne seule. Pas d'emojis.`;
  const user = `Projet: ${input.name}\n${input.description ? `Description: ${input.description}\n` : ""}${input.targetRole ? `Rôle visé: ${input.targetRole}\n` : ""}${input.cloud ? `Cloud: ${input.cloud}\n` : ""}Écris le brief.`;
  return complete(system, user, 1400);
}

/** Generate a short application email to a recruiter, signed with the profile. */
export async function generateApplicationEmailAI(input: {
  jobTitle: string;
  company?: string | null;
  jobDescription?: string | null;
  contactName?: string | null;
}): Promise<{ subject: string; body: string } | null> {
  const system = `Tu écris un email de prise de contact / candidature en français pour ${PROFILE_CONTEXT}
Règles: court (120-180 mots), poli mais direct, accroche personnalisée sur le poste/l'entreprise, 2-3 phrases sur l'adéquation (sans inventer d'expérience), proposition d'échange, puis la signature EXACTE ci-dessous.
Signature à mettre à la fin, telle quelle:
${SIGNATURE}
Réponds UNIQUEMENT en JSON: {"subject": "...", "body": "..."}. Le body inclut la formule d'appel, le corps, et la signature.`;
  const user = `Poste: ${input.jobTitle}${input.company ? `\nEntreprise: ${input.company}` : ""}${input.contactName ? `\nDestinataire: ${input.contactName}` : ""}${input.jobDescription ? `\nDescription de l'offre:\n${input.jobDescription.slice(0, 1500)}` : ""}\nÉcris l'email.`;
  const out = await complete(system, user, 900);
  if (!out) return null;
  const parsed = parseJson<{ subject: string; body: string }>(out);
  if (!parsed) return { subject: `Candidature — ${input.jobTitle}`, body: out };
  return {
    subject: parsed.subject ?? `Candidature — ${input.jobTitle}`,
    body: parsed.body ?? "",
  };
}

export type AiFocusAction = {
  label: string;
  category: string;
  cadence: "daily" | "weekly";
  rationale: string;
};

/** Coach génératif : un focus priorisé, calé sur le contexte de recherche. */
export async function generateCoachFocusAI(ctx: {
  appsThisWeek: number;
  weeklyAppGoal: number;
  responseRate: number;
  sentTotal: number;
  pendingFollowups: number;
  strongMatches: number;
  topGapSkills: string[];
  inProgressProjects: number;
  remainingProjects: number;
  topCompanies: string[];
  postsThisWeek: number;
  weeklyPostGoal: number;
  recentDone: string[];
}): Promise<AiFocusAction[] | null> {
  const system = `Tu es le coach de recherche d'emploi de ${PROFILE_CONTEXT}
Objectif : décrocher un poste Data/Cloud/IA à 50k€+ en Île-de-France.
Tu donnes un focus court, concret et priorisé, calé STRICTEMENT sur le contexte fourni. Zéro généralité.
Réponds UNIQUEMENT en JSON : {"actions":[{"label","category","cadence","rationale"}]} avec 3 à 4 actions.
- label : action impérative et précise (max ~12 mots).
- category : une de [Candidater, Relance, Compétence, Projet, Visibilité, Ciblage, Réseau].
- cadence : "daily" ou "weekly".
- rationale : 1 phrase qui justifie en CITANT le contexte (chiffres, entreprises, compétences précises).`;
  const user = `Contexte du moment :
- Candidatures cette semaine : ${ctx.appsThisWeek}/${ctx.weeklyAppGoal} (taux de réponse ${ctx.responseRate}% sur ${ctx.sentTotal} envoyées)
- Candidatures en attente à relancer : ${ctx.pendingFollowups}
- Offres à fort match non encore traitées : ${ctx.strongMatches}
- Compétences les plus demandées hors de son profil : ${ctx.topGapSkills.join(", ") || "—"}
- Projets en cours : ${ctx.inProgressProjects} ; projets restants à aboutir : ${ctx.remainingProjects}
- Entreprises établies qui recrutent activement : ${ctx.topCompanies.join(", ") || "—"}
- Posts LinkedIn cette semaine : ${ctx.postsThisWeek}/${ctx.weeklyPostGoal}
- Déjà fait récemment (ne pas reproposer) : ${ctx.recentDone.join(" ; ") || "rien"}
Donne le focus prioritaire.`;
  const out = await complete(system, user, 900);
  if (!out) return null;
  const parsed = parseJson<{ actions: AiFocusAction[] }>(out);
  return parsed?.actions ?? null;
}

// Coach règle-based : recommandations de focus motivées par le contexte
// (marché, candidatures, projets, visibilité). Pur et déterministe.

export type Cadence = "daily" | "weekly" | "once";

export type Rec = {
  key: string;
  label: string;
  category: string;
  cadence: Cadence;
  rationale: string;
  href?: string;
};

export type CoachContext = {
  appsThisWeek: number;
  weeklyAppGoal: number;
  postsThisWeek: number;
  weeklyPostGoal: number;
  pendingFollowups: number; // candidatures postulé/relance sans réponse depuis >7j
  strongMatches: number; // offres à fort match (>=75)
  topGapSkill: string | null;
  inProgressProjects: number;
  remainingProjects: number; // projets pas encore aboutis
  topCompany: string | null; // meilleure entreprise établie qui recrute
  responseRate: number;
  sentTotal: number;
};

export function buildRecommendations(c: CoachContext): Rec[] {
  const recs: Rec[] = [];

  // 1. Candidater (quotidien) · moteur principal
  const remainingApps = Math.max(0, c.weeklyAppGoal - c.appsThisWeek);
  if (remainingApps > 0) {
    recs.push({
      key: "apply_today",
      label: "Prépare et envoie 2 candidatures ciblées aujourd'hui",
      category: "Candidater",
      cadence: "daily",
      rationale:
        `Objectif ${c.weeklyAppGoal}/sem (déjà ${c.appsThisWeek}). ` +
        (c.strongMatches > 0
          ? `${c.strongMatches} offre(s) à fort match t'attendent · utilise le co-pilote.`
          : "Vise d'abord les offres au meilleur score."),
      href: "/jobs?minScore=75",
    });
  }

  // 2. Relances (quotidien)
  if (c.pendingFollowups > 0) {
    recs.push({
      key: "followups",
      label: `Relance ${c.pendingFollowups} candidature(s) en attente`,
      category: "Relance",
      cadence: "daily",
      rationale: "Une relance à J+7 réactive le dossier et augmente nettement le taux de réponse.",
      href: "/applications",
    });
  }

  // 3. Compétence à monter (hebdo) · piloté par le marché
  if (c.topGapSkill) {
    recs.push({
      key: `skill_${c.topGapSkill}`,
      label: `Avance sur ${c.topGapSkill} (projet ou lecture)`,
      category: "Compétence",
      cadence: "weekly",
      rationale: `Très demandé sur tes offres et absent de ton profil · combler l'écart débloque des postes.`,
      href: "/marche",
    });
  }

  // 4. Projet (hebdo) · preuve du titre FDE/Cloud
  if (c.inProgressProjects > 0) {
    recs.push({
      key: "project_push",
      label: "Fais avancer (ou déploie) un projet en cours",
      category: "Projet",
      cadence: "weekly",
      rationale: "Un projet déployé avec README pèse plus que dix lignes de CV. Pousse-le jusqu'au live.",
      href: "/projects",
    });
  } else if (c.remainingProjects > 0) {
    recs.push({
      key: "project_start",
      label: "Démarre le prochain projet (génère un brief)",
      category: "Projet",
      cadence: "weekly",
      rationale: "Chaque projet abouti renforce ta crédibilité FDE / Cloud / Architect.",
      href: "/projects",
    });
  }

  // 5. Visibilité LinkedIn (hebdo)
  const remainingPosts = Math.max(0, c.weeklyPostGoal - c.postsThisWeek);
  if (remainingPosts > 0) {
    recs.push({
      key: "post_week",
      label: "Publie un post technique sur LinkedIn",
      category: "Visibilité",
      cadence: "weekly",
      rationale: `Objectif ${c.weeklyPostGoal}/sem (déjà ${c.postsThisWeek}). La visibilité fait venir les recruteurs à toi.`,
      href: "/contenu",
    });
  }

  // 6. Ciblage entreprise établie (hebdo)
  if (c.topCompany) {
    recs.push({
      key: "target_company",
      label: `Identifie un interlocuteur chez ${c.topCompany}`,
      category: "Ciblage",
      cadence: "weekly",
      rationale: "Entreprise établie qui recrute activement · un contact interne court-circuite l'ATS.",
      href: "/companies",
    });
  }

  return recs;
}

/** Une reco est-elle déjà faite dans sa fenêtre de cadence ? (daily ~ aujourd'hui, weekly ~ 7j) */
export function doneInWindow(cadence: Cadence, doneAt: string | null | undefined): boolean {
  if (!doneAt) return false;
  const age = Date.now() - new Date(doneAt).getTime();
  if (cadence === "daily") return age < 18 * 3600 * 1000;
  if (cadence === "weekly") return age < 7 * 86400 * 1000;
  return true; // once
}

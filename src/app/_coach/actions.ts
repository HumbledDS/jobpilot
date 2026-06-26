"use server";

import { getAdmin } from "@/lib/supabase/admin";
import {
  getApplications,
  getJobs,
  getSkillProjects,
  getPosts,
  getSettings,
  getProfile,
  getTargetCompanies,
  getCoachTasks,
} from "@/lib/db";
import { skillDemand, companiesHiring } from "@/lib/analytics";
import { generateCoachFocusAI } from "@/lib/ai";
import { revalidatePath } from "next/cache";

function s(fd: FormData, k: string) {
  return (fd.get(k) as string | null)?.trim() ?? "";
}

/** Coach génératif : demande un focus à l'IA et le persiste comme tâches traçables. */
export async function generateAiFocus() {
  const db = getAdmin();
  if (!db) return;

  const [apps, jobs, projects, posts, settings, profile, targets, coachTasks] = await Promise.all([
    getApplications(),
    getJobs("score"),
    getSkillProjects(),
    getPosts(),
    getSettings(),
    getProfile(),
    getTargetCompanies(),
    getCoachTasks(),
  ]);

  const weekAgo = Date.now() - 7 * 86400000;
  const profileSkills = new Set(profile?.skills ?? []);
  const topGapSkills = skillDemand(jobs)
    .filter((d) => !profileSkills.has(d.skill))
    .slice(0, 4)
    .map((d) => d.skill);
  const hiring = companiesHiring(
    jobs,
    targets.map((t) => ({
      name: t.name,
      category: t.category,
      categorieEntreprise: t.categorie_entreprise,
      caGrowth: t.ca_growth,
      effectifCode: t.effectif_code,
    })),
  );
  const topCompanies = hiring
    .filter((h) => h.trust === "solide" || h.trust === "ok")
    .slice(0, 5)
    .map((h) => h.company);
  const sent = apps.filter((a) =>
    ["postule", "relance", "entretien", "offre", "refuse", "sans_reponse"].includes(a.status),
  ).length;
  const interviews = apps.filter((a) => a.status === "entretien" || a.status === "offre").length;

  const focus = await generateCoachFocusAI({
    appsThisWeek: apps.filter((a) => new Date(a.created_at).getTime() >= weekAgo).length,
    weeklyAppGoal: settings.weekly_application_goal,
    responseRate: sent ? Math.round((interviews / sent) * 100) : 0,
    sentTotal: sent,
    pendingFollowups: apps.filter(
      (a) => (a.status === "postule" || a.status === "relance") && new Date(a.updated_at).getTime() < weekAgo,
    ).length,
    strongMatches: jobs.filter((j) => (j.match_score ?? 0) >= 75).length,
    topGapSkills,
    inProgressProjects: projects.filter((p) => p.status === "in_progress").length,
    remainingProjects: projects.filter((p) => p.status !== "deployed" && p.status !== "done").length,
    topCompanies,
    postsThisWeek: posts.filter((p) => p.published_at && new Date(p.published_at).getTime() >= weekAgo).length,
    weeklyPostGoal: settings.weekly_post_goal,
    recentDone: coachTasks
      .filter((t) => t.status === "done" && t.done_at && new Date(t.done_at).getTime() >= weekAgo)
      .map((t) => t.label)
      .slice(0, 6),
  }).catch(() => null);

  if (focus && focus.length) {
    // Remplace le focus IA précédent (todos non faits).
    await db.from("jp_coach_tasks").delete().like("key", "ai:%").eq("status", "todo");
    await db.from("jp_coach_tasks").insert(
      focus.slice(0, 4).map((f, i) => ({
        key: `ai:${i}`,
        label: f.label,
        category: f.category || "IA",
        cadence: f.cadence === "daily" ? "daily" : "weekly",
        rationale: f.rationale,
        status: "todo",
      })),
    );
  }
  revalidatePath("/");
}

/** Marque une recommandation du coach comme faite (tracée + réinjectée dans le contexte). */
export async function completeRecommendation(fd: FormData) {
  const db = getAdmin();
  if (!db) return;
  const key = s(fd, "key");
  if (!key) return;
  await db.from("jp_coach_tasks").insert({
    key,
    label: s(fd, "label") || key,
    category: s(fd, "category") || null,
    cadence: (s(fd, "cadence") || "weekly") as "daily" | "weekly" | "once",
    rationale: s(fd, "rationale") || null,
    status: "done",
    done_at: new Date().toISOString(),
  });
  revalidatePath("/");
}

/** Annule une complétion (supprime la dernière trace 'done' pour cette clé). */
export async function undoRecommendation(fd: FormData) {
  const db = getAdmin();
  if (!db) return;
  const key = s(fd, "key");
  if (!key) return;
  const { data } = await db
    .from("jp_coach_tasks")
    .select("id")
    .eq("key", key)
    .eq("status", "done")
    .order("done_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const id = (data as { id?: string } | null)?.id;
  if (id) await db.from("jp_coach_tasks").delete().eq("id", id);
  revalidatePath("/");
}

/** Ajoute une tâche perso. */
export async function addCustomTask(fd: FormData) {
  const db = getAdmin();
  if (!db) return;
  const label = s(fd, "label");
  if (!label) return;
  await db.from("jp_coach_tasks").insert({
    key: "custom",
    label,
    category: "Perso",
    cadence: (s(fd, "cadence") || "weekly") as "daily" | "weekly" | "once",
    status: "todo",
  });
  revalidatePath("/");
}

export async function completeTask(fd: FormData) {
  const db = getAdmin();
  if (!db) return;
  const id = s(fd, "id");
  if (!id) return;
  await db
    .from("jp_coach_tasks")
    .update({ status: "done", done_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/");
}

export async function deleteTask(fd: FormData) {
  const db = getAdmin();
  if (!db) return;
  const id = s(fd, "id");
  if (!id) return;
  await db.from("jp_coach_tasks").delete().eq("id", id);
  revalidatePath("/");
}

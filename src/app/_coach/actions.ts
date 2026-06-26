"use server";

import { getAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

function s(fd: FormData, k: string) {
  return (fd.get(k) as string | null)?.trim() ?? "";
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

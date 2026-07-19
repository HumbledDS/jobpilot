"use server";

import { getAdmin } from "@/lib/supabase/admin";
import { generateCoursePlanAI } from "@/lib/ai";
import { revalidatePath } from "next/cache";

const str = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v.length ? v : null;
};

async function nextOrderIndex(db: NonNullable<ReturnType<typeof getAdmin>>) {
  const { data } = await db
    .from("jp_courses")
    .select("order_index")
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data?.order_index as number) ?? 0) + 1;
}

export async function createCourse(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const title = str(formData, "title");
  if (!title) return;
  await db.from("jp_courses").insert({
    title,
    provider: str(formData, "provider"),
    skill: str(formData, "skill"),
    url: str(formData, "url"),
    status: "todo",
    progress: 0,
    order_index: await nextOrderIndex(db),
  });
  revalidatePath("/formation");
}

export async function updateCourse(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const id = str(formData, "id");
  if (!id) return;
  const status = str(formData, "status") ?? "todo";
  const rawProgress = Number(formData.get("progress") ?? 0);
  let progress = Number.isFinite(rawProgress) ? Math.round(rawProgress) : 0;
  progress = Math.max(0, Math.min(100, progress));
  // Cohérence statut ↔ progression.
  if (status === "done") progress = 100;
  else if (status === "todo") progress = 0;
  await db
    .from("jp_courses")
    .update({
      status,
      progress,
      url: str(formData, "url"),
      completed_at: status === "done" ? new Date().toISOString() : null,
      started_at: status === "in_progress" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  revalidatePath("/formation");
}

export async function generateCoursePlan(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const id = str(formData, "id");
  if (!id) return;
  const { data: c } = await db
    .from("jp_courses")
    .select("title, skill")
    .eq("id", id)
    .maybeSingle();
  if (!c) return;
  const plan = await generateCoursePlanAI({
    skill: (c.skill as string | null) ?? (c.title as string),
    title: c.title as string | null,
  }).catch(() => null);
  if (!plan) return;
  await db.from("jp_courses").update({ plan }).eq("id", id);
  revalidatePath("/formation");
}

export async function saveCourseNotes(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const id = str(formData, "id");
  if (!id) return;
  await db
    .from("jp_courses")
    .update({ notes: str(formData, "notes") })
    .eq("id", id);
  revalidatePath("/formation");
}

export async function deleteCourse(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const id = str(formData, "id");
  if (!id) return;
  await db.from("jp_courses").delete().eq("id", id);
  revalidatePath("/formation");
}

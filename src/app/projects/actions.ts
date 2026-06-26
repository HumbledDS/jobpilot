"use server";

import { getAdmin } from "@/lib/supabase/admin";
import { generateProjectIdeaAI, generateProjectBriefAI } from "@/lib/ai";
import { revalidatePath } from "next/cache";

const str = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v.length ? v : null;
};

async function nextOrderIndex(db: NonNullable<ReturnType<typeof getAdmin>>) {
  const { data } = await db
    .from("jp_skill_projects")
    .select("order_index")
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data?.order_index as number) ?? 0) + 1;
}

export async function createProject(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const name = str(formData, "name");
  if (!name) return;
  await db.from("jp_skill_projects").insert({
    name,
    description: str(formData, "description"),
    target_role: str(formData, "target_role"),
    cloud: str(formData, "cloud"),
    status: str(formData, "status") ?? "todo",
    order_index: await nextOrderIndex(db),
  });
  revalidatePath("/projects");
  revalidatePath("/");
}

export async function generateProjectIdea(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const idea = await generateProjectIdeaAI({
    theme: str(formData, "theme"),
    role: str(formData, "role"),
    cloud: str(formData, "cloud"),
  }).catch(() => null);
  if (!idea) return;
  await db.from("jp_skill_projects").insert({
    name: idea.name,
    description: idea.description,
    target_role: idea.target_role,
    cloud: idea.cloud,
    status: "todo",
    order_index: await nextOrderIndex(db),
  });
  revalidatePath("/projects");
}

export async function generateBrief(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const id = str(formData, "id");
  if (!id) return;
  const { data: p } = await db
    .from("jp_skill_projects")
    .select("name, description, target_role, cloud")
    .eq("id", id)
    .maybeSingle();
  if (!p) return;
  const brief = await generateProjectBriefAI({
    name: p.name as string,
    description: p.description as string | null,
    targetRole: p.target_role as string | null,
    cloud: p.cloud as string | null,
  }).catch(() => null);
  if (!brief) return;
  await db.from("jp_skill_projects").update({ brief }).eq("id", id);
  revalidatePath("/projects");
}

export async function saveProjectNotes(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const id = str(formData, "id");
  if (!id) return;
  await db
    .from("jp_skill_projects")
    .update({ notes: str(formData, "notes") })
    .eq("id", id);
  revalidatePath("/projects");
}

export async function deleteProject(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const id = str(formData, "id");
  if (!id) return;
  await db.from("jp_skill_projects").delete().eq("id", id);
  revalidatePath("/projects");
  revalidatePath("/");
}

export async function updateProject(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const id = str(formData, "id");
  if (!id) return;
  const status = str(formData, "status");
  await db
    .from("jp_skill_projects")
    .update({
      status: status ?? "todo",
      repo_url: str(formData, "repo_url"),
      deployed_url: str(formData, "deployed_url"),
      completed_at:
        status === "deployed" || status === "done"
          ? new Date().toISOString()
          : null,
    })
    .eq("id", id);
  revalidatePath("/projects");
  revalidatePath("/");
}

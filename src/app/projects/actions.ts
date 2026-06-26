"use server";

import { getAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

const str = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v.length ? v : null;
};

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

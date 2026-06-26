"use server";

import { getAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

const str = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v.length ? v : null;
};

export async function createApplication(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const title = str(formData, "title");
  if (!title) return;

  const salaryRaw = str(formData, "salary_min");
  const salary_min = salaryRaw ? Number(salaryRaw) * (salaryRaw.length <= 3 ? 1000 : 1) : null;

  const { data: job } = await db
    .from("jp_jobs")
    .insert({
      title,
      company_name: str(formData, "company_name"),
      url: str(formData, "url"),
      location: str(formData, "location"),
      salary_min: Number.isFinite(salary_min as number) ? salary_min : null,
      source: "manual",
    })
    .select("id")
    .single();

  const status = str(formData, "status") ?? "a_postuler";
  await db.from("jp_applications").insert({
    job_id: job?.id ?? null,
    status,
    notes: str(formData, "notes"),
    next_action_at: str(formData, "next_action_at"),
    applied_at: status !== "a_postuler" ? new Date().toISOString() : null,
    source_channel: str(formData, "source_channel"),
  });

  revalidatePath("/applications");
  revalidatePath("/");
}

export async function updateApplicationStatus(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const id = str(formData, "id");
  const status = str(formData, "status");
  if (!id || !status) return;

  const patch: Record<string, unknown> = { status };
  if (status !== "a_postuler") patch.applied_at = new Date().toISOString();
  await db.from("jp_applications").update(patch).eq("id", id);

  revalidatePath("/applications");
  revalidatePath("/");
}

export async function deleteApplication(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const id = str(formData, "id");
  if (!id) return;
  await db.from("jp_applications").delete().eq("id", id);
  revalidatePath("/applications");
  revalidatePath("/");
}

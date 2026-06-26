"use server";

import { getAdmin } from "@/lib/supabase/admin";
import { runIngest } from "@/lib/ingest";
import { revalidatePath } from "next/cache";

export async function ingestNow() {
  await runIngest();
  revalidatePath("/jobs");
  revalidatePath("/");
}

const str = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v.length ? v : null;
};

export async function createJob(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const title = str(formData, "title");
  if (!title) return;
  const salaryRaw = str(formData, "salary_min");
  const salary_min = salaryRaw
    ? Number(salaryRaw) * (salaryRaw.length <= 3 ? 1000 : 1)
    : null;
  await db.from("jp_jobs").insert({
    title,
    company_name: str(formData, "company_name"),
    location: str(formData, "location"),
    url: str(formData, "url"),
    remote: str(formData, "remote"),
    salary_min: Number.isFinite(salary_min as number) ? salary_min : null,
    source: "manual",
  });
  revalidatePath("/jobs");
  revalidatePath("/");
}

export async function deleteJob(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const id = str(formData, "id");
  if (!id) return;
  await db.from("jp_jobs").delete().eq("id", id);
  revalidatePath("/jobs");
}

const FILTER_KEYS = ["q", "source", "sort", "salary", "remote", "minScore", "role"];

export async function saveSearch(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const name = str(formData, "name");
  if (!name) return;
  const query: Record<string, string> = {};
  for (const k of FILTER_KEYS) {
    const v = str(formData, k);
    if (v) query[k] = v;
  }
  await db.from("jp_saved_searches").insert({ name, query });
  revalidatePath("/jobs");
}

export async function deleteSavedSearch(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const id = str(formData, "id");
  if (!id) return;
  await db.from("jp_saved_searches").delete().eq("id", id);
  revalidatePath("/jobs");
}

export async function applyToJob(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const job_id = str(formData, "id");
  if (!job_id) return;
  await db
    .from("jp_applications")
    .insert({ job_id, status: "a_postuler" });
  revalidatePath("/applications");
  revalidatePath("/jobs");
  revalidatePath("/");
}

"use server";

import { getAdmin } from "@/lib/supabase/admin";
import { generateCoverLetterAI } from "@/lib/ai";
import { revalidatePath } from "next/cache";

const str = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v.length ? v : null;
};

export async function createCvVersion(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const label = str(formData, "label");
  if (!label) return;
  await db.from("jp_cv_versions").insert({
    label,
    target_role: str(formData, "target_role"),
    file_url: str(formData, "file_url"),
    source_format: str(formData, "source_format") ?? "pdf",
  });
  revalidatePath("/documents");
}

export async function deleteCvVersion(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const id = str(formData, "id");
  if (!id) return;
  await db.from("jp_cv_versions").delete().eq("id", id);
  revalidatePath("/documents");
}

export async function createCoverLetter(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const label = str(formData, "label");
  if (!label) return;
  await db.from("jp_cover_letters").insert({
    label,
    tone: str(formData, "tone"),
    content: str(formData, "content"),
  });
  revalidatePath("/documents");
}

export async function generateCoverLetter(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const jobTitle = str(formData, "job_title");
  if (!jobTitle) return;
  const company = str(formData, "company");
  const content = await generateCoverLetterAI({
    jobTitle,
    company,
    jobDescription: str(formData, "job_description"),
    tone: str(formData, "tone"),
  }).catch(() => null);
  if (!content) return; // AI disabled or failed
  await db.from("jp_cover_letters").insert({
    label: `LM ${jobTitle}${company ? " - " + company : ""}`,
    tone: str(formData, "tone"),
    content,
  });
  revalidatePath("/documents");
}

export async function deleteCoverLetter(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const id = str(formData, "id");
  if (!id) return;
  await db.from("jp_cover_letters").delete().eq("id", id);
  revalidatePath("/documents");
}

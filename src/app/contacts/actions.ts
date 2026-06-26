"use server";

import { getAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

const str = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v.length ? v : null;
};

export async function createContact(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const full_name = str(formData, "full_name");
  if (!full_name) return;

  let company_id: string | null = null;
  const company_name = str(formData, "company_name");
  if (company_name) {
    const { data: existing } = await db
      .from("jp_companies")
      .select("id")
      .ilike("name", company_name)
      .maybeSingle();
    if (existing?.id) {
      company_id = existing.id;
    } else {
      const { data: created } = await db
        .from("jp_companies")
        .insert({ name: company_name })
        .select("id")
        .single();
      company_id = created?.id ?? null;
    }
  }

  await db.from("jp_contacts").insert({
    full_name,
    role: str(formData, "role"),
    email: str(formData, "email"),
    linkedin_url: str(formData, "linkedin_url"),
    notes: str(formData, "notes"),
    company_id,
  });

  revalidatePath("/contacts");
  revalidatePath("/");
}

export async function deleteContact(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const id = str(formData, "id");
  if (!id) return;
  await db.from("jp_contacts").delete().eq("id", id);
  revalidatePath("/contacts");
}

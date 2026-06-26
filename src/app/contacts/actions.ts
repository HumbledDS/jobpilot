"use server";

import { getAdmin } from "@/lib/supabase/admin";
import { generateApplicationEmailAI } from "@/lib/ai";
import { revalidatePath } from "next/cache";

async function upsertCompanyId(
  db: ReturnType<typeof getAdmin>,
  name: string | null,
): Promise<string | null> {
  if (!db || !name) return null;
  const { data: existing } = await db
    .from("jp_companies")
    .select("id")
    .ilike("name", name)
    .maybeSingle();
  if (existing?.id) return existing.id;
  const { data: created } = await db
    .from("jp_companies")
    .insert({ name })
    .select("id")
    .single();
  return created?.id ?? null;
}

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

/** Create a contact from an offer's email, then draft an application email (AI). */
export async function createContactFromJob(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const jobId = str(formData, "job_id");
  const email = str(formData, "email");
  if (!jobId || !email) return;

  const { data: job } = await db
    .from("jp_jobs")
    .select("title, company_name, description, url")
    .eq("id", jobId)
    .maybeSingle();
  if (!job) return;

  const companyId = await upsertCompanyId(db, job.company_name as string | null);

  // Avoid duplicates: one contact per (email, job).
  const { data: existing } = await db
    .from("jp_contacts")
    .select("id")
    .eq("email", email)
    .eq("job_title", job.title)
    .maybeSingle();

  const draft = await generateApplicationEmailAI({
    jobTitle: job.title as string,
    company: job.company_name as string | null,
    jobDescription: job.description as string | null,
  }).catch(() => null);

  const row = {
    full_name: (job.company_name as string) || (email as string),
    email,
    role: "Contact offre",
    company_id: companyId,
    job_title: job.title as string,
    job_url: job.url as string | null,
    notes: `Offre : ${job.title}${job.url ? ` — ${job.url}` : ""}`,
    draft_subject: draft?.subject ?? null,
    draft_email: draft?.body ?? null,
  };

  if (existing?.id) {
    await db.from("jp_contacts").update(row).eq("id", existing.id);
  } else {
    await db.from("jp_contacts").insert(row);
  }
  revalidatePath("/contacts");
  revalidatePath(`/jobs/${jobId}`);
}

/** (Re)generate the application email for an existing contact. */
export async function draftEmailForContact(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const id = str(formData, "id");
  if (!id) return;
  const { data: c } = await db
    .from("jp_contacts")
    .select("full_name, job_title, notes, company_id")
    .eq("id", id)
    .maybeSingle();
  if (!c) return;
  let company: string | null = null;
  if (c.company_id) {
    const { data: comp } = await db
      .from("jp_companies")
      .select("name")
      .eq("id", c.company_id)
      .maybeSingle();
    company = (comp?.name as string) ?? null;
  }
  const draft = await generateApplicationEmailAI({
    jobTitle: (c.job_title as string) ?? "le poste",
    company,
    contactName: c.full_name as string,
    jobDescription: c.notes as string | null,
  }).catch(() => null);
  if (!draft) return;
  await db
    .from("jp_contacts")
    .update({ draft_subject: draft.subject, draft_email: draft.body })
    .eq("id", id);
  revalidatePath("/contacts");
}

export async function deleteContact(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const id = str(formData, "id");
  if (!id) return;
  await db.from("jp_contacts").delete().eq("id", id);
  revalidatePath("/contacts");
}

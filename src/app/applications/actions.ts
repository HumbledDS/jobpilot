"use server";

import { getAdmin } from "@/lib/supabase/admin";
import { generateCoverLetterAI, generateApplicationEmailAI } from "@/lib/ai";
import { STATUS_LABELS, type ApplicationStatus } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const str = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v.length ? v : null;
};

type CvRow = { id: string; label: string; target_role: string | null; is_active: boolean };

/** Pick the CV variant best matching the offer. */
function pickCv(cvs: CvRow[], roleFamily: string | null, title: string): string | null {
  if (!cvs.length) return null;
  const t = `${roleFamily ?? ""} ${title}`.toLowerCase();
  const want = /cloud|platform|architect|infra|devops|terraform/.test(t)
    ? "cloud"
    : /data engineer|analytics|ing[ée]nieur.*donn|\bdata eng/.test(t)
      ? "data engineer"
      : "master";
  const match = cvs.find((c) =>
    `${c.label} ${c.target_role ?? ""}`.toLowerCase().includes(want),
  );
  return (match ?? cvs.find((c) => c.is_active) ?? cvs[0]).id;
}

/** Co-pilot: from an offer, create the application + pick CV + draft letter & email. */
export async function prepareApplication(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const jobId = str(formData, "job_id");
  if (!jobId) return;

  const { data: job } = await db
    .from("jp_jobs")
    .select("title, company_name, url, description, role_family, company_id")
    .eq("id", jobId)
    .maybeSingle();
  if (!job) return;

  const { data: cvs } = await db
    .from("jp_cv_versions")
    .select("id, label, target_role, is_active")
    .order("created_at", { ascending: false });
  const cvId = pickCv((cvs as CvRow[]) ?? [], job.role_family as string | null, job.title as string);

  const [letter, email] = await Promise.all([
    generateCoverLetterAI({
      jobTitle: job.title as string,
      company: job.company_name as string | null,
      jobDescription: job.description as string | null,
    }).catch(() => null),
    generateApplicationEmailAI({
      jobTitle: job.title as string,
      company: job.company_name as string | null,
      jobDescription: job.description as string | null,
    }).catch(() => null),
  ]);

  let letterId: string | null = null;
  if (letter) {
    const { data: l } = await db
      .from("jp_cover_letters")
      .insert({
        label: `LM ${job.title}${job.company_name ? " - " + job.company_name : ""}`,
        content: letter,
      })
      .select("id")
      .single();
    letterId = l?.id ?? null;
  }

  // Reuse an existing application for this job if any.
  const { data: existing } = await db
    .from("jp_applications")
    .select("id")
    .eq("job_id", jobId)
    .maybeSingle();

  const row = {
    job_id: jobId,
    company_id: (job.company_id as string) ?? null,
    status: "a_postuler",
    cv_version_id: cvId,
    cover_letter_id: letterId,
    source_channel: "co-pilote",
    notes: job.url ? `Postuler : ${job.url}` : null,
    draft_subject: email?.subject ?? null,
    draft_email: email?.body ?? null,
  };

  let appId = existing?.id as string | undefined;
  if (appId) {
    await db.from("jp_applications").update(row).eq("id", appId);
  } else {
    const { data: created } = await db
      .from("jp_applications")
      .insert(row)
      .select("id")
      .single();
    appId = created?.id;
  }

  revalidatePath("/applications");
  revalidatePath("/");
  if (appId) redirect(`/applications/${appId}`);
}

/** Regenerate the cover letter for an existing application. */
export async function regenerateLetter(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const appId = str(formData, "id");
  if (!appId) return;
  const { data: app } = await db
    .from("jp_applications")
    .select("cover_letter_id, jp_jobs(title, company_name, description)")
    .eq("id", appId)
    .maybeSingle();
  const appRow = app as unknown as {
    cover_letter_id: string | null;
    jp_jobs?: { title: string; company_name: string | null; description: string | null } | null;
  } | null;
  const job = appRow?.jp_jobs;
  if (!job) return;
  const letter = await generateCoverLetterAI({
    jobTitle: job.title,
    company: job.company_name,
    jobDescription: job.description,
  }).catch(() => null);
  if (!letter) return;
  const coverId = appRow?.cover_letter_id ?? null;
  if (coverId) {
    await db.from("jp_cover_letters").update({ content: letter }).eq("id", coverId);
  } else {
    const { data: l } = await db
      .from("jp_cover_letters")
      .insert({ label: `LM ${job.title}`, content: letter })
      .select("id")
      .single();
    await db.from("jp_applications").update({ cover_letter_id: l?.id }).eq("id", appId);
  }
  revalidatePath(`/applications/${appId}`);
}

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

  // Trace l'évolution dans la timeline.
  await db.from("jp_app_events").insert({
    application_id: id,
    kind: "statut",
    label: `Statut → ${STATUS_LABELS[status as ApplicationStatus] ?? status}`,
  });

  revalidatePath("/applications");
  revalidatePath(`/applications/${id}`);
  revalidatePath("/");
}

/** Ajoute un événement à la timeline (relance, entretien, note…). */
export async function addAppEvent(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const appId = str(formData, "application_id");
  const kind = str(formData, "kind") ?? "note";
  if (!appId) return;
  const at = str(formData, "event_at");
  const eventAt = at ? new Date(at).toISOString() : new Date().toISOString();
  await db.from("jp_app_events").insert({
    application_id: appId,
    kind,
    label: str(formData, "label"),
    event_at: eventAt,
  });
  // Une relance/un entretien à venir devient la prochaine action.
  if ((kind === "relance" || kind === "entretien") && at && new Date(at).getTime() > Date.now()) {
    await db.from("jp_applications").update({ next_action_at: eventAt }).eq("id", appId);
  }
  revalidatePath(`/applications/${appId}`);
  revalidatePath("/");
}

export async function deleteAppEvent(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const id = str(formData, "id");
  const appId = str(formData, "application_id");
  if (!id) return;
  await db.from("jp_app_events").delete().eq("id", id);
  if (appId) revalidatePath(`/applications/${appId}`);
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

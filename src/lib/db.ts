import { getAdmin } from "@/lib/supabase/admin";
import type {
  Application,
  Company,
  Contact,
  CoverLetter,
  CvVersion,
  Job,
  SkillProject,
} from "@/lib/types";

/** Server-only data access. Returns empty arrays when service role key is not set. */

export async function getApplications(): Promise<Application[]> {
  const db = getAdmin();
  if (!db) return [];
  const { data } = await db
    .from("jp_applications")
    .select(
      "*, jp_jobs(title, company_name, url, location, salary_min, salary_max)",
    )
    .order("updated_at", { ascending: false });
  return (data as Application[]) ?? [];
}

export async function getApplicationById(id: string): Promise<Application | null> {
  const db = getAdmin();
  if (!db) return null;
  const { data } = await db
    .from("jp_applications")
    .select(
      "*, jp_jobs(title, company_name, url, location, salary_min, salary_max, description, role_family), jp_cv_versions(label, file_url, target_role), jp_cover_letters(label, content)",
    )
    .eq("id", id)
    .maybeSingle();
  return (data as Application) ?? null;
}

export async function getJobs(
  sort: "score" | "fresh" = "score",
): Promise<Job[]> {
  const db = getAdmin();
  if (!db) return [];
  let q = db.from("jp_jobs").select("*");
  if (sort === "fresh") {
    q = q
      .order("posted_at", { ascending: false, nullsFirst: false })
      .order("match_score", { ascending: false, nullsFirst: false });
  } else {
    q = q
      .order("match_score", { ascending: false, nullsFirst: false })
      .order("posted_at", { ascending: false, nullsFirst: false });
  }
  const { data } = await q.limit(300);
  return (data as Job[]) ?? [];
}

export async function getJobById(id: string): Promise<Job | null> {
  const db = getAdmin();
  if (!db) return null;
  const { data } = await db.from("jp_jobs").select("*").eq("id", id).maybeSingle();
  return (data as Job) ?? null;
}

export type IngestRun = {
  source: string;
  finished_at: string | null;
  found: number | null;
  inserted: number | null;
  ok: boolean | null;
};

export async function getRecentIngestRuns(): Promise<IngestRun[]> {
  const db = getAdmin();
  if (!db) return [];
  const { data } = await db
    .from("jp_ingest_runs")
    .select("source, finished_at, found, inserted, ok")
    .order("started_at", { ascending: false })
    .limit(30);
  return (data as IngestRun[]) ?? [];
}

export async function getCompanies(): Promise<Company[]> {
  const db = getAdmin();
  if (!db) return [];
  const { data } = await db.from("jp_companies").select("*").order("name");
  return (data as Company[]) ?? [];
}

export async function getTargetCompanies(): Promise<Company[]> {
  const db = getAdmin();
  if (!db) return [];
  const { data } = await db
    .from("jp_companies")
    .select("*")
    .eq("is_target", true)
    .order("category")
    .order("name");
  return (data as Company[]) ?? [];
}

export async function getContacts(): Promise<Contact[]> {
  const db = getAdmin();
  if (!db) return [];
  const { data } = await db
    .from("jp_contacts")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as Contact[]) ?? [];
}

export async function getCvVersions(): Promise<CvVersion[]> {
  const db = getAdmin();
  if (!db) return [];
  const { data } = await db
    .from("jp_cv_versions")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as CvVersion[]) ?? [];
}

export async function getCoverLetters(): Promise<CoverLetter[]> {
  const db = getAdmin();
  if (!db) return [];
  const { data } = await db
    .from("jp_cover_letters")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as CoverLetter[]) ?? [];
}

export type Profile = {
  full_name: string | null;
  headline: string | null;
  skills: string[];
  target_roles: string[];
  salary_target: number | null;
  locations: string[];
  seniority: string | null;
};

export type SavedSearch = {
  id: string;
  name: string;
  query: Record<string, string>;
};

export async function getSavedSearches(): Promise<SavedSearch[]> {
  const db = getAdmin();
  if (!db) return [];
  const { data } = await db
    .from("jp_saved_searches")
    .select("id, name, query")
    .order("created_at", { ascending: false });
  return (data as SavedSearch[]) ?? [];
}

export async function getProfile(): Promise<Profile | null> {
  const db = getAdmin();
  if (!db) return null;
  const { data } = await db.from("jp_profile").select("*").eq("id", 1).maybeSingle();
  return (data as Profile) ?? null;
}

export async function getPosts(): Promise<import("@/lib/types").Post[]> {
  const db = getAdmin();
  if (!db) return [];
  const { data } = await db
    .from("jp_posts")
    .select("*")
    .order("updated_at", { ascending: false });
  return (data as import("@/lib/types").Post[]) ?? [];
}

export async function getSettings(): Promise<{
  weekly_application_goal: number;
  weekly_post_goal: number;
}> {
  const db = getAdmin();
  if (!db) return { weekly_application_goal: 10, weekly_post_goal: 2 };
  const { data } = await db.from("jp_settings").select("*").eq("id", 1).maybeSingle();
  return (
    (data as { weekly_application_goal: number; weekly_post_goal: number }) ?? {
      weekly_application_goal: 10,
      weekly_post_goal: 2,
    }
  );
}

export async function getSkillProjects(): Promise<SkillProject[]> {
  const db = getAdmin();
  if (!db) return [];
  const { data } = await db
    .from("jp_skill_projects")
    .select("*")
    .order("order_index", { ascending: true });
  return (data as SkillProject[]) ?? [];
}

export type CoachTask = {
  id: string;
  key: string;
  label: string;
  category: string | null;
  cadence: "daily" | "weekly" | "once";
  rationale: string | null;
  status: "todo" | "done";
  due_date: string | null;
  created_at: string;
  done_at: string | null;
};

/** Tâches du coach : todos custom + complétions récentes (pour le suivi/contexte). */
export async function getCoachTasks(): Promise<CoachTask[]> {
  const db = getAdmin();
  if (!db) return [];
  const since = new Date(Date.now() - 9 * 86400000).toISOString();
  const { data } = await db
    .from("jp_coach_tasks")
    .select("*")
    .or(`status.eq.todo,done_at.gte.${since}`)
    .order("created_at", { ascending: false });
  return (data as CoachTask[]) ?? [];
}

export type AppEvent = {
  id: string;
  application_id: string;
  kind: "statut" | "relance" | "entretien" | "email" | "note" | "offre" | "refus";
  label: string | null;
  event_at: string;
  created_at: string;
};

export async function getAppEvents(applicationId: string): Promise<AppEvent[]> {
  const db = getAdmin();
  if (!db) return [];
  const { data } = await db
    .from("jp_app_events")
    .select("*")
    .eq("application_id", applicationId)
    .order("event_at", { ascending: false });
  return (data as AppEvent[]) ?? [];
}

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

export async function getJobs(): Promise<Job[]> {
  const db = getAdmin();
  if (!db) return [];
  const { data } = await db
    .from("jp_jobs")
    .select("*")
    .order("ingested_at", { ascending: false })
    .limit(200);
  return (data as Job[]) ?? [];
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

export async function getSkillProjects(): Promise<SkillProject[]> {
  const db = getAdmin();
  if (!db) return [];
  const { data } = await db
    .from("jp_skill_projects")
    .select("*")
    .order("order_index", { ascending: true });
  return (data as SkillProject[]) ?? [];
}

export const APPLICATION_STATUSES = [
  "a_postuler",
  "postule",
  "relance",
  "entretien",
  "offre",
  "refuse",
  "sans_reponse",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  a_postuler: "À postuler",
  postule: "Postulé",
  relance: "Relance",
  entretien: "Entretien",
  offre: "Offre",
  refuse: "Refusé",
  sans_reponse: "Sans réponse",
};

export const STATUS_COLORS: Record<ApplicationStatus, string> = {
  a_postuler: "bg-slate-100 text-slate-700 border-slate-200",
  postule: "bg-blue-100 text-blue-700 border-blue-200",
  relance: "bg-amber-100 text-amber-700 border-amber-200",
  entretien: "bg-violet-100 text-violet-700 border-violet-200",
  offre: "bg-emerald-100 text-emerald-700 border-emerald-200",
  refuse: "bg-rose-100 text-rose-700 border-rose-200",
  sans_reponse: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

export type Job = {
  id: string;
  source: string;
  external_id: string | null;
  title: string;
  company_id: string | null;
  company_name: string | null;
  location: string | null;
  remote: string | null;
  contract_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string | null;
  url: string | null;
  description: string | null;
  tags: string[] | null;
  posted_at: string | null;
  ingested_at: string;
  match_score: number | null;
  matched_skills: string[] | null;
  missing_skills: string[] | null;
  role_family: string | null;
  from_target?: boolean | null;
  source_company?: string | null;
};

export type Company = {
  id: string;
  name: string;
  sector: string | null;
  location: string | null;
  website: string | null;
  linkedin_url: string | null;
  notes: string | null;
  is_target: boolean;
  category: string | null;
  careers_url: string | null;
  // Enrichissement INSEE / data.gouv
  siren?: string | null;
  insee_name?: string | null;
  categorie_entreprise?: string | null; // PME / ETI / GE
  effectif_code?: string | null;
  effectif_label?: string | null;
  effectif_year?: number | null;
  naf_code?: string | null;
  ca?: number | null;
  ca_year?: number | null;
  ca_prev?: number | null;
  ca_growth?: number | null;
  resultat_net?: number | null;
  date_creation?: string | null;
  enriched_at?: string | null;
};

export type Application = {
  id: string;
  job_id: string | null;
  company_id: string | null;
  status: ApplicationStatus;
  priority: number;
  cv_version_id: string | null;
  cover_letter_id: string | null;
  applied_at: string | null;
  next_action_at: string | null;
  source_channel: string | null;
  notes: string | null;
  draft_subject: string | null;
  draft_email: string | null;
  created_at: string;
  updated_at: string;
  // joined
  jp_jobs?:
    | (Pick<Job, "title" | "company_name" | "url" | "location" | "salary_min" | "salary_max"> & {
        description?: string | null;
        role_family?: string | null;
      })
    | null;
  jp_cv_versions?: { label: string; file_url: string | null; target_role: string | null } | null;
  jp_cover_letters?: { label: string | null; content: string | null } | null;
};

export type Contact = {
  id: string;
  company_id: string | null;
  application_id: string | null;
  full_name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  notes: string | null;
  job_title: string | null;
  job_url: string | null;
  draft_subject: string | null;
  draft_email: string | null;
};

export type CvVersion = {
  id: string;
  label: string;
  target_role: string | null;
  file_url: string | null;
  source_format: string | null;
  version: number;
  is_active: boolean;
  created_at: string;
};

export type CoverLetter = {
  id: string;
  label: string | null;
  content: string | null;
  tone: string | null;
  version: number;
  created_at: string;
};

export type Post = {
  id: string;
  title: string;
  topic: string | null;
  course: string | null;
  angle: string | null;
  hook: string | null;
  body: string | null;
  hashtags: string[] | null;
  status: "idea" | "draft" | "published";
  scheduled_for: string | null;
  published_at: string | null;
};

export const POST_STATUS_LABELS: Record<Post["status"], string> = {
  idea: "Idées",
  draft: "Brouillons",
  published: "Publiés",
};

export type SkillProject = {
  id: string;
  name: string;
  description: string | null;
  target_role: string | null;
  cloud: string | null;
  status: "todo" | "in_progress" | "deployed" | "done";
  repo_url: string | null;
  deployed_url: string | null;
  order_index: number | null;
  brief: string | null;
  notes: string | null;
};

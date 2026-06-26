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
  created_at: string;
  updated_at: string;
  // joined
  jp_jobs?: Pick<Job, "title" | "company_name" | "url" | "location" | "salary_min" | "salary_max"> | null;
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
};

export type NormalizedJob = {
  source: string;
  external_id: string;
  title: string;
  company_name: string | null;
  location: string | null;
  url: string | null;
  salary_min: number | null;
  salary_max: number | null;
  contract_type: string | null;
  description: string | null;
  posted_at: string | null;
  tags: string[] | null;
  raw: unknown;
};

/** Parse french salary strings like "36 - 42 k€ brut annuel" or "45000€". */
export function parseSalary(txt?: string | null): {
  min: number | null;
  max: number | null;
} {
  if (!txt) return { min: null, max: null };
  const k = /k/i.test(txt);
  const nums = (txt.match(/\d[\d\s.,]*/g) ?? [])
    .map((n) => Number(n.replace(/[\s.,]/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0)
    .map((n) => (k && n < 1000 ? n * 1000 : n));
  if (nums.length === 0) return { min: null, max: null };
  if (nums.length === 1) return { min: nums[0], max: nums[0] };
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

/** Keywords targeted by the recurring ingestion. */
export const INGEST_KEYWORDS = [
  "data engineer",
  "data platform",
  "cloud engineer",
  "analytics engineer",
  "machine learning engineer",
  "solutions engineer",
  "forward deployed engineer",
  "devops",
];

// One-off: upload existing CVs to Supabase Storage + register versions.
// Run from the jobpilot dir: node scripts/seed-cv.mjs
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const get = (k) => (env.match(new RegExp("^" + k + "=(.*)$", "m")) || [])[1]?.trim();
const sb = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

const BASE = "C:/Users/gueye/Desktop/CV/2025/Refonte_2026/";
const FILES = [
  { f: "CV_Master_BabacarGueye_2026.pdf", label: "CV Master 2026", role: "FDE / Solutions - Cloud & Data", active: true },
  { f: "CV_CloudDataPlatform_2026.pdf", label: "CV Cloud & Data Platform 2026", role: "Cloud / Data Platform -> Architect", active: false },
  { f: "CV_DataEngineer_2026.pdf", label: "CV Data Engineer 2026", role: "Data Engineer", active: false },
];

await sb.storage.createBucket("cv", { public: true }).catch(() => {});
// clear previous runs of these
await sb.from("jp_cv_versions").delete().ilike("file_url", "%/object/public/cv/%");

for (const it of FILES) {
  const buf = fs.readFileSync(BASE + it.f);
  const up = await sb.storage.from("cv").upload(it.f, buf, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (up.error) { console.error("upload error", it.f, up.error.message); continue; }
  const { data: pub } = sb.storage.from("cv").getPublicUrl(it.f);
  const ins = await sb.from("jp_cv_versions").insert({
    label: it.label,
    target_role: it.role,
    file_url: pub.publicUrl,
    source_format: "pdf",
    is_active: it.active,
  });
  console.log(ins.error ? "ROW ERR " + ins.error.message : "added " + it.label);
}
console.log("done");

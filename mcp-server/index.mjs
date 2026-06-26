#!/usr/bin/env node
// JobPilot MCP server — exposes the job-market data to any MCP client (Claude, etc.)
// Tools: search_jobs, top_matches, market_skills, market_roles
//
// Env required:
//   SUPABASE_URL                 (e.g. https://xxxx.supabase.co)
//   SUPABASE_SERVICE_ROLE_KEY    (server-side key; never expose client-side)

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

const text = (obj) => ({ content: [{ type: "text", text: JSON.stringify(obj, null, 2) }] });

const server = new McpServer({ name: "jobpilot", version: "1.0.0" });

server.tool(
  "search_jobs",
  "Recherche des offres d'emploi ingérées (data/cloud/IA), filtrables par mot-clé et score de matching.",
  {
    query: z.string().optional().describe("mot-clé sur le titre/entreprise"),
    minScore: z.number().optional().describe("score de matching minimum (0-100)"),
    limit: z.number().optional().describe("nombre max de résultats (def. 10)"),
  },
  async ({ query, minScore, limit }) => {
    let q = sb
      .from("jp_jobs")
      .select("title, company_name, location, salary_min, salary_max, match_score, role_family, url, posted_at")
      .order("match_score", { ascending: false, nullsFirst: false })
      .limit(limit ?? 10);
    if (minScore != null) q = q.gte("match_score", minScore);
    if (query) q = q.or(`title.ilike.%${query}%,company_name.ilike.%${query}%`);
    const { data, error } = await q;
    if (error) return text({ error: error.message });
    return text({ count: data.length, jobs: data });
  },
);

server.tool(
  "top_matches",
  "Renvoie les meilleures offres pour le profil (par score de matching).",
  { limit: z.number().optional() },
  async ({ limit }) => {
    const { data, error } = await sb
      .from("jp_jobs")
      .select("title, company_name, location, salary_max, match_score, matched_skills, missing_skills, url")
      .order("match_score", { ascending: false, nullsFirst: false })
      .limit(limit ?? 5);
    if (error) return text({ error: error.message });
    return text(data);
  },
);

server.tool(
  "market_skills",
  "Agrège la demande de compétences sur l'ensemble des offres (tendances du marché).",
  {},
  async () => {
    const { data, error } = await sb.from("jp_jobs").select("matched_skills, missing_skills");
    if (error) return text({ error: error.message });
    const m = new Map();
    for (const j of data) {
      for (const s of new Set([...(j.matched_skills ?? []), ...(j.missing_skills ?? [])]))
        m.set(s, (m.get(s) ?? 0) + 1);
    }
    const ranked = [...m].map(([skill, count]) => ({ skill, count })).sort((a, b) => b.count - a.count);
    return text(ranked);
  },
);

server.tool(
  "market_roles",
  "Familles de métiers détectées avec volume et salaire moyen.",
  {},
  async () => {
    const { data, error } = await sb.from("jp_jobs").select("role_family, salary_min, salary_max");
    if (error) return text({ error: error.message });
    const m = new Map();
    for (const j of data) {
      const r = j.role_family ?? "Autre";
      const e = m.get(r) ?? { count: 0, sal: [] };
      e.count++;
      const top = j.salary_max ?? j.salary_min;
      if (top) e.sal.push(top);
      m.set(r, e);
    }
    const out = [...m]
      .map(([role, e]) => ({ role, count: e.count, avgSalary: e.sal.length ? Math.round(e.sal.reduce((a, b) => a + b, 0) / e.sal.length) : null }))
      .sort((a, b) => b.count - a.count);
    return text(out);
  },
);

await server.connect(new StdioServerTransport());
console.error("JobPilot MCP server running on stdio");

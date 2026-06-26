import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { getAdmin } from "@/lib/supabase/admin";

export const maxDuration = 60;

const text = (obj: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(obj, null, 2) }],
});

const base = createMcpHandler(
  (server) => {
    server.tool(
      "search_jobs",
      "Recherche des offres data/cloud/IA ingérées (filtre par mot-clé + score de matching).",
      {
        query: z.string().optional().describe("mot-clé sur le titre/entreprise"),
        minScore: z.number().optional().describe("score de matching minimum 0-100"),
        limit: z.number().optional().describe("nombre max de résultats (def. 10)"),
      },
      async ({ query, minScore, limit }) => {
        const db = getAdmin();
        if (!db) return text({ error: "service role manquante" });
        let q = db
          .from("jp_jobs")
          .select(
            "title, company_name, location, salary_min, salary_max, match_score, role_family, url, posted_at",
          )
          .order("match_score", { ascending: false, nullsFirst: false })
          .limit(limit ?? 10);
        if (minScore != null) q = q.gte("match_score", minScore);
        if (query) q = q.or(`title.ilike.%${query}%,company_name.ilike.%${query}%`);
        const { data, error } = await q;
        if (error) return text({ error: error.message });
        return text({ count: data?.length ?? 0, jobs: data });
      },
    );

    server.tool(
      "top_matches",
      "Meilleures offres pour le profil (par score de matching).",
      { limit: z.number().optional() },
      async ({ limit }) => {
        const db = getAdmin();
        if (!db) return text({ error: "service role manquante" });
        const { data, error } = await db
          .from("jp_jobs")
          .select(
            "title, company_name, location, salary_max, match_score, matched_skills, missing_skills, url",
          )
          .order("match_score", { ascending: false, nullsFirst: false })
          .limit(limit ?? 5);
        if (error) return text({ error: error.message });
        return text(data);
      },
    );

    server.tool(
      "market_skills",
      "Tendances : compétences les plus demandées sur l'ensemble des offres.",
      {},
      async () => {
        const db = getAdmin();
        if (!db) return text({ error: "service role manquante" });
        const { data, error } = await db
          .from("jp_jobs")
          .select("matched_skills, missing_skills");
        if (error) return text({ error: error.message });
        const m = new Map<string, number>();
        for (const j of data ?? []) {
          const set = new Set([
            ...((j.matched_skills as string[]) ?? []),
            ...((j.missing_skills as string[]) ?? []),
          ]);
          for (const s of set) m.set(s, (m.get(s) ?? 0) + 1);
        }
        return text(
          [...m]
            .map(([skill, count]) => ({ skill, count }))
            .sort((a, b) => b.count - a.count),
        );
      },
    );

    server.tool(
      "market_roles",
      "Familles de métiers détectées avec volume et salaire moyen.",
      {},
      async () => {
        const db = getAdmin();
        if (!db) return text({ error: "service role manquante" });
        const { data, error } = await db
          .from("jp_jobs")
          .select("role_family, salary_min, salary_max");
        if (error) return text({ error: error.message });
        const m = new Map<string, { count: number; sal: number[] }>();
        for (const j of data ?? []) {
          const r = (j.role_family as string) ?? "Autre";
          const e = m.get(r) ?? { count: 0, sal: [] };
          e.count++;
          const top = (j.salary_max as number) ?? (j.salary_min as number);
          if (top) e.sal.push(top);
          m.set(r, e);
        }
        return text(
          [...m]
            .map(([role, e]) => ({
              role,
              count: e.count,
              avgSalary: e.sal.length
                ? Math.round(e.sal.reduce((a, b) => a + b, 0) / e.sal.length)
                : null,
            }))
            .sort((a, b) => b.count - a.count),
        );
      },
    );
  },
  {},
  { basePath: "/api" },
);

function authorized(req: Request) {
  const token = process.env.MCP_TOKEN;
  if (!token) return true; // pas de token configuré => ouvert (dev)
  return (req.headers.get("authorization") ?? "") === `Bearer ${token}`;
}

async function handler(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  return base(req);
}

export { handler as GET, handler as POST, handler as DELETE };

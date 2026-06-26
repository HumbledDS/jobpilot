import { getTargetCompanies } from "@/lib/db";
import { ingestTargets } from "@/lib/sources/targets";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PRIORITY_CATS = new Set([
  "Big Tech",
  "Produit/Scale-up",
  "Grand compte",
  "Éditeur",
  "Data/IA",
  "Conseil",
  "Cloud/DevOps",
]);

async function handler(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    const token = new URL(req.url).searchParams.get("secret");
    if (auth !== `Bearer ${secret}` && token !== secret) {
      return new Response("unauthorized", { status: 401 });
    }
  }
  const cap = Number(new URL(req.url).searchParams.get("cap") ?? "25") || 25;
  const all = await getTargetCompanies();
  const established = all
    .filter((c) => c.category && PRIORITY_CATS.has(c.category))
    .map((c) => c.name);
  const pool = (established.length ? established : all.map((c) => c.name)).sort(
    () => Math.random() - 0.5,
  );
  const result = await ingestTargets(pool, cap);
  return Response.json(result);
}

export const GET = handler;
export const POST = handler;

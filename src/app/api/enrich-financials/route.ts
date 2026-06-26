import { enrichFinancials } from "@/lib/sources/enrich";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handler(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    const token = new URL(req.url).searchParams.get("secret");
    if (auth !== `Bearer ${secret}` && token !== secret) {
      return new Response("unauthorized", { status: 401 });
    }
  }
  const cap = Number(new URL(req.url).searchParams.get("cap") ?? "120") || 120;
  const result = await enrichFinancials(cap);
  return Response.json(result);
}

export const GET = handler;
export const POST = handler;

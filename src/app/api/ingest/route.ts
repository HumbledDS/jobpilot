import { runIngest } from "@/lib/ingest";

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
  const result = await runIngest();
  return Response.json(result);
}

export const GET = handler;
export const POST = handler;

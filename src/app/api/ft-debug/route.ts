// TEMPORARY — diagnostics for the France Travail connector on Vercel.
import { fetchFranceTravail, franceTravailConfigured } from "@/lib/sources/francetravail";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const out: Record<string, unknown> = { configured: franceTravailConfigured() };
  try {
    const r = await fetchFranceTravail("data engineer");
    out.count = r.length;
    out.sample = r.slice(0, 2).map((j) => ({ title: j.title, company: j.company_name, loc: j.location }));
  } catch (e) {
    out.error = e instanceof Error ? e.message : String(e);
    const cause = (e as { cause?: { code?: string; message?: string } }).cause;
    if (cause) out.cause = { code: cause.code, message: cause.message };
  }
  return Response.json(out);
}

// TEMPORARY diagnostic endpoint for France Travail — remove after use.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const id = process.env.FRANCE_TRAVAIL_CLIENT_ID;
  const secret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET;
  const out: Record<string, unknown> = { configured: Boolean(id && secret) };
  try {
    const params = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: id ?? "",
      client_secret: secret ?? "",
      scope: "api_offresdemploiv2 o2dsoffre",
    });
    const r = await fetch(
      "https://entreprise.francetravail.io/connexion/oauth2/access_token?realm=%2Fpartenaire",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      },
    );
    out.tokenStatus = r.status;
    const t = await r.text();
    out.tokenBody = t.slice(0, 400);
    let access: string | undefined;
    try {
      access = JSON.parse(t).access_token;
    } catch {}
    if (access) {
      const s = await fetch(
        "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?motsCles=data%20engineer&departement=75,92,93,94&range=0-4",
        { headers: { Authorization: `Bearer ${access}`, Accept: "application/json" } },
      );
      out.searchStatus = s.status;
      out.searchBody = (await s.text()).slice(0, 400);
    }
  } catch (e) {
    out.error = e instanceof Error ? e.message : String(e);
  }
  return Response.json(out);
}

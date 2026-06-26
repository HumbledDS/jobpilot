import { type NormalizedJob } from "./types";

const TOKEN_URL =
  "https://entreprise.pole-emploi.fr/connexion/oauth2/access_token?realm=%2Fpartenaire";
const SEARCH_URL =
  "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search";

export function franceTravailConfigured() {
  return Boolean(
    process.env.FRANCE_TRAVAIL_CLIENT_ID &&
      process.env.FRANCE_TRAVAIL_CLIENT_SECRET,
  );
}

async function getToken(): Promise<string> {
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.FRANCE_TRAVAIL_CLIENT_ID!,
    client_secret: process.env.FRANCE_TRAVAIL_CLIENT_SECRET!,
    scope: "api_offresdemploiv2 o2dsoffre",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`FT token ${res.status}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/** France Travail (ex Pôle Emploi) — Offres d'emploi v2. */
export async function fetchFranceTravail(
  keywords: string,
  opts: { departement?: string; salaireMin?: number } = {},
): Promise<NormalizedJob[]> {
  const token = await getToken();
  const qs = new URLSearchParams({
    motsCles: keywords,
    range: "0-49",
    typeContrat: "CDI",
  });
  // Île-de-France departments by default
  qs.set("departement", opts.departement ?? "75,77,78,91,92,93,94,95");

  const res = await fetch(`${SEARCH_URL}?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (res.status === 204) return [];
  if (!res.ok) throw new Error(`FT search ${res.status}`);

  const data = (await res.json()) as { resultats?: FtOffer[] };
  return (data.resultats ?? []).map((o) => ({
    source: "france_travail",
    external_id: String(o.id),
    title: o.intitule,
    company_name: o.entreprise?.nom ?? null,
    location: o.lieuTravail?.libelle ?? null,
    url:
      o.origineOffre?.urlOrigine ??
      `https://candidat.francetravail.fr/offres/recherche/detail/${o.id}`,
    salary_min: null,
    salary_max: null,
    contract_type: o.typeContrat ?? null,
    description: (o.description ?? "").slice(0, 2000),
    posted_at: o.dateCreation ?? null,
    tags: [keywords],
    raw: o,
  }));
}

type FtOffer = {
  id: string;
  intitule: string;
  description?: string;
  dateCreation?: string;
  typeContrat?: string;
  entreprise?: { nom?: string };
  lieuTravail?: { libelle?: string };
  origineOffre?: { urlOrigine?: string };
};

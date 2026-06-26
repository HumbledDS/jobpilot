"use server";

import { getTargetCompanies } from "@/lib/db";
import { ingestTargets } from "@/lib/sources/targets";
import { enrichCompanies } from "@/lib/sources/enrich";
import { revalidatePath } from "next/cache";

export async function enrichNow() {
  await enrichCompanies(120);
  revalidatePath("/companies");
}

// On source en priorité les entreprises établies (vrais employeurs en interne).
const PRIORITY_CATS = new Set([
  "Big Tech",
  "Produit/Scale-up",
  "Grand compte",
  "Éditeur",
  "Data/IA",
  "Conseil",
  "Cloud/DevOps",
]);

export async function sourceTargets() {
  const all = await getTargetCompanies();
  const established = all
    .filter((c) => c.category && PRIORITY_CATS.has(c.category))
    .map((c) => c.name);
  const pool = (established.length ? established : all.map((c) => c.name))
    // rotation : on couvre des entreprises différentes à chaque passage
    .sort(() => Math.random() - 0.5);
  await ingestTargets(pool, 25);
  revalidatePath("/companies");
  revalidatePath("/jobs");
}

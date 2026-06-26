"use server";

import { getAdmin } from "@/lib/supabase/admin";
import { generatePostAI } from "@/lib/ai";
import { revalidatePath } from "next/cache";

const str = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v.length ? v : null;
};

const HASHTAGS: Record<string, string[]> = {
  "Deep Learning": ["#DeepLearning", "#IA", "#MachineLearning", "#DataScience"],
  "Data Engineering": ["#DataEngineering", "#Data", "#ETL", "#Cloud"],
  Django: ["#Django", "#Python", "#WebDev", "#DataViz"],
  DevOps: ["#DevOps", "#CICD", "#Cloud", "#Data"],
  "Bases de données": ["#SQL", "#Database", "#DataModeling", "#Data"],
  "Ad Tech": ["#AdTech", "#RTB", "#Data", "#MarTech"],
  Pédagogie: ["#Pedagogie", "#Tech", "#Mentorat", "#Data"],
};

function buildDraft(topic: string, angle: string, course: string | null) {
  const ctx = course ? ` (vu en cours — ${course})` : "";
  let hook = "";
  let body = "";
  switch (angle) {
    case "Explication pédagogique":
      hook = `${topic}, expliqué simplement.`;
      body = `${topic}${ctx} intimide beaucoup de gens. Pourtant l'idée de base est accessible.\n\nL'analogie que j'utilise avec mes étudiants : [ton analogie].\n\nLes 3 choses à retenir :\n- [point 1]\n- [point 2]\n- [point 3]\n\nEn une phrase : [le take-away].\n\nEt toi, comment tu l'expliquerais ?`;
      break;
    case "Décryptage technique":
      hook = `On parle souvent de ${topic}. Mais comment ça marche vraiment ?`;
      body = `Le contexte : [le problème que ça résout].\n\nLe mécanisme, étape par étape :\n1. [étape 1]\n2. [étape 2]\n3. [étape 3]\n\nLes compromis : [perf / coût / complexité].\n\nQuand l'utiliser (et quand l'éviter) : [cas d'usage].\n\nJe détaille tout${ctx} — questions en commentaire.`;
      break;
    case "Retour d'expérience enseignant":
      hook = `En enseignant ${topic} à des Bac+5, j'ai remarqué une chose.`;
      body = `La plupart bloquent sur : [le point difficile].\n\nCe qui débloque tout : [le déclic].\n\nLa leçon, valable au-delà du cours : [insight transférable].\n\nC'est aussi ce qui fait la différence en entreprise.\n\nVous l'avez vécu aussi ?`;
      break;
    case "Mythe vs réalité":
      hook = `Mythe : "${topic}, c'est [idée reçue]". Réalité : [la vérité].`;
      body = `On entend souvent que [le mythe].\n\nEn pratique : [la réalité nuancée].\n\nPourquoi ça compte : [conséquence concrète].\n\nLa nuance qui change tout : [détail].\n\nVous en pensez quoi ?`;
      break;
    case "Tutoriel court":
      hook = `${topic} en 5 étapes.`;
      body = `1. [étape 1]\n2. [étape 2]\n3. [étape 3]\n4. [étape 4]\n5. [étape 5]\n\nRésultat : [ce que tu obtiens].\n\nJe partage le détail${ctx} si ça intéresse — dites-le moi.`;
      break;
    default:
      hook = `${topic} : [accroche].`;
      body = `[corps du post]`;
  }
  const tags = HASHTAGS[topic] ?? ["#Tech", "#Data"];
  return { hook, body, hashtags: tags };
}

export async function generateDraft(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const topic = str(formData, "topic") ?? "Tech";
  const angle = str(formData, "angle") ?? "Explication pédagogique";
  const course = str(formData, "course");
  const title = str(formData, "title") ?? `${topic} — ${angle}`;

  // Prefer AI generation when a key is configured; otherwise use the template.
  let hook: string;
  let body: string;
  let hashtags: string[];
  const ai = await generatePostAI({ topic, angle, course }).catch(() => null);
  if (ai) {
    ({ hook, body, hashtags } = ai);
  } else {
    ({ hook, body, hashtags } = buildDraft(topic, angle, course));
  }

  await db.from("jp_posts").insert({
    title,
    topic,
    course,
    angle,
    hook,
    body,
    hashtags,
    status: "draft",
  });
  revalidatePath("/contenu");
}

export async function updatePost(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const id = str(formData, "id");
  if (!id) return;
  const tags = (str(formData, "hashtags") ?? "")
    .split(/[\s,]+/)
    .filter(Boolean);
  await db
    .from("jp_posts")
    .update({
      title: str(formData, "title"),
      hook: str(formData, "hook"),
      body: str(formData, "body"),
      hashtags: tags,
      status: str(formData, "status") ?? "draft",
    })
    .eq("id", id);
  revalidatePath("/contenu");
}

export async function setPostStatus(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const id = str(formData, "id");
  const status = str(formData, "status");
  if (!id || !status) return;
  const patch: Record<string, unknown> = { status };
  if (status === "published") patch.published_at = new Date().toISOString();
  await db.from("jp_posts").update(patch).eq("id", id);
  revalidatePath("/contenu");
}

export async function deletePost(formData: FormData) {
  const db = getAdmin();
  if (!db) return;
  const id = str(formData, "id");
  if (!id) return;
  await db.from("jp_posts").delete().eq("id", id);
  revalidatePath("/contenu");
}

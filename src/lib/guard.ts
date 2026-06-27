import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAllowed } from "@/lib/auth";

/** Garde d'accès : à appeler en tête de chaque page protégée. Redirige vers "/" si non autorisé. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAllowed(user?.email)) redirect("/");
  return user;
}

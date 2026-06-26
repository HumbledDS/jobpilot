import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the service role key.
 * App is single-user / proprietary: all data access happens server-side,
 * RLS stays enabled so the public anon key cannot read jp_* tables.
 * Never import this from a Client Component.
 */
let cached: SupabaseClient | null = null;

export function getAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!cached) {
    cached = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

export const hasAdmin = () => Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

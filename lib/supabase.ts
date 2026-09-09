import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (process.env.VERCEL_ENV === "production" && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error("Supabase production environment variables are missing");
}

export function getSupabaseBrowserClient() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

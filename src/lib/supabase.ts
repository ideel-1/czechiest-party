import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // During local dev you might rely on worker APIs; we still export a dummy to avoid crashes.
  // Consumers should guard their calls appropriately.
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");



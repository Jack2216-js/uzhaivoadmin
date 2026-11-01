import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cbijbcebpjkkgfwhqjho.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(supabaseAnonKey);
// The sentinel keeps the UI renderable if setup is incomplete; requests will fail visibly until a real key is configured.
export const supabase = createClient(supabaseUrl, supabaseAnonKey || "missing-public-anon-key");

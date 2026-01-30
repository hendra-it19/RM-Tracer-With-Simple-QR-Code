import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug logging
// Debug logging removed for production
// console.log('[Supabase] URL:', supabaseUrl)
// console.log('[Supabase] Key exists:', !!supabaseAnonKey)
// console.log('[Supabase] Key preview:', supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'MISSING')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[Supabase] Missing credentials! Check your .env file.");
  console.error("[Supabase] URL:", supabaseUrl || "MISSING");
  console.error("[Supabase] Key:", supabaseAnonKey ? "SET" : "MISSING");
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key",
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  },
);

// Test connection
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error("[Supabase] Connection test failed:", error);
  } else {
    // console.log('[Supabase] Connection successful, session:', data.session ? 'exists' : 'none')
  }
});

export default supabase;

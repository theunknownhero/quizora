// Supabase client. Set these in .env.local (local) and in Vercel → Project → Settings → Environment Variables:
//   VITE_SUPABASE_URL       = https://<your-project>.supabase.co
//   VITE_SUPABASE_ANON_KEY  = <anon public key>   (never use the service_role key in the browser)
import { createClient } from '@supabase/supabase-js'

// VITE_* when set by hand; NEXT_PUBLIC_* when added by Vercel's Supabase integration.
const env = import.meta.env
const url = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

export const supabaseConfigured = Boolean(url && anonKey)

export const supabase = supabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // picks up the session from email links (confirm / reset)
      },
    })
  : null

if (!supabaseConfigured && import.meta.env.DEV) {
  console.info('[Quizora] Supabase is not configured — accounts are disabled. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.')
}

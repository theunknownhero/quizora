import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Expose VITE_* and NEXT_PUBLIC_* env vars to the browser. NEXT_PUBLIC_* lets Vercel's Supabase
  // integration work with zero setup (it adds NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY automatically).
  // Never add a prefix like SUPABASE_ here: that would leak SUPABASE_SERVICE_ROLE_KEY to the browser.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
})

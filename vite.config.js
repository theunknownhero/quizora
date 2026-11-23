import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Forward API calls to the Node server (npm run api) so cookies stay same-origin.
    proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: false } },
  },
})

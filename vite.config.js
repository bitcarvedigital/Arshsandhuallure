import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // dev-only: forward /api to the local serverless-function shim
    // (scripts/dev-api.mjs) or `vercel dev`; no effect on production builds
    proxy: {
      '/api': 'http://localhost:3999',
    },
  },
})

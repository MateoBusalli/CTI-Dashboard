import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: { usePolling: true },
    proxy: {
      '/search': 'http://backend:8000',
      '/ingest': 'http://backend:8000',
      '/reindex': 'http://backend:8000',
      '/fetch': 'http://backend:8000',
      '/health': 'http://backend:8000',
      '/config': 'http://backend:8000',
      '/documents': 'http://backend:8000',
      '/enrich': 'http://backend:8000',
      '/chat': 'http://backend:8000',
    },
  },
})

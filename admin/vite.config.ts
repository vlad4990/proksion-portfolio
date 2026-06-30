import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Админка отдаётся Caddy из /srv/admin под префиксом /admin/ (см. docs/architecture.md §8),
// поэтому ассеты должны префиксоваться base: '/admin/'.
// Dev-сервер — на 5006 (публичный фронт держит 5005 для Chrome MCP).
export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  server: {
    port: 5006,
  },
})

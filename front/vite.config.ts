import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
//
// Dev-proxy (docs/architecture.md §8): фронт ходит на same-origin `/api` и `/media`,
// а локально они проксируются на бэкенд и MinIO.
//   • `/api/*`   → back :3001. Caddy в проде режет префикс (`handle_path /api/*`),
//                  поэтому в dev тоже срезаем `/api` перед бэкендом (роуты back — от корня).
//   • `/media/*` → MinIO :9000 как есть (бакет `media`; Caddy префикс НЕ режет).
// Dev-сервер по-прежнему на 5005 (Chrome MCP), порт задаётся флагом `--port`.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/media': {
        target: 'http://localhost:9000',
        changeOrigin: true,
      },
    },
  },
})

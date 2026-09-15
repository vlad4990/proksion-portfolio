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
//
// Адреса апстримов переопределяются переменными окружения; дефолты прежние, поэтому обычный
// `npm run dev` работает как раньше. Нужно это, когда порт занят посторонним процессом и MinIO
// приходится поднимать на другом: `MEDIA_PROXY_TARGET=http://localhost:9010 npm run dev`.
// `@types/node` во фронте нет (и не нужен ради двух строк конфига) — объявляем ровно то,
// что читаем. Конфиг исполняется Vite в Node, а не в браузерном бандле.
declare const process: { env: Record<string, string | undefined> }

const API_TARGET = process.env.API_PROXY_TARGET ?? 'http://localhost:3001'
const MEDIA_TARGET = process.env.MEDIA_PROXY_TARGET ?? 'http://localhost:9000'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/media': {
        target: MEDIA_TARGET,
        changeOrigin: true,
      },
    },
  },
})

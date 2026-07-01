/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Админка отдаётся Caddy из /srv/admin под префиксом /admin/ (см. docs/architecture.md §8),
// поэтому ассеты должны префиксоваться base: '/admin/'.
// Dev-сервер — на 5006 (публичный фронт держит 5005 для Chrome MCP). Dev-proxy /api →
// локальный back (3001): Caddy в проде срезает префикс /api, в dev это делает rewrite ниже,
// поэтому back-роуты остаются от корня (/admin/login → /api/admin/login снаружи).
export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5006,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // Картинки MinIO (public-read) — на случай предпросмотра в админке.
      '/media': {
        target: 'http://localhost:9000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})

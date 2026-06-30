import { Elysia } from 'elysia'
import { loadConfig } from './config.ts'
import { openDb } from './db/index.ts'
import { publicRoutes } from './routes/public.ts'

// Точка входа HTTP-сервера (docs/architecture.md §7). Открывает БД (миграции на старте),
// монтирует публичные read-эндпоинты (включая /health) и слушает порт.
//
// Caddy срезает префикс /api (handle_path /api/* в корневом Caddyfile), поэтому роуты
// объявляются от корня: снаружи это /api/health, /api/categories и т.д. (§7).
// Мутации/аплоад/auth — задачи 04–06.

const config = loadConfig()
const db = openDb(config.databasePath)

new Elysia()
  .use(publicRoutes(db))
  .listen({ port: config.backPort, hostname: '0.0.0.0' }, (server) => {
    console.log(`[back] public API listening on http://${server?.hostname}:${server?.port}`)
  })

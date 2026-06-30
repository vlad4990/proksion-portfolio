import { Elysia } from 'elysia'
import { loadConfig } from './config.ts'
import { openDb } from './db/index.ts'
import { publicRoutes } from './routes/public.ts'
import { loadS3Config } from './storage/s3.ts'
import { bootstrapStorage } from './storage/bootstrap.ts'

// Точка входа HTTP-сервера (docs/architecture.md §7). Открывает БД (миграции на старте),
// монтирует публичные read-эндпоинты (включая /health) и слушает порт.
//
// Caddy срезает префикс /api (handle_path /api/* в корневом Caddyfile), поэтому роуты
// объявляются от корня: снаружи это /api/health, /api/categories и т.д. (§7).
// Мутации/аплоад/auth — задачи 05–06.

const config = loadConfig()
const db = openDb(config.databasePath)

// Bootstrap хранилища (§5): создать bucket `media` и поставить public-read на images/*.
// Best-effort: если MinIO ещё не поднялся — логируем и продолжаем (сайт/health работают,
// деградирует лишь работа с картинками; admin-аплоад появится в задаче 06).
const s3Config = loadS3Config()
bootstrapStorage(s3Config)
  .then(() =>
    console.log(`[back] storage ready: bucket "${s3Config.bucket}", public-read on images/*`),
  )
  .catch((err: unknown) =>
    console.error('[back] storage bootstrap failed (continuing without it):', err),
  )

new Elysia()
  .use(publicRoutes(db))
  .listen({ port: config.backPort, hostname: '0.0.0.0' }, (server) => {
    console.log(`[back] public API listening on http://${server?.hostname}:${server?.port}`)
  })

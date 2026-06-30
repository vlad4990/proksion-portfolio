import { Elysia } from 'elysia'
import { loadConfig } from './config.ts'
import { openDb } from './db/index.ts'
import { createRepos } from './repos.ts'
import { publicRoutes } from './routes/public.ts'
import { adminAuthRoutes } from './routes/admin/auth.ts'
import { adminContentRoutes } from './routes/admin/content.ts'
import { createMutationHook } from './admin/mutations.ts'
import { loadAuthConfig } from './auth/config.ts'
import { createObjectStore, loadS3Config } from './storage/s3.ts'
import { bootstrapStorage } from './storage/bootstrap.ts'

// Точка входа HTTP-сервера (docs/architecture.md §7). Открывает БД (миграции на старте),
// монтирует публичные read-эндпоинты (включая /health) и слушает порт.
//
// Caddy срезает префикс /api (handle_path /api/* в корневом Caddyfile), поэтому роуты
// объявляются от корня: снаружи это /api/health, /api/categories и т.д. (§7).
// Мутации/аплоад/auth — задачи 05–06.

const config = loadConfig()
const db = openDb(config.databasePath)

// Auth-слой (§7): один редактор, JWT в httpOnly-cookie, guard на /admin/*.
const authConfig = loadAuthConfig()
if (!authConfig.jwtSecret || !authConfig.passwordHash) {
  console.warn(
    '[back] auth disabled: set JWT_SECRET и ADMIN_PASSWORD_HASH в .env ' +
      '(хэш: `bun run hash <password>`). Логин в админку будет отклонён.',
  )
}

// Bootstrap хранилища (§5): создать bucket `media` и поставить public-read на images/*.
// Best-effort: если MinIO ещё не поднялся — логируем и продолжаем (сайт/health работают,
// деградирует лишь работа с картинками; admin-аплоад появится в задаче 06).
const s3Config = loadS3Config()
const objectStore = createObjectStore(s3Config)
bootstrapStorage(s3Config)
  .then(() =>
    console.log(`[back] storage ready: bucket "${s3Config.bucket}", public-read on images/*`),
  )
  .catch((err: unknown) =>
    console.error('[back] storage bootstrap failed (continuing without it):', err),
  )

// Хук §9: успешные admin-мутации дёргают onMutation() (бэкап-дебаунс подключит задача 11).
const mutationHook = createMutationHook()
const repos = createRepos(db)

new Elysia()
  .use(publicRoutes(db))
  .use(adminAuthRoutes(authConfig))
  .use(
    adminContentRoutes({
      repos,
      store: objectStore,
      jwtSecret: authConfig.jwtSecret,
      onMutation: mutationHook.onMutation,
    }),
  )
  .listen({ port: config.backPort, hostname: '0.0.0.0' }, (server) => {
    console.log(`[back] public API listening on http://${server?.hostname}:${server?.port}`)
  })

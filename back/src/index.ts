import { Elysia } from 'elysia'
import { existsSync } from 'node:fs'
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
import { loadBackupConfig } from './backup/config.ts'
import { createCommandRunner, createRclone } from './backup/runner.ts'
import { createDebouncer } from './backup/debounce.ts'
import { resolveBackupPaths, runPush, snapshotDatabase } from './backup/push.ts'
import { minioHealthy, pollUntilReady, restoreOnBoot } from './backup/restore.ts'

// Точка входа HTTP-сервера (docs/architecture.md §7). Порядок старта:
//   restore-on-boot (§9, ДО открытия БД) → открыть БД (миграции) → смонтировать роуты → слушать.
// Caddy срезает префикс /api (handle_path /api/* в корневом Caddyfile), поэтому роуты
// объявляются от корня: снаружи это /api/health, /api/categories и т.д. (§7).

const config = loadConfig()
const s3Config = loadS3Config()
const backupConfig = loadBackupConfig()
const objectStore = createObjectStore(s3Config)

// Backup/restore §9: rclone-обёртка и пути (общие для restore-on-boot и push-дебаунса).
const rclone = createRclone(createCommandRunner(), backupConfig.rcloneConfig)
const backupPaths = resolveBackupPaths({
  databasePath: config.databasePath,
  bucket: s3Config.bucket,
  remote: backupConfig.remote,
})

// Restore-on-boot (§9): на пустом (свежем) окружении тянем данные из облака ДО открытия БД.
// Порядок: дождаться MinIO → ensure bucket/policy → КАРТИНКИ → БД. Best-effort: сбой облака
// не фатален (restoreOnBoot логирует и деградирует — стартуем с тем, что есть локально).
if (backupConfig.enabled) {
  await restoreOnBoot({
    waitForMinio: () =>
      pollUntilReady(() => minioHealthy(s3Config.endpoint), {
        attempts: 30,
        delayMs: 2000,
        sleep: (ms) => Bun.sleep(ms),
      }),
    prepareStorage: () => bootstrapStorage(s3Config),
    isBucketEmpty: async () => (await objectStore.count('images/')) === 0,
    dbExists: () => existsSync(config.databasePath),
    restoreImages: () => rclone.sync(backupPaths.cloudMedia, backupPaths.minioMedia),
    restoreDb: () => rclone.copyto(backupPaths.cloudDb, config.databasePath),
    log: (m) => console.log(`[back] ${m}`),
  })
} else {
  // Бэкап выключен: bootstrap хранилища лучше-усилие (bucket + public-read для аплоада картинок).
  // Если MinIO ещё не поднялся — логируем и продолжаем (сайт/health работают).
  bootstrapStorage(s3Config)
    .then(() =>
      console.log(`[back] storage ready: bucket "${s3Config.bucket}", public-read on images/*`),
    )
    .catch((err: unknown) =>
      console.error('[back] storage bootstrap failed (continuing without it):', err),
    )
}

const db = openDb(config.databasePath)

// Auth-слой (§7): один редактор, JWT в httpOnly-cookie, guard на /admin/*.
const authConfig = loadAuthConfig()
if (!authConfig.jwtSecret || !authConfig.passwordHash) {
  console.warn(
    '[back] auth disabled: set JWT_SECRET и ADMIN_PASSWORD_HASH в .env ' +
      '(хэш: `bun run hash <password>`). Логин в админку будет отклонён.',
  )
}

// Хук §9: успешная admin-мутация → onMutation(). При включённом бэкапе подписываем на него
// дебаунс-push (markDirty()): множество изменений в окне коалесятся в один rclone-прогон.
const mutationHook = createMutationHook()
if (backupConfig.enabled) {
  const debouncer = createDebouncer({
    delayMs: backupConfig.debounceMs,
    run: () =>
      runPush({
        snapshotDb: (dest) => snapshotDatabase(db, dest),
        rclone,
        paths: backupPaths,
        historyKeep: backupConfig.historyKeep,
        timestamp: () => new Date().toISOString().replace(/[:.]/g, '-'),
        log: (m) => console.log(`[back] backup: ${m}`),
      }),
    onError: (err) => console.error('[back] backup push failed (continuing):', err),
  })
  mutationHook.subscribe(() => debouncer.markDirty())
  console.log(
    `[back] backup enabled: debounce ${backupConfig.debounceMs / 60_000}min → ${backupConfig.remote}`,
  )
}

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

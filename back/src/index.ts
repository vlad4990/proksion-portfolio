import { Elysia } from 'elysia'

// Заглушка бэкенда (задача 01): только health-роут — каркас деплоя должен подняться
// и проксироваться через Caddy. Реальная логика (БД, S3, sharp, auth) — задачи 02–06.
//
// Caddy срезает префикс /api (handle_path /api/* в корневом Caddyfile), поэтому
// роуты объявляются от корня: снаружи это /api/health (см. docs/architecture.md §7).

const port = Number(process.env.BACK_PORT ?? 3001)

new Elysia()
  .get('/health', () => 'ok')
  .listen({ port, hostname: '0.0.0.0' }, (server) => {
    console.log(`[back] health stub listening on http://${server?.hostname}:${server?.port}`)
  })

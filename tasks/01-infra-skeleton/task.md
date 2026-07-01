# Task — 01 infra-skeleton

**Слой:** инфраструктура. **Методология:** без TDD (инфра); корректность = `verify.md`
(каркас поднимается и маршрутизирует). Сверяйся с `docs/architecture.md` §2, §8, §11.

## Цель
Один `make up` поднимает три рантайм-контейнера — `caddy` (edge), `back` (stub), `minio` —
и Caddy корректно маршрутизирует `/`, `/admin/*`, `/api/*`, `/media/*`. Контейнеров-сборщиков
в рантайме нет.

## Шаги

### 1. Placeholder-приложение `/admin`
- Новый минимальный проект `admin/` (Vite + React 18 + TS strict), `base: '/admin/'` в
  `vite.config.ts`. Одна страница-заглушка (напр. «PROKSION · Админка — скоро»).
- `npm run build` (или `bun run build`) → `admin/dist/`. Без Tailwind/shadcn/роутера (это 07).
- Свой `package.json`, изолированный от `/front`.

### 2. Stub-бэкенд `/back`
- `back/` — Bun + ElysiaJS, минимум. `src/index.ts`: `GET /health → "ok"` (роут от корня —
  Caddy срежет `/api`, см. §7). Слушать порт `BACK_PORT` (default 3001), host `0.0.0.0`.
- `back/package.json` (deps: `elysia`), `back/Dockerfile` на `oven/bun:1` (glibc): установить
  зависимости, запустить `bun run src/index.ts`. EXPOSE 3001.
- Никакой БД/S3/auth — только health.

### 3. Корневой `Dockerfile` (multi-stage, контекст = корень репо)
- Стадия `build-front`: из `front/` — `bun install` + `bun run build` → `dist`.
- Стадия `build-admin`: из `admin/` — `bun install` + `bun run build` → `dist`.
- Финал `caddy:2-alpine`: `COPY --from=build-front .../dist /srv`,
  `COPY --from=build-admin .../dist /srv/admin`, `COPY Caddyfile /etc/caddy/Caddyfile`.
- Стадии независимы (своё кэширование слоёв). Билдеры отбрасываются автоматически.

### 4. Корневой `Caddyfile`
Перенести логику из `front/Caddyfile` и расширить (handle-блоки матчатся сверху вниз):
```
{$SITE_ADDRESS::80} {
    encode gzip zstd
    handle_path /api/* { reverse_proxy back:3001 }
    handle /media/* {
        reverse_proxy minio:9000
        header Cache-Control "public, max-age=31536000, immutable"
    }
    handle /admin/* {
        root * /srv/admin
        try_files {path} /admin/index.html
        file_server
    }
    handle {
        root * /srv
        @assets path /assets/*
        header @assets Cache-Control "public, max-age=31536000, immutable"
        header /index.html Cache-Control "no-cache"
        try_files {path} /index.html
        file_server
    }
}
:8081 { respond /health "ok" 200; respond 404 }
```
(уточни детали `handle`/`handle_path`/`try_files` для admin под Caddy v2 — путь
`/admin/index.html` должен резолвиться внутри `/srv/admin`.)

### 5. `docker-compose.yml`
- Заменить сервис `front` на `caddy`: `build: { context: ., dockerfile: Dockerfile }`,
  порты `${HTTP_PORT}:80` / `${HTTPS_PORT}:443`, volumes `caddy_data`,`caddy_config`,
  healthcheck на `:8081/health`, `depends_on` (back+minio, по возможности `service_healthy`).
- `back`: `build: ./back`, наружу НЕ публикуется, healthcheck (`wget :3001/health`), restart.
- `minio`: образ `minio/minio`, `command: server /data --console-address ":9001"`, env
  `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD`, volume `minio_data:/data`, healthcheck
  (`/minio/health/live`), наружу НЕ публикуется.
- Volumes: добавить `minio_data`, `app_data` (под будущий SQLite/стейдж бэкапа).

### 6. `.env.example` / `.env`
Добавить (§11): `BACK_PORT=3001`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `S3_ENDPOINT`,
`S3_BUCKET=media`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` (плейсхолдеры). Сохранить существующие.

### 7. `Makefile`
- Добавить `dev-back` (запуск `back` локально), `dev-admin` (Vite админки на 5006).
- `logs-front` → `logs-caddy` (можно оставить алиас). `up`/`down` уже покроют новые сервисы.

### 8. Удалить устаревшее
`front/Dockerfile` и `front/Caddyfile` — их роль переехала в корневые `/Dockerfile`,`/Caddyfile`.

## Deliverables
`admin/` (placeholder), `back/` (stub + Dockerfile), корневые `Dockerfile` + `Caddyfile`,
обновлённые `docker-compose.yml`, `.env.example`, `Makefile`. Каркас поднимается `make up`.
</content>

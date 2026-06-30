# Context — 01 infra-skeleton

## Цель в одной строке
Поднять деплой-каркас всего приложения (edge-Caddy + `back`-stub + `minio`) одним
`docker compose up`, БЕЗ бизнес-логики — её добавят следующие задачи.

## Опорные разделы спеки
- `docs/architecture.md` §2 (топология, runtime-сервисы), §8 (хостинг — единый edge-Caddy
  с вшитой статикой), §11 (изменения в репо + переменные окружения), §10 (безопасность).

## Что уже есть в репо
- `/front` — рабочий Vite 6 + React 18 SPA (TS strict). Собирается `npm run build` → `front/dist/`.
- `front/Dockerfile` — multi-stage `oven/bun:1-alpine` build → `caddy:2-alpine` runtime (отдаёт `front/dist`).
- `front/Caddyfile` — отдаёт SPA, есть **закомментированный** `handle_path /api/* → back:3001`
  и внутренний `:8081/health`. `SITE_ADDRESS` управляет доменом/HTTPS.
- `docker-compose.yml` — один сервис `front` (Caddy) + закомментированный блок `back`.
  Volumes `caddy_data`, `caddy_config`.
- `.env` / `.env.example` — `SITE_ADDRESS`, `HTTP_PORT`, `HTTPS_PORT`, `FRONT_DEV_PORT=5005`.
- `Makefile` — `dev`, `build`, `up`, `down`, `logs-front` и т.п.

## Целевое состояние (§8)
- Прежний сервис `front` **заменяется** единым сервисом `caddy` (edge: TLS + роутинг).
- Корневой multi-stage `Dockerfile` (контекст = корень репо): независимые стадии
  `build-front` и `build-admin` → вшивают `dist` в `caddy:2-alpine` как `/srv` и `/srv/admin`.
- Рантайм-контейнеры: **только** `caddy` + `back` + `minio`. Контейнеров-сборщиков в рантайме
  быть НЕ должно (multi-stage → билдеры эфемерны).
- Маршруты Caddy: `/` → `/srv`; `/admin/*` → `/srv/admin`; `/api/*` → `back:3001`
  (`handle_path` срезает `/api`); `/media/*` → `minio:9000`.

## Инварианты / ограничения
- `back` в этой задаче — **заглушка**: только `GET /health` (роуты от корня, т.к. Caddy
  срежет `/api`). Никакой БД, S3, sharp, auth — это задачи 02–06.
- `/admin` в этой задаче — **пустой placeholder**: минимальный Vite+React+TS, `base:'/admin/'`,
  одна страница-заглушка. Tailwind/shadcn/роутер/тесты — задача 07.
- Образ `back` — `oven/bun:1` (Debian/glibc, НЕ alpine) — задел под sharp (§6).
- Наружу публикуется только `caddy` (порты из `.env`). `back` и `minio` — только внутренняя сеть.
- Не трогать публичный фронт по существу (только сборку/пути), не вводить тесты (инфра).

## На что НЕ замахиваться
Бизнес-логика бэка, реальная админка, бэкап/rclone (задача 11), prod-хардненинг (задача 12).
</content>

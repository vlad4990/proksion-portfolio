# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

PROKSION — графический-дизайн портфолио для Kristina. Изначально это был экспорт из Claude design (React + Babel standalone на CDN). Фронт переписан в самостоятельный **SPA на Vite 6 + React 18 + TypeScript strict** во `/front` (раньше был Astro 6 — миграция отменена в пользу чистого Vite+React). Функциональная часть (бэкенд/админка/хранилище/бэкап) **реализована** по спеке `docs/architecture.md`: контент проектов теперь управляется через админку и хранится в БД+MinIO, а не в заглушках компонентов.

## Repo layout

Монорепо: публичный фронт, отдельная админка, бэкенд и инфра для деплоя одним `docker compose`.

```
/front   ← Vite 6 + React 18 SPA, TS strict — ПУБЛИЧНЫЙ сайт (листинг + модалка из API)
/admin   ← Vite + React + TS, Tailwind + shadcn — ОТДЕЛЬНОЕ приложение админки (base '/admin/')
/back    ← Bun + ElysiaJS: public-API, bun:sqlite, MinIO+sharp, auth, admin-API, backup (rclone)
/docs    ← architecture.md (спека функц. части) + deploy.md (прод-деплой-гайд)
/tasks   ← нарезка работ по функциональной части (01–12) + _legacy-astro/ (история Astro-фаз)
# в корне: Dockerfile (multi-stage front+admin→caddy), Caddyfile, docker-compose.yml, .env.example, Makefile
```

## Running locally

Публичный фронт (Vite dev):

```bash
cd front && npm install && npm run dev   # http://localhost:5173
```

Для отладки в Chrome (MCP) запускай dev на 5005: `npm run dev -- --port 5005` (расширение пользователя разрешает только этот порт). Из корня — `make dev` (фронт 5005), `make dev-admin` (админка 5006), `make dev-back` (bun-бэкенд, watch, порт 3001). `make install` ставит зависимости всех трёх проектов.

Dev-фронт и админка ходят на бэкенд через **vite dev-proxy** (`/api` → `localhost:3001`, `/media` → MinIO) — для живого API подними `back` (и MinIO).

Сборка / проверка корректности:

```bash
cd front && npm run build    # tsc --noEmit (strict) + vite build → front/dist/
cd admin && npm run build    # то же для админки → admin/dist/
cd back  && bun test         # тесты бэкенда (TDD); bun run typecheck — tsc --noEmit
```

Методология: `/back` и логика `/admin` — **TDD** (`bun test` / Vitest+RTL), публичный `/front` — **SDD** (проверка = `npm run build` + визуал). Корневой `Makefile` — обёртка над этими скриптами (`make help`).

### Docker (прод-стек монорепы)

`docker-compose.yml` в корне поднимает **три рантайм-сервиса**: `caddy` (edge — TLS + роутинг + вшитая статика), `back` (Bun-API), `minio` (S3-хранилище картинок). Плюс одноразовый job `minio-init` (заводит НЕ-root app-ключ MinIO и бакет, затем завершается — в рантайме не висит, в `docker compose ps` без `-a` не виден).

- **Образ `caddy`** — многостадийный корневой `Dockerfile` (контекст = корень): стадии `build-front` и `build-admin` (**oven/bun:1-alpine**) собирают статику → вшиваются в **caddy:2-alpine** как `/srv` и `/srv/admin`. Build-стадии эфемерны — контейнеров-сборщиков в рантайме нет. `Caddyfile`: `/`→фронт, `/admin/*`→админка (SPA-fallback у каждого), `/api/*`→`back:3001` (`handle_path` срезает `/api`), `/media/*`→`minio:9000` (public-read, immutable-кэш).
- **Образ `back`** — `back/Dockerfile` (**oven/bun:1** glibc + вендоренный `rclone`; sharp вшивает свой libvips). Наружу не публикуется.
- **MinIO** — портов наружу нет (только внутренняя сеть compose); картинки отдаёт Caddy через `/media/*`.
- **Адрес сайта** — `SITE_ADDRESS` (`proksion.ru` → авто-HTTPS Let's Encrypt; `:80` локально → HTTP). Внешние порты — `HTTP_PORT`/`HTTPS_PORT` (80/443). Volumes: `caddy_data`/`caddy_config` (сертификаты переживают пересоздание), `app_data` (SQLite + стейдж бэкапа), `minio_data` (объекты), `rclone_config` (токен облака, `:ro`). Healthcheck'и на всех сервисах, `depends_on: service_healthy` (caddy←back,minio; back←minio+minio-init), `restart: unless-stopped`.
- **Секреты** — только через `.env` (в `.gitignore`) и volume `rclone_config`; в образ/репо не попадают. Список переменных с комментариями — в `.env.example`. Прод-деплой-гайд (домен, `rclone.conf`, restore) — `docs/deploy.md`.

```bash
make up          # docker compose up -d --build → https://proksion.ru (прод) / http://localhost:8080 (локально)
make ps          # статус (caddy+back+minio healthy)
make logs-caddy  # логи edge/TLS (logs-back / logs-minio — прочие)
make down        # остановить (volume'ы сохраняются)
```

## Architecture (front)

Детали — в `front/CLAUDE.md`. Кратко:

- **SPA на Vite + React + react-router** (URL-роутинг). Точка входа `src/main.tsx` → `BrowserRouter` → `App`. Маршруты: `/`, `/projects`, `/projects/:cat/:sub`, `/contacts`, catch-all → `/`.
- **Двойное дерево компонентов** `components/desktop/*` и `components/mobile/*`, выбор через `useIsMobile()` (`matchMedia('(max-width: 767.98px)')`). Это не один responsive-layout — разные компоненты; фичи делаются в обоих деревьях.
- **Листинг проектов** — блок `projects-tiles` (десктоп+мобайл) на `react-masonry-css` (Pinterest-стиль): колонки через `breakpointCols` (4/3/2 десктоп, 2 мобайл), зазоры `--tile-gap`/`--tile-gap-mob`. Тайлы со стабильным `id` (задел под клик → модалка), пока инертны.
- **Занавес-герой** — fixed-оверлей (z 1000), показывается только при свежей загрузке `/`, снимается первым вводом/кликом.
- **Стайлинг** — CSS Modules + единственный глобал `src/styles/tokens.css` (токены + `@font-face`, шрифты в `front/public/fonts/`). Респонсив — дискретные токен-тиры через `@media` (база `:root` ≥1400, 1100–1399, 768–1099, `<768` — мобильное дерево с `--*-mob`), без `scale()`/`clamp()`.

### Backend / Admin (реализовано)

Функциональная часть **реализована** по [`docs/architecture.md`](docs/architecture.md) (задачи 01–12):

- **`/back`** (Bun + ElysiaJS, TS strict, TDD). Публичный read-API (`/api/categories`, `/api/works/...`) + admin-API (`/api/admin/*`, JWT-guard). Хранение: `bun:sqlite` (WAL, миграции `.sql` на старте) + MinIO (S3) для картинок с авто-пайплайном sharp (thumb/full × avif/webp/jpg, LQIP). Auth: пароль как argon2id-хэш (`Bun.password`), JWT в httpOnly+Secure+SameSite cookie, rate-limit логина, CSRF. Off-site бэкап через `rclone` в облако (дебаунс-push по изменению + restore-on-boot на пустом окружении). Роуты объявлены **от корня** — Caddy срезает `/api` (`handle_path`).
- **`/admin`** — отдельное Vite+React+TS приложение (`base: '/admin/'`, Tailwind + shadcn), свой бандл (ноль пересечения с публичным `/front`). Экраны: логин, CRUD категорий/подкатегорий/работ, загрузка/сортировка картинок, cover/описания.
- **`/front`** — публичный листинг и модалка работы теперь берут данные из API (`src/api/`), не из статических заглушек. Картинки — `<picture>` avif/webp/jpg.

Источник правды по функц. части — `docs/architecture.md`; прод-деплой — `docs/deploy.md`. Поддерживать оба в актуальности при изменениях.

## Conventions

- **Бренд — святое.** Источник бренда теперь — `front/src/styles/tokens.css` (цвета, шрифты, размеры как CSS-токены). Только эти значения; никаких новых hex'ов, эмодзи, градиентов, drop-shadow, glass-морфизма.
- **Токены — через `var(--...)`.** Размеры/цвета/отступы не хардкодим — берём из `front/src/styles/tokens.css`.
- **TypeScript strict.** `front/tsconfig.json` — `strict` + `noUnusedLocals`/`noUnusedParameters`. Никаких `any`.
- **UI-тексты — русские.** Display-заголовки в верхнем регистре (`text-transform: uppercase`).
- **Адаптив 360–1920** через дискретные сеты, не fluid scale. На каждом тире композиция пересобирается.

## Don't

- Не добавляй зависимости без необходимости (особенно UI-библиотеки и CSS-фреймворки — у нас своя система токенов). Исключение по запросу: `react-masonry-css` (листинг тайлов проектов).
- Не возвращай Astro/SSR и не настраивай CI без явной просьбы. Бэкенд-стек уже зафиксирован (Bun/Elysia, bun:sqlite, MinIO, rclone) — не добавляй в него новые сервисы/ORM/фреймворки без явной просьбы (сверяйся с `docs/architecture.md`).

## Задачи и история

`tasks/` — нарезка работ по **функциональной части** (бэкенд/админка/хранилище/бэкап), задачи 01–12, каждая = папка `NN-kebab-case` с `context.md`/`task.md`/`verify.md`. Конвенция и индекс — в `tasks/README.md`; архитектурный источник правды — `docs/architecture.md`. Методология: `/back` и логика `/admin` — TDD (`bun test` / Vitest+RTL), публичный `/front` — SDD (проверка = build + визуал).

`tasks/_legacy-astro/` — история ранней миграции на Astro (фазы 01–05). Та реализация заменена на Vite+React SPA, поэтому те task.md — исторический контекст, а не описание текущего кода. Канон по фронту — `front/CLAUDE.md` и сам код во `/front`.

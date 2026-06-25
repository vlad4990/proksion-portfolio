# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

PROKSION — графический-дизайн портфолио для Kristina. Изначально это был экспорт из Claude design (React + Babel standalone на CDN). Фронт переписан в самостоятельный **SPA на Vite 6 + React 18 + TypeScript strict** во `/front` (раньше был Astro 6 — миграция отменена в пользу чистого Vite+React). Бэкенда нет; контент проектов — заглушки внутри компонентов.

## Repo layout

Сейчас в репозитории — только фронт. Прежние части монорепы (`/back`-заглушка, `/design-system` брендбук, `/_legacy` экспорт) удалены; восстановимы из истории git, если понадобятся.

```
/front   ← Vite 6 + React 18 SPA, TS strict (единственный живой код)
/tasks   ← история Astro-фаз миграции 01–05 (исторический контекст, стек с тех пор сменился)
```

## Running locally

Разработка:

```bash
cd front
npm install     # один раз
npm run dev     # http://localhost:5173 (Vite)
```

Для отладки в Chrome (MCP) запускай dev на 5005: `npm run dev -- --port 5005` (расширение пользователя разрешает только этот порт). Из корня то же делает `make dev`.

Сборка / type-check:

```bash
cd front
npm run build    # tsc --noEmit (strict) + vite build → front/dist/  (статика)
npm run preview  # отдать прод-сборку локально
```

Тестов, линтера и форматтера нет — проверка корректности = `npm run build`.

Корневой `Makefile` — обёртка над этими npm-скриптами (`make help` — список целей).

### Docker (прод-контейнеры монорепы)

`docker-compose.yml` в корне — оркестратор монорепы (сейчас один сервис `front`, под будущий `back` зарезервирован закомментированный блок). `front` собирается многостадийным `front/Dockerfile` (**oven/bun:1-alpine** build → **caddy:2-alpine** runtime) и отдаёт статику `dist/` через Caddy с SPA-fallback (`front/Caddyfile` — `try_files {path} /index.html`, deep-link react-router идёт на `index.html`). Bun используется только как build-тул; на проде рантайма JS нет — это статика. Адрес сайта — `SITE_ADDRESS` (`proksion.ru` в проде → Caddy сам выпускает/продлевает HTTPS Let's Encrypt; `:80` локально → обычный HTTP). Внешние порты — `HTTP_PORT`/`HTTPS_PORT` (80/443). Сертификаты переживают пересоздание через volume `caddy_data`. Healthcheck — внутренний `:8081/health` в `Caddyfile`. Бэкенд (`/api/*`) появится отдельным bun-сервисом — под него уже есть закомментированные блоки `handle_path /api/*` (Caddyfile) и `back` (compose).

```bash
make up          # docker compose up -d --build → https://proksion.ru (прод) / http://localhost (локально)
make logs-front  # хвост логов
make down        # остановить
```

## Architecture (front)

Детали — в `front/CLAUDE.md`. Кратко:

- **SPA на Vite + React + react-router** (URL-роутинг). Точка входа `src/main.tsx` → `BrowserRouter` → `App`. Маршруты: `/`, `/projects`, `/projects/:cat/:sub`, `/contacts`, catch-all → `/`.
- **Двойное дерево компонентов** `components/desktop/*` и `components/mobile/*`, выбор через `useIsMobile()` (`matchMedia('(max-width: 767.98px)')`). Это не один responsive-layout — разные компоненты; фичи делаются в обоих деревьях.
- **Занавес-герой** — fixed-оверлей (z 1000), показывается только при свежей загрузке `/`, снимается первым вводом/кликом.
- **Стайлинг** — CSS Modules + единственный глобал `src/styles/tokens.css` (токены + `@font-face`, шрифты в `front/public/fonts/`). Респонсив — дискретные токен-тиры через `@media` (база `:root` ≥1400, 1100–1399, 768–1099, `<768` — мобильное дерево с `--*-mob`), без `scale()`/`clamp()`.

### Backend

Бэкенда нет. Контент проектов — статические заглушки в компонентах. Появится ли отдельный сервис — пока не решено.

## Conventions

- **Бренд — святое.** Источник бренда теперь — `front/src/styles/tokens.css` (цвета, шрифты, размеры как CSS-токены). Только эти значения; никаких новых hex'ов, эмодзи, градиентов, drop-shadow, glass-морфизма.
- **Токены — через `var(--...)`.** Размеры/цвета/отступы не хардкодим — берём из `front/src/styles/tokens.css`.
- **TypeScript strict.** `front/tsconfig.json` — `strict` + `noUnusedLocals`/`noUnusedParameters`. Никаких `any`.
- **UI-тексты — русские.** Display-заголовки в верхнем регистре (`text-transform: uppercase`).
- **Адаптив 360–1920** через дискретные сеты, не fluid scale. На каждом тире композиция пересобирается.

## Don't

- Не добавляй зависимости без необходимости (особенно UI-библиотеки и CSS-фреймворки — у нас своя система токенов).
- Не возвращай Astro/SSR и не настраивай CI/backend-стек без явной просьбы.

## История

`tasks/0N-*/` — история ранней миграции на Astro (фазы 01–05). Эта реализация была заменена на Vite+React SPA, поэтому фазовые task.md — исторический контекст, а не описание текущего кода. Канон по фронту — `front/CLAUDE.md` и сам код во `/front`.

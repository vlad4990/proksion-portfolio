# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

PROKSION — графический-дизайн портфолио для Kristina. Изначально это был экспорт из Claude design (React + Babel standalone на CDN); миграция фаз 01–05 завершена: фронт переведён на Astro 6 во `/front`, дизайн-система остаётся single source of truth. Backend (`/back`) откладывается до post-05 — пока API из `/projects/*` уходит через stub-модуль в `front/src/lib/api.ts`.

## Monorepo layout

```
/front          ← Astro 6, TS strict, hybrid (static + один SSR-роут)
/back           ← планируется; стек не выбран, до фазы post-05
/design-system  ← single source of truth: токены, шрифты, ассеты, брендбук, ui-kits
/_legacy        ← оригинальный экспорт из Claude design (App.jsx, Portfolio.html, mobile-wireframes, screenshots, исходные fonts/assets); reference, не редактируется
/tasks          ← фазы миграции 01–05; каждая папка = task.md + verify.md
```

## Running locally

Разработка:

```bash
cd front
npm install     # один раз
npm run dev     # http://localhost:4321
```

Для отладки в Chrome (MCP) запускай dev на 5005: `npm run dev -- --port 5005`.

`public/fonts` и `public/assets` — симлинки на `design-system/fonts` и `design-system/assets`, поэтому изменения в дизайн-системе видны без копирования.

Прод-сборка (запускается из корня репо):

```bash
docker compose up --build
# http://localhost:4321
```

Type-check:

```bash
cd front && npm run type-check
```

## Architecture (front)

### Astro hybrid

`astro.config.mjs` использует `output: 'static'` + `@astrojs/node` в standalone-mode. Это hybrid-поведение Astro 5+ (флаг `'hybrid'` убрали в v5): по умолчанию все роуты prerender, отдельные роуты opt-out через `export const prerender = false`.

Сейчас SSR — только `src/pages/projects/[section]/[subsection].astro`. Все остальные роуты — статика.

### React-острова — только для интерактива

Astro по умолчанию = 0 kb JS. React (`@astrojs/react`) подключается **точечно**, через `client:load` / `client:idle` / `client:visible` — только для реально интерактивных островов: Hero `Curtain` (sessionStorage-флаг, single sweep per session) и `ProjectsLayout` (Sidebar + Grid c skeleton-фазой). Навигация (`TopNav`, `MobileTabBar`) — `.astro` без `client:*`, активный пункт вычисляется на сервере по `Astro.url.pathname`. Всё остальное — статические `.astro`. Bundle и скорость отдачи — приоритет.

### Tokens, fonts, breakpoints

Все цвета, типографика, шрифты и брейкпойнты живут в `design-system/colors_and_type.css`. `front/src/styles/tokens.css` импортирует его через `@import`. Не дублируем значения, не вводим inline-hex'ов.

Брейкпойнты как переменные: `--bp-xs 360`, `--bp-sm 480`, `--bp-md 768`, `--bp-lg 1024`, `--bp-xl 1280`, `--bp-2xl 1440`, `--bp-3xl 1920`. Типографика — дискретные сеты через @media в самом файле токенов; каждый брейк имеет отдельную композицию, не просто scale.

Шрифты — два: Stengazeta (display) и Kanit Cyrillic (body). Файлы — `design-system/fonts/`, шарятся во фронт через симлинки. `front/src/styles/fonts.css` дублирует `@font-face` с **абсолютными** путями `/fonts/...` (внутри бандла относительные пути ломаются); design-system-версия использует относительные `fonts/...` чтобы preview/ и ui_kits/ работали при прямом открытии.

### Routing

- `/` — главная: hero (`HeroComposition` под `Curtain`) → `About` (опыт, образование, маскированные фото).
- `/projects` — редирект на `DEFAULT_SECTION/DEFAULT_SUBSECTION` (из `src/lib/projects-tree.ts`, SSR).
- `/projects/[section]/[subsection]` — SSR-роут (`prerender = false`): sidebar + grid, контент тайлов через `front/src/lib/api.ts`.
- `/contacts` — список контактных каналов (`front/src/data/contacts.ts`, prerender).
- Sitemap: `/sitemap-index.xml` (через `@astrojs/sitemap`), `robots.txt` в `front/public/`. Домен в `astro.config.mjs` сейчас плейсхолдер `https://proksion.ru` — заменить перед деплоем.

### Layout и навигация

`BaseLayout.astro` ставит `<head>` (preload шрифтов, OG/Twitter мета, `theme-color`), inline-скрипт раннего флага занавеса, skip-link и общую nav (`<TopNav />` + `<MobileTabBar />`). На десктопе `TopNav` — sticky-top (z 50); на mobile он скрыт, его заменяет fixed-bottom `MobileTabBar` (z 200) с safe-area-инсетом. `Curtain` (z 1000) перекрывает nav на главной до dismiss.

### Backend

Сейчас отсутствует. API из `/projects/*` идёт через `front/src/lib/api.ts` со stub-данными; контракт спроектирован так, чтобы будущий `/back` подменил один модуль. План на post-05: положить сервис в `/back`, добавить в `docker-compose.yml` рядом с `front`.

## Conventions

- **Бренд — святое.** Только цвета/шрифты/иконки из `design-system/`. Никаких новых hex'ов, эмодзи, градиентов, drop-shadow, glass-морфизма. Подробно — `design-system/README.md`.
- **Токены — single source of truth.** Размеры/цвета/отступы — через `var(--...)`. Нужного токена нет — добавь его в `design-system/colors_and_type.css`, не сбоку.
- **TypeScript strict.** `tsconfig.json` наследует `astro/tsconfigs/strict`. Никаких `any`. Алиас `@` → `./src`.
- **UI-тексты — русские.** Display-заголовки в верхнем регистре (`text-transform: uppercase`).
- **Адаптив 360–1920** через дискретные сеты, не fluid scale. На каждом брейке композиция пересобирается.
- **`_legacy/` не редактируем.** Это reference. Mobile-компоненты там не каноничны — фазы 02–05 переосмысливают их, а не копируют 1:1.

## Don't

- Не добавляй зависимости без необходимости (особенно UI-библиотеки и CSS-фреймворки — у нас своя дизайн-система).
- Не пиши новые компоненты в `_legacy/` и не правь там код. Если оттуда что-то нужно перенести — копируй смысл, переписывай под Astro.
- Не открывай `screenshots/`, `mobile-wireframes/`, `uploads/` если задача этого явно не требует — они нужны конкретным фазам.
- Не настраивай CI и не выбирай backend-стек до фазы post-05.

## Миграция

Фазы 01–05 завершены — сайт готов к продакшну (минус подмена домена и реальных контактов). История по фазам — в `tasks/0N-*/`; `tasks/README.md` — обзор.

| Фаза | Что появилось |
|---|---|
| 01 | Astro-каркас, токены, шрифты, Docker, пустые роуты |
| 02 | Hero + Curtain (sessionStorage single-sweep) |
| 03 | About: контент `/`, JobEntry/Education, маскированные фото |
| 04 | `/projects` SSR-роут с sidebar + grid и stub-API |
| 05 | TopNav + MobileTabBar, `/contacts`, sitemap/robots, healthcheck, финальный аудит |

Дальнейшие шаги (post-05): домен в `astro.config.mjs`, реальные ссылки в `front/src/data/contacts.ts`, backend в `/back`, reverse-proxy с SSL у пользователя на сервере.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

PROKSION — графический-дизайн портфолио для Kristina. Изначально это был экспорт из Claude design (React + Babel standalone на CDN). Фронт переписан в самостоятельный **SPA на Vite 6 + React 18 + TypeScript strict** во `/front` (раньше был Astro 6 — миграция отменена в пользу чистого Vite+React). Backend (`/back`) пока не существует; контент проектов — заглушки внутри компонентов. `design-system/` остаётся брендбуком-референсом.

## Monorepo layout

```
/front          ← Vite 6 + React 18 SPA, TS strict (актуальный фронт)
/back           ← планируется; стек не выбран
/design-system  ← брендбук-референс: токены, шрифты, ассеты, ui-kits (single source of truth по бренду)
/_legacy        ← оригинальный экспорт из Claude design (App.jsx, Portfolio.html, mobile-wireframes, screenshots, fonts/assets); reference, не редактируется
/tasks          ← история Astro-фаз миграции 01–05 (исторические, стек с тех пор сменился)
```

## Running locally

Разработка:

```bash
cd front
npm install     # один раз
npm run dev     # http://localhost:5173 (Vite)
```

Для отладки в Chrome (MCP) запускай dev на 5005: `npm run dev -- --port 5005` (расширение пользователя разрешает только этот порт).

Сборка / type-check:

```bash
cd front
npm run build    # tsc --noEmit (strict) + vite build → front/dist/  (статика)
npm run preview  # отдать прод-сборку локально
```

Тестов, линтера и форматтера нет — проверка корректности = `npm run build`.

> ⚠️ Docker-путь устарел. `docker-compose.yml` и `Makefile` остались от Astro-эпохи (ожидают `front/Dockerfile`, который удалён, и порт 4321/SSR). Для текущего Vite-SPA прод — это статический `front/dist/`; контейнеризацию/compose надо переделать под отдачу статики перед деплоем.

## Architecture (front)

Детали — в `front/CLAUDE.md`. Кратко:

- **SPA на Vite + React + react-router** (URL-роутинг). Точка входа `src/main.tsx` → `BrowserRouter` → `App`. Маршруты: `/`, `/projects`, `/projects/:cat/:sub`, `/contacts`, catch-all → `/`.
- **Двойное дерево компонентов** `components/desktop/*` и `components/mobile/*`, выбор через `useIsMobile()` (`matchMedia('(max-width: 767.98px)')`). Это не один responsive-layout — разные компоненты; фичи делаются в обоих деревьях.
- **Занавес-герой** — fixed-оверлей (z 1000), показывается только при свежей загрузке `/`, снимается первым вводом/кликом.
- **Стайлинг** — CSS Modules + единственный глобал `src/styles/tokens.css` (токены + `@font-face`, шрифты в `front/public/fonts/`). Респонсив — дискретные токен-тиры через `@media` (база `:root` ≥1400, 1100–1399, 768–1099, `<768` — мобильное дерево с `--*-mob`), без `scale()`/`clamp()`.

### Backend

Сейчас отсутствует. Контент проектов — статические заглушки в компонентах. Появится позже в `/back` рядом с фронтом.

## Conventions

- **Бренд — святое.** Только цвета/шрифты/иконки из `design-system/`. Никаких новых hex'ов, эмодзи, градиентов, drop-shadow, glass-морфизма. Подробно — `design-system/README.md`.
- **Токены — через `var(--...)`.** Размеры/цвета/отступы не хардкодим. Рабочий источник токенов для фронта — `front/src/styles/tokens.css` (значения инлайнены из дизайн-системы; синхронизируй смысл с `design-system/`).
- **TypeScript strict.** `front/tsconfig.json` — `strict` + `noUnusedLocals`/`noUnusedParameters`. Никаких `any`.
- **UI-тексты — русские.** Display-заголовки в верхнем регистре (`text-transform: uppercase`).
- **Адаптив 360–1920** через дискретные сеты, не fluid scale. На каждом тире композиция пересобирается.
- **`_legacy/` не редактируем.** Это reference.

## Don't

- Не добавляй зависимости без необходимости (особенно UI-библиотеки и CSS-фреймворки — у нас своя дизайн-система).
- Не пиши новые компоненты в `_legacy/` и не правь там код. Если оттуда что-то нужно перенести — копируй смысл, переписывай под текущий React-стек.
- Не открывай `screenshots/`, `mobile-wireframes/`, `uploads/` если задача этого явно не требует.
- Не возвращай Astro/SSR и не настраивай CI/backend-стек без явной просьбы.

## История

`tasks/0N-*/` — история ранней миграции на Astro (фазы 01–05). Эта реализация была заменена on Vite+React SPA, поэтому фазовые task.md — исторический контекст, а не описание текущего кода. Канон по фронту — `front/CLAUDE.md` и сам код во `/front`.

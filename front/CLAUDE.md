# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Vite dev server → http://localhost:5173
npm run build    # tsc --noEmit (type-check) + vite build → dist/
npm run preview  # serve the production build locally
```

Для отладки в Chrome (MCP) запускай dev на 5005: `npm run dev -- --port 5005` (расширение пользователя разрешает только этот порт).

Нет тестов, линтера и форматтера. Проверка корректности — `npm run build` (он же гоняет `tsc --noEmit` в strict-режиме с `noUnusedLocals`/`noUnusedParameters`).

Весь UI и контент — на русском; сохраняй язык при правках. Display-заголовки — в верхнем регистре.

## Stack

SPA на **Vite 6 + React 18 + TypeScript strict**. Зависимостей минимум: `react`, `react-dom`, `react-router` (7.x). Никаких UI-библиотек и CSS-фреймворков — своя дизайн-система на CSS-токенах. Точка входа — `src/main.tsx` (`BrowserRouter` → `App`).

> Исторически фронт был на Astro + React islands; миграция на чистый Vite+React SPA завершена — никаких `.astro`, SSR и `@astrojs/*` больше нет.

## Architecture

Одностраничное портфолио. Ключевые неочевидные решения:

### Роутинг — react-router, по URL

`App.tsx` использует `react-router` (`Routes/Route/Navigate/useLocation/useNavigate`). Активный экран выводится из `pathname` через `pathnameToRoute()`. Маршруты:

- `/` — home (about)
- `/projects` и `/projects/:cat/:sub`
- `/contacts`
- `*` — `<Navigate to="/" replace />`

URL реально меняется (`useNavigate`), история работает. Навигация: десктоп — через `TopNav` (колбэки `onHome/onProjects/onContacts` + плавный скролл), мобайл — через `MobileTabBar`. После перехода — `window.scrollTo(0,0)`.

### Двойное дерево компонентов (не адаптив через CSS)

`App.tsx` через `useIsMobile()` (хук на `matchMedia('(max-width: 767.98px)')`) выбирает **одно из двух полностью отдельных деревьев** — `components/desktop/*` или `components/mobile/*`. Это не один отзывчивый layout: десктоп и мобайл — разные компоненты с разной разметкой. Любую фичу, затрагивающую обе платформы, нужно реализовывать в обоих деревьях (напр. `ProjectsScreen.tsx` + `MobileProjects.tsx`). Они расходятся и в данных — массивы `GROUPS`/тайлов дублируются и слегка отличаются между двумя файлами.

### Занавес-герой (hero curtain)

Hero — это **fixed-оверлей поверх всего** (z-index 1000), а не первая секция. Управляется `heroPhase` (`'visible' | 'dismissing' | 'gone'`). Показывается **только при свежей загрузке пути `/`**; deep-link на `/projects` и т.п. инициализирует `heroPhase` сразу в `'gone'` (занавес пропускается). Любой первый ввод (`wheel`/`touchstart`/`keydown`) или клик запускает `dismissHero()` → CSS `translateY(-100%)` → через 600ms `heroPhase` → `'gone'` и оверлей удаляется из DOM. Пока занавес поднят, скролл документа заблокирован (`documentElement.style.overflow = 'hidden'`).

## Styling — CSS Modules + tokens (строго)

- **Единственный глобальный CSS** — `src/styles/tokens.css`: `@font-face`, сброс и все дизайн-токены как CSS Custom Properties в `:root`. Компоненты читают их через `var(--token)`. Шрифты лежат в `public/fonts/` (`Stengazeta-Regular.ttf`, `Kanit-Cyrillic.ttf`), пути в `@font-face` абсолютные `/fonts/...`.
- Каждый компонент — пара `Name.tsx` + `Name.module.css`. **Никаких инлайн-стилей и хардкода цветов/размеров.** Единственное допустимое инлайн-исключение — данные тайлов проектов (высота/картинка/цвет), которые приходят из массива.
- `src/styles/layout.module.css` — общая центрированная колонка `.page` (fluid-ширина до `--page-max`, фиксированные гаттеры по тиру). `src/App.module.css` — chrome: оверлей-занавес, fixed nav-host, stage.

### Респонсив — токеновые тиры, без scale/clamp

Размеры не «резинятся». `tokens.css` переопределяет набор токенов в тирах: база в `:root` (`≥1400`), `@media 1100–1399.98`, `@media 768–1099.98`, и `<768` — мобильное дерево, использующее токены с суффиксом `--*-mob` (заданы в `:root`). Внутри тира всё фиксировано; fluid остаётся только ширина контентных колонок. Чтобы поправить размеры — меняй токены в нужном медиа-блоке `tokens.css`, не добавляй `transform: scale()` или `clamp()` в компонентах.

## Project structure

```
src/
├── main.tsx             # BrowserRouter → App
├── App.tsx              # react-router (URL) + занавес-герой + выбор дерева
├── types.ts             # Route ('home'|'projects'|'contacts'), HeroPhase
├── hooks/useIsMobile.ts # брейкпоинт <768px (matchMedia)
├── styles/              # tokens.css (глобальный) + layout.module.css
├── App.module.css       # chrome: curtain / nav-host / stage
└── components/
    ├── desktop/  TopNav · HeroSection · AboutSection · ProjectsScreen · ContactsScreen
    └── mobile/   MobileTabBar · MobileHero · MobileAbout · MobileProjects · MobileContacts
```

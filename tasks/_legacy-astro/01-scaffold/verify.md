# Phase 01 — Verification

Проходить **сверху вниз**, ничего не пропускать. Каждый пункт должен дать ✅ или конкретное описание проблемы.

## A. Структура репозитория

```bash
ls -la /Users/vtorgovcev/Downloads/portfolio
```

- [ ] В корне есть директории: `front/`, `_legacy/`, `design-system/`, `tasks/`.
- [ ] В корне есть файлы: `docker-compose.yml`, `.dockerignore`, `.gitignore`, `CLAUDE.md`.
- [ ] В корне **отсутствуют** старые файлы: `App.jsx`, `HeroSection.jsx`, `AboutSection.jsx`, `ProjectsScreen.jsx`, `TopNav.jsx`, `Mobile*.jsx`, `Portfolio.html`, `colors_and_type.css` (root version), `mobile-wireframes/`, `screenshots/`, `uploads/`, `.design-canvas.state.json`.
- [ ] `_legacy/` содержит всё перечисленное в пункте (A) задачи 01.
- [ ] `design-system/` не двигалась — `git status` показывает только изменения в `colors_and_type.css` (расширение токенов).

## B. Astro-проект инициализирован

```bash
cd /Users/vtorgovcev/Downloads/portfolio/front
cat package.json | head -30
```

- [ ] Зависимости: `astro`, `@astrojs/react`, `@astrojs/node`, `react`, `react-dom`, `typescript`, `@types/react`, `@types/react-dom`.
- [ ] Scripts: `dev`, `build`, `preview`, `start`, `type-check` — все присутствуют.
- [ ] `astro.config.mjs`: `output: 'hybrid'`, адаптер `node` в standalone-mode, интеграция `react()`, алиас `@` → `/src`.
- [ ] `tsconfig.json` наследует `astro/tsconfigs/strict`.

## C. Файлы в src/

```bash
find /Users/vtorgovcev/Downloads/portfolio/front/src -type f
```

Должны быть:

- [ ] `src/layouts/BaseLayout.astro`
- [ ] `src/pages/index.astro`
- [ ] `src/pages/projects/index.astro`
- [ ] `src/pages/projects/[section]/[subsection].astro` (внутри есть `export const prerender = false`)
- [ ] `src/pages/contacts.astro`
- [ ] `src/styles/tokens.css` (импортит `design-system/colors_and_type.css`)
- [ ] `src/styles/fonts.css` (`@font-face` для Stengazeta и Kanit с путями `/fonts/...`)
- [ ] `src/styles/breakpoints.css` (может быть пустой, но создан)
- [ ] `src/styles/global.css` (html/body resets)
- [ ] `src/components/.gitkeep`, `src/data/.gitkeep`, `src/lib/.gitkeep`

## D. Шрифты и ассеты

```bash
ls -la /Users/vtorgovcev/Downloads/portfolio/front/public/
ls /Users/vtorgovcev/Downloads/portfolio/front/public/fonts/
ls /Users/vtorgovcev/Downloads/portfolio/front/public/assets/ | head
```

- [ ] `front/public/fonts/` — симлинк на `../../design-system/fonts` (читается, выводит `Kanit-Cyrillic.ttf`, `Stengazeta-Regular.ttf`).
- [ ] `front/public/assets/` — симлинк на `../../design-system/assets` (читается, выводит `photo-hero-portrait.png`, маски, и т.д.).

## E. Токены расширены

```bash
grep -n "bp-md\|--t-port-folio\|@media (max-width: 767px)" /Users/vtorgovcev/Downloads/portfolio/design-system/colors_and_type.css
```

- [ ] Файл содержит `:root { --bp-xs ... --bp-3xl }` (брейкпойнты как переменные).
- [ ] Содержит `@media (max-width: 1279px)` с переопределением `--t-*`.
- [ ] Содержит `@media (max-width: 767px)` с переопределением `--t-*` и mobile-layout токенами (`--page-pad`, `--mob-header-h`, `--mob-tabbar`, `--mob-safe-bottom`).
- [ ] Содержит `@media (max-width: 479px)` с уменьшенной hero-шкалой.
- [ ] Базовый `:root` содержит `--t-port-folio` (~380px для giant outlined lockup).
- [ ] Десктоп-значения **не изменились**: `--t-hero: 100px`, `--t-header-1: 80px`, `--t-section: 52px`, `--t-header-2: 40px`, `--t-sub-section: 32px`, `--t-body: 22px` — нашлись в файле.

## F. Docker

```bash
cat /Users/vtorgovcev/Downloads/portfolio/front/Dockerfile
cat /Users/vtorgovcev/Downloads/portfolio/docker-compose.yml
```

- [ ] `Dockerfile` — multi-stage (`deps`, `build`, `runtime`), runtime — `node:20-alpine`, `USER node`, `EXPOSE 4321`, `CMD node ./dist/server/entry.mjs`.
- [ ] `Dockerfile` копирует `design-system/` в build-стейдж и заменяет симлинки на реальные копии в `public/`.
- [ ] `docker-compose.yml` — один сервис `front`, build-контекст `.`, порт `4321:4321`, restart-policy задан.
- [ ] `.dockerignore` исключает `node_modules`, `dist`, `_legacy`, `screenshots`, `uploads`, `.git`.

## G. Type-check проходит

```bash
cd /Users/vtorgovcev/Downloads/portfolio/front
npm run type-check
```

- [ ] Exit code 0, никаких ошибок.

## H. Dev-сервер поднимается

```bash
cd /Users/vtorgovcev/Downloads/portfolio/front
npm run dev
```

Параллельно в браузере открыть и убедиться (визуально):

- [ ] `http://localhost:4321/` — открывается, фон `#141414` (near-black), виден заголовок «PROKSION» красным (Stengazeta).
- [ ] `http://localhost:4321/projects` — открывается, корректный фон/шрифт.
- [ ] `http://localhost:4321/projects/press-f/banners` — открывается, отдаёт `section: press-f`, `subsection: banners`. На второй reload `Astro.params` сохраняется (= SSR работает).
- [ ] `http://localhost:4321/contacts` — открывается.
- [ ] **Шрифты загружены** — открыть DevTools → Network → Fonts: видны `Stengazeta-Regular.ttf` и `Kanit-Cyrillic.ttf`, оба со статусом 200, тип `font`. Если шрифт не подгружен — заголовок будет дефолтным sans-serif, это видно глазами.
- [ ] **Адаптив работает** — переключить viewport в DevTools на 360px ширину: размер заголовка уменьшается (не `100px` как на десктопе, а меньше — `38–44px` в зависимости от диапазона).

## I. Prod-сборка через Docker

```bash
cd /Users/vtorgovcev/Downloads/portfolio
docker compose up --build
```

После сборки:

- [ ] `http://localhost:4321/` отвечает 200 OK.
- [ ] `http://localhost:4321/projects/press-f/banners` отдаёт правильно подставленные параметры (SSR в проде).
- [ ] `http://localhost:4321/fonts/Stengazeta-Regular.ttf` отдаёт 200 (статика по симлинку → копии работает).
- [ ] `http://localhost:4321/assets/photo-hero-portrait.png` отдаёт 200.
- [ ] Финальный образ `proksion-front:dev` весит меньше 300 MB:
  ```bash
  docker images proksion-front:dev
  ```

## J. Документация обновлена

- [ ] `CLAUDE.md` в корне переписан под Astro + monorepo, описывает `/front`, `/back` (placeholder), `/design-system`, `/_legacy`, `/tasks`. Старая инструкция про Babel-standalone и `python3 -m http.server` удалена.
- [ ] `front/README.md` создан, содержит команды `npm run dev`, `docker compose up`, ссылки на `design-system/README.md` и `tasks/`.

## K. Git

```bash
git status
git log --oneline -3
```

- [ ] Все изменения закоммичены.
- [ ] Перемещение в `_legacy/` сделано через `git mv` (история файлов сохранена) или один атомарный коммит «move legacy code».
- [ ] Astro-каркас — отдельный коммит «scaffold Astro project (phase 01)».

## Если что-то не сошлось

Записать конкретный пункт + симптом и пинговать пользователя. Не пытаться чинить «на лету» вещи, которые требуют перепроектирования (например, замена `output: 'hybrid'` на что-то ещё) — это решение требует подтверждения.

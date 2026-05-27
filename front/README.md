# PROKSION — front

Astro 6 (TypeScript strict, React-острова, Node-adapter standalone). Большинство роутов prerender-статика, динамический `/projects/[section]/[subsection]` — SSR. Бренд, токены и шрифты — `design-system/`. Миграция фаз 01–05 завершена.

## Команды

```bash
cd front
npm install
npm run dev                  # http://localhost:4321
npm run dev -- --port 5005   # для Chrome MCP отладки
npm run type-check           # astro check (strict)
npm run build                # сборка в dist/
npm run start                # node ./dist/server/entry.mjs
```

`public/fonts` и `public/assets` — симлинки на `design-system/fonts` и `design-system/assets`. Меняешь файлы в `design-system/` — dev-сервер видит мгновенно.

## Прод-сборка через Docker

Запускается из корня репо (нужен контекст и `front/`, и `design-system/`):

```bash
cd ..
docker compose up --build -d
# http://localhost:4321
docker compose ps     # healthcheck: front — running (healthy)
docker compose down
```

В `docker-compose.yml` настроен healthcheck через встроенный `fetch()` в Node 22 — без wget/curl.

## Структура

```
front/
├── astro.config.mjs              # output: 'static' + node adapter; site + sitemap
├── tsconfig.json                 # extends astro/tsconfigs/strict, alias @ → ./src
├── Dockerfile                    # multi-stage; контекст = корень репо
├── src/
│   ├── layouts/BaseLayout.astro          # <head>, OG, theme-color, TopNav + MobileTabBar, skip-link
│   ├── pages/
│   │   ├── index.astro                          # /                       (prerender)
│   │   ├── projects/index.astro                 # /projects → редирект    (SSR)
│   │   ├── projects/[section]/[subsection].astro# детальная               (SSR)
│   │   └── contacts.astro                       # /contacts               (prerender)
│   ├── components/
│   │   ├── nav/TopNav.astro                     # десктоп: wordmark + 3 пункта + год
│   │   ├── nav/MobileTabBar.astro               # mobile: fixed-bottom 3-tab
│   │   ├── hero/                                # HeroComposition + Curtain (React-island)
│   │   ├── about/                               # About + JobEntry/EducationEntry + MaskedPhoto
│   │   └── projects/                            # ProjectsLayout (React: Sidebar + Grid)
│   ├── data/
│   │   ├── about.ts experience.ts education.ts  # контент главной
│   │   └── contacts.ts                          # TODO: реальные ссылки
│   ├── lib/
│   │   ├── projects-tree.ts                     # sidebar-дерево
│   │   └── api.ts                               # stub-API; будущий /back подменит модуль
│   └── styles/
│       ├── tokens.css         # @import design-system/colors_and_type.css
│       ├── fonts.css          # @font-face с абсолютными путями /fonts/...
│       ├── breakpoints.css    # layout-уровневые @media
│       └── global.css         # html/body resets + .sr-only
└── public/
    ├── fonts -> ../../design-system/fonts
    ├── assets -> ../../design-system/assets
    └── robots.txt             # ссылается на /sitemap-index.xml
```

## Архитектурные заметки

- **Hybrid**: `output: 'static'` + `@astrojs/node` standalone — все роуты prerender, кроме `projects/*` (через `export const prerender = false`).
- **React только для интерактива**: `Curtain` (`client:load`, sessionStorage single-sweep) и `ProjectsLayout` (с skeleton-фазой). Nav — статические `.astro`.
- **Z-index**: Curtain 1000 → MobileTabBar 200 → TopNav 50 → контент 1.
- **Sitemap**: `@astrojs/sitemap` собирает `dist/client/sitemap-index.xml` и `sitemap-0.xml` из prerender-роутов. SSR-роут `/projects/[section]/[subsection]` в индекс не попадает (это норма для Astro sitemap-интеграции).
- **Домен**: `astro.config.mjs` → `site: 'https://proksion.ru'` — placeholder, заменить перед деплоем.

## Куда смотреть

- `../design-system/README.md` — брендбук (визуальный язык, голос, антипаттерны).
- `../design-system/SKILL.md` — quick-start правил бренда.
- `../tasks/` — история миграции, фазы 01–05.
- `../CLAUDE.md` — рабочая инструкция для Claude Code по этому репо.

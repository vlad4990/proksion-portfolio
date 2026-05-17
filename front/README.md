# PROKSION — front

Astro 6 (TypeScript strict, React-острова, Node-adapter standalone). Большинство роутов prerender-статика, динамический `/projects/[section]/[subsection]` — SSR. Бренд, токены и шрифты — `design-system/`.

## Локальная разработка

```bash
cd front
npm install
npm run dev          # http://localhost:4321
```

`public/fonts` и `public/assets` — симлинки на `design-system/fonts` и `design-system/assets`. Меняешь файлы в `design-system/` — dev сервер видит мгновенно.

## Прод-сборка через Docker

Запускается из корня репо (нужен контекст и `front/`, и `design-system/`):

```bash
cd ..
docker compose up --build
# http://localhost:4321
```

## Структура

```
front/
├── astro.config.mjs              # output: 'static' + node adapter; см. комментарий
├── tsconfig.json                 # extends astro/tsconfigs/strict, alias @ → ./src
├── Dockerfile                    # multi-stage; контекст = корень репо
├── src/
│   ├── layouts/BaseLayout.astro  # <head>, шрифты, токены
│   ├── pages/
│   │   ├── index.astro                          # /
│   │   ├── projects/index.astro                 # /projects
│   │   ├── projects/[section]/[subsection].astro# SSR (prerender = false)
│   │   └── contacts.astro                       # /contacts
│   ├── styles/
│   │   ├── tokens.css         # @import design-system/colors_and_type.css
│   │   ├── fonts.css          # @font-face с абсолютными путями /fonts/...
│   │   ├── breakpoints.css    # layout-уровневые @media (для фаз 02+)
│   │   └── global.css         # html/body resets
│   ├── components/   # пусто; фазы 02+
│   ├── data/         # пусто
│   └── lib/          # пусто; фаза 04 положит сюда api.ts
└── public/
    ├── fonts -> ../../design-system/fonts
    └── assets -> ../../design-system/assets
```

## Куда смотреть

- `../design-system/README.md` — брендбук (визуальный язык, голос, антипаттерны).
- `../design-system/SKILL.md` — quick-start правил бренда.
- `../tasks/` — задачи миграции, фазы 01–05.

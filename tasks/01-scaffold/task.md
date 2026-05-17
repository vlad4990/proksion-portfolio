# Phase 01 — Scaffold

## TL;DR

Создать в `/front` пустой Astro-проект (TypeScript strict, React-интеграция, Node-adapter, hybrid output), подключить токены и шрифты из `design-system/`, поднять Docker-пайплайн (build → static + SSR), перенести старый код в `_legacy/`, расширить токены типографики на адаптив. На выходе — четыре пустых роута, отдающихся как через `astro dev`, так и через `docker compose up`.

## Prerequisites

Никаких. Это самая первая фаза.

## Контекст, который нужно загрузить

| Путь | Зачем |
|---|---|
| `design-system/README.md` | Раздел VISUAL FOUNDATIONS — цвета, шрифты, ограничения. Раздел Font status — какие шрифты canon. |
| `design-system/SKILL.md` | Quick-start правил бренда. |
| `design-system/colors_and_type.css` | Текущая каноничная версия токенов. Её надо расширить под адаптив, но **внутри неё**, а не сбоку. |
| `colors_and_type.css` (в корне) | Содержит mobile-токены `--*-mob` и `--mob-*`, которых нет в design-system. Перенесём их в каноничный файл как @media-переопределения. |
| `Portfolio.html` | Понять, какие шрифты подключены, какие inline-стили нужны body. |
| `App.jsx` | Понять текущую модель curtain + routing (нужно будет в фазе 02). |

Читать **только эти** файлы. Не открывать `assets/`, `screenshots/`, `mobile-wireframes/`, конкретные `.jsx`-компоненты — они нужны фазам 02+.

## Архитектурные решения (повтор)

- **Frontend:** Astro 5+, `@astrojs/react`, `@astrojs/node`, `output: 'hybrid'` (стартовая страница и большинство роутов — prerender, `/projects/[section]/[subsection]` будет SSR).
- **Структура монорепы:** `/front` для Astro, `/back` — будущий backend, `/design-system` — single source of truth, `/_legacy` — старый экспорт.
- **Деплой:** Docker. Multi-stage сборка `node:20-alpine` → runtime `node:20-alpine` (SSR требует Node). nginx внутри не нужен — Astro Node-adapter сам отдаёт статику. Перед ним позже встанет reverse-proxy на сервере пользователя.
- **Адаптив:** дискретные сеты типографики через @media. Брейкпойнты: 360, 480, 768, 1024, 1280, 1440, 1920.

## Deliverables

### A. Реорганизация репозитория

Создать `_legacy/` и переместить туда **всё**, что относится к старому экспорту из Claude design:

```
_legacy/
├── App.jsx
├── AboutSection.jsx
├── HeroSection.jsx
├── MobileAbout.jsx
├── MobileContacts.jsx
├── MobileHero.jsx
├── MobileProjects.jsx
├── MobileTabBar.jsx
├── ProjectsScreen.jsx
├── TopNav.jsx
├── Portfolio.html
├── colors_and_type.css        ← root version (с mobile-токенами)
├── mobile-wireframes/
├── screenshots/
├── uploads/
├── assets/                    ← дубликат design-system/assets, оставляем для истории
├── fonts/                     ← аналогично
└── .design-canvas.state.json
```

`design-system/` **не трогаем** (она вся каноничная).

Это `git mv` под капотом — старайтесь использовать его, чтобы история сохранилась. Если коммит большой — добавьте в сообщение «move-only, no content changes».

### B. Astro-проект в `/front`

Инициализация:

```bash
cd /Users/vtorgovcev/Downloads/portfolio
mkdir front
cd front
npm create astro@latest . -- --template minimal --typescript strict --no-install --no-git --skip-houston
npm install
npx astro add react node
# при вопросе про output mode — выбираем "hybrid" (или setup потом руками в astro.config.mjs)
```

Если интерактивные промпты мешают — можно поставить руками:

```bash
npm install astro @astrojs/react @astrojs/node react react-dom
npm install -D typescript @types/react @types/react-dom
```

`front/package.json` — scripts:

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "start": "node ./dist/server/entry.mjs",
    "type-check": "astro check"
  }
}
```

`front/astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';

export default defineConfig({
  output: 'hybrid',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  server: { port: 4321, host: true },
  vite: {
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  },
});
```

`front/tsconfig.json` — наследовать `astro/tsconfigs/strict`, добавить алиас `@/*` → `./src/*`.

### C. Структура `/front/src`

```
src/
├── pages/
│   ├── index.astro                       # / (placeholder — фаза 03 наполнит)
│   ├── projects/
│   │   ├── index.astro                   # /projects (placeholder)
│   │   └── [section]/[subsection].astro  # SSR placeholder с export const prerender = false
│   └── contacts.astro                    # /contacts (placeholder)
├── layouts/
│   └── BaseLayout.astro                  # <head>, шрифты, токены, slot
├── components/
│   └── .gitkeep                          # пусто; заполнят фазы 02+
├── styles/
│   ├── tokens.css                        # импортирует design-system/colors_and_type.css
│   ├── breakpoints.css                   # @media-переопределения --t-* для каждого брейка
│   └── global.css                        # html/body resets, шрифт по умолчанию
├── data/
│   └── .gitkeep
└── lib/
    └── .gitkeep
```

**Подключение токенов**: создать `front/src/styles/tokens.css` как:

```css
@import url("../../../design-system/colors_and_type.css");
```

Это работает, потому что Vite (под капотом Astro) resolveит относительные CSS-импорты. **Не копировать файл** — он должен быть single source.

### D. Шрифты и ассеты

Шрифты лежат в `design-system/fonts/`. Astro обслуживает `/public/` как static root. Чтобы не дублировать, делаем симлинки:

```bash
cd /Users/vtorgovcev/Downloads/portfolio/front
mkdir -p public
ln -s ../../design-system/fonts public/fonts
ln -s ../../design-system/assets public/assets
```

В `design-system/colors_and_type.css` `@font-face` ссылается на `url("fonts/...")` — этот путь должен резолвиться от того места, откуда CSS загружается браузером. Поскольку CSS импортируется внутрь Astro-бандла, **относительные пути в @font-face перестают работать**. Решение: переписать `@font-face` на абсолютные пути от корня сайта (`url("/fonts/Stengazeta-Regular.ttf")`) **внутри `design-system/colors_and_type.css`**. Это не сломает остальное — preview-карточки тоже хостятся со static root, а ui_kits/portfolio/ работает через `../fonts/...` и его можно поправить отдельно (вне scope этой фазы — пометить TODO).

Альтернатива: вынести `@font-face` в отдельный файл `front/src/styles/fonts.css` и импортить его в `BaseLayout.astro` с относительным путём в Astro-стиле. Это **предпочтительный путь**, чтобы не править design-system. Тогда в `design-system/colors_and_type.css` оставляем `@font-face` как было (для preview/ и ui_kits/), а в `/front` дублируем их в `fonts.css` с абсолютными путями `/fonts/...`. Дублирование оправдано: shipped-в-браузер CSS должен видеть пути от корня сайта, а внутри design-system пути от файла. Прокомментировать в обоих местах ссылкой друг на друга.

### E. Расширение токенов под адаптив

Цель: добавить в `design-system/colors_and_type.css` дискретные @media-переопределения для шрифтовых токенов и брейкпойнт-переменные. **Mobile-токены из root `colors_and_type.css` (которые сейчас в `_legacy/colors_and_type.css`) — изучить и канонизировать.**

Текущие десктоп-значения (≥1280px) **не трогать**:
- `--t-hero: 100px`, `--t-header-1: 80px`, `--t-section: 52px`, `--t-header-2: 40px`, `--t-sub-section: 32px`, `--t-body: 22px`.

Добавить в самый низ `design-system/colors_and_type.css`:

```css
/* === Breakpoints — каноничные =========================================== */
:root {
  --bp-xs:  360px;
  --bp-sm:  480px;
  --bp-md:  768px;
  --bp-lg:  1024px;
  --bp-xl:  1280px;
  --bp-2xl: 1440px;
  --bp-3xl: 1920px;
}

/* === Responsive typography — дискретные сеты ============================ */
/* Tablet (768–1279) — масштаб ~0.7 от десктопа */
@media (max-width: 1279px) {
  :root {
    --t-hero:        72px;
    --t-header-1:    56px;
    --t-section:     40px;
    --t-header-2:    32px;
    --t-sub-section: 24px;
    --t-body:        18px;
  }
}

/* Mobile (480–767) — пересмотренная mobile-шкала из _legacy/colors_and_type.css */
@media (max-width: 767px) {
  :root {
    --t-hero:        44px;
    --t-header-1:    44px;
    --t-section:     30px;
    --t-header-2:    20px;
    --t-sub-section: 17px;
    --t-body:        14px;
    --t-port-folio:  144px;  /* outlined hero lockup на mobile */
  }
}

/* Tiny mobile (<480) — компактный вариант */
@media (max-width: 479px) {
  :root {
    --t-hero:        38px;
    --t-port-folio:  108px;
  }
}

/* Mobile layout tokens (применяются на <768) */
@media (max-width: 767px) {
  :root {
    --page-pad:        22px;
    --mob-header-h:    56px;
    --mob-tabbar:      64px;
    --mob-safe-bottom: env(safe-area-inset-bottom, 0px);
  }
}
```

Десктоп-значение `--t-port-folio` (giant outlined hero lockup) — берём из старого HeroSection: ~`380px / 360px` для `PORT` и `FOLIO` соответственно. Добавить в base `:root`:

```css
--t-port-folio: 380px;
```

Это меняет дизайн-систему, но это **расширение**, а не изменение существующих десктоп-значений. Все правки делаются в `design-system/colors_and_type.css`, в `_legacy/colors_and_type.css` старый файл остаётся как был.

### F. BaseLayout.astro

```astro
---
// front/src/layouts/BaseLayout.astro
import '@/styles/tokens.css';
import '@/styles/fonts.css';
import '@/styles/breakpoints.css';
import '@/styles/global.css';

interface Props {
  title: string;
  description?: string;
}

const { title, description = 'PROKSION — портфолио Кристины' } = Astro.props;
---

<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="preload" href="/fonts/Stengazeta-Regular.ttf" as="font" type="font/ttf" crossorigin />
    <link rel="preload" href="/fonts/Kanit-Cyrillic.ttf" as="font" type="font/ttf" crossorigin />
  </head>
  <body>
    <slot />
  </body>
</html>
```

### G. Placeholder-страницы

Каждый роут — `BaseLayout` + один `<h1>` с временным контентом. Через @-CSS внутри страницы оформить только базовый отступ:

```astro
---
// front/src/pages/index.astro
import BaseLayout from '@/layouts/BaseLayout.astro';
---
<BaseLayout title="PROKSION — Kristina · портфолио">
  <main style="padding: var(--sp-9) var(--page-pad);">
    <h1 class="h-hero">PROKSION</h1>
    <p class="t-body">Phase 01 готова. Контент придёт в фазе 03.</p>
  </main>
</BaseLayout>
```

`/projects/index.astro` и `/contacts.astro` — аналогично, разные заголовки.

`/projects/[section]/[subsection].astro` обязательно содержит:

```astro
---
export const prerender = false;
import BaseLayout from '@/layouts/BaseLayout.astro';
const { section, subsection } = Astro.params;
---
<BaseLayout title={`PROKSION · ${section} / ${subsection}`}>
  <main style="padding: var(--sp-9) var(--page-pad);">
    <p class="t-muted">section: <span class="t-accent">{section}</span></p>
    <p class="t-muted">subsection: <span class="t-accent">{subsection}</span></p>
    <p class="t-body">Phase 04 наполнит этот роут.</p>
  </main>
</BaseLayout>
```

`prerender = false` — обязателен, это и проверяет, что SSR действительно работает.

### H. Docker

`front/Dockerfile` — multi-stage:

```dockerfile
# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS deps
WORKDIR /app
COPY front/package.json front/package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY front/ ./
# design-system нужен для @import токенов и для статики, копируем по симлинкам
COPY design-system/ /design-system/
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
USER node
EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]
```

Важно: Dockerfile запускается из корня репо (контекст = `/portfolio`), потому что ему нужен и `front/`, и `design-system/`. Симлинки `public/fonts` и `public/assets` при `COPY front/ ./` сломаются (Docker не следует симлинкам по умолчанию — точнее, он их копирует **как симлинки**, и они укажут в пустоту). Решение: в Dockerfile после `COPY front/` пройти `RUN` и заменить симлинки на реальные копии:

```dockerfile
RUN rm -f public/fonts public/assets && \
    cp -r /design-system/fonts public/fonts && \
    cp -r /design-system/assets public/assets
```

`docker-compose.yml` (в корне репо):

```yaml
services:
  front:
    build:
      context: .
      dockerfile: front/Dockerfile
    image: proksion-front:dev
    ports:
      - "4321:4321"
    restart: unless-stopped
    # позже:
    # depends_on:
    #   - back
  # back:  ← добавится в будущем
```

`.dockerignore` (в корне):

```
**/node_modules
**/dist
**/.astro
_legacy
screenshots
uploads
.git
.design-canvas.state.json
```

### I. Корневой .gitignore (расширить или создать)

```
node_modules/
dist/
.astro/
.DS_Store
*.log
```

### J. Обновить корневой CLAUDE.md

Полностью переписать под новую структуру. Учесть:
- проект мигрирует на Astro в `/front`;
- `design-system/` — source of truth для бренда, токенов, иконок, шрифтов, голоса;
- `_legacy/` — старый Claude design экспорт, **reference, не для редактирования**;
- команды: `cd front && npm run dev` для разработки, `docker compose up --build` для проверки прод-сборки;
- архитектура: hybrid Astro (static + SSR), React islands только для интерактива, дискретные сеты типографики через @media.

### K. front/README.md

Короткий, ~30 строк: что это, как поднять локально (`npm run dev`), как поднять через Docker (`docker compose up --build`), где лежат токены и шрифты, ссылка на `design-system/README.md` для брендбука, ссылка на `tasks/` для текущих фаз миграции.

## Implementation guidance

- **Симлинки vs копии**: в dev (вне Docker) симлинки `public/fonts → ../../design-system/fonts` работают. В Docker — заменяем на копии. Принцип: на диске разработчика — симлинк (никаких рассинхронов), в проде — копия (deterministic build).
- **`@import` в tokens.css**: путь `../../../design-system/colors_and_type.css` относительно `front/src/styles/tokens.css`. Проверьте, что Vite его резолвит. Если не получится — поставьте symlink `front/src/styles/_design-system-tokens.css` → `../../../design-system/colors_and_type.css` и импортируйте уже symlink-имя.
- **`.gitkeep`** в пустых папках — чтобы они попали в коммит и было видно, где ждать контента.
- **TypeScript strict** — не ослабляйте. Если `@astrojs/react` или другие либы создают конфликт типов, опишите конкретное место и спросите пользователя.
- **Цвета и шрифты в placeholder-страницах** — обязательно через переменные/классы из tokens.css. Никаких inline-hex'ов даже временных.

## Don't do

- **Не создавать никаких компонентов** кроме `BaseLayout.astro`. Curtain, Hero, About, Nav — это фазы 02+.
- **Не переписывать** `design-system/SKILL.md`, `design-system/README.md`, `design-system/ui_kits/` — это документация бренда, не наш код.
- **Не оптимизировать** изображения сейчас (`astro:assets` появится в фазе 02/03).
- **Не настраивать** CI/GitHub Actions — это после фазы 05.
- **Не трогать** `_legacy/` после переноса — она замороженный snapshot.
- **Не выбирать** backend-стек и не создавать `/back` — это отдельная задача.

## Верификация

Когда всё готово — выполнить `verify.md` (ручные + автоматические проверки).

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

SPA на **Vite 6 + React 18 + TypeScript strict**. Зависимостей минимум: `react`, `react-dom`, `react-router` (7.x) и `react-masonry-css` (~2 КБ, без транзитивных зависимостей; собственные TS-типы — листинг тайлов проектов). Никаких UI-библиотек и CSS-фреймворков — своя дизайн-система на CSS-токенах. Точка входа — `src/main.tsx` (`BrowserRouter` → `App`).

**Данные — из API** (`src/api/`: `client.ts` тонкие fetch-обёртки, `types.ts`, `status.ts` (`LoadStatus`), хуки `useCategories`/`useWorkDetail`/`useTags`/`useFeatured`/`useCategory`/`useInfiniteWorks`). Хуки держат **сессионный кэш** (модульные Map'ы: категории, деталь работы, теги, витрины, категория по слагу, догруженные порции `/works`) — повторная навигация, смена тега и закрытие модалки не перезапрашивают данные и не мигают скелетонами; ревалидации нет (контент меняется редко, свежее — со следующей загрузкой страницы). База — `/api` (в dev проксируется на `back:3001`, в проде Caddy `handle_path /api/*`). Картинки — same-origin `/media/*`. Dev-proxy `/api`+`/media` настроен в `vite.config.ts` (dev-сервер на 5005). Статических массивов контента больше нет.

Эндпоинты редизайна (`docs/projects-redesign.md` §5): `getTags()`, `getFeatured()`, `getCategory(cat)`, `getWorksFiltered({category, subcategory, tag, offset, limit})`, `getWorkBySlug(cat, sub, work)`. `useInfiniteWorks({cat, sub, tag})` — инфинити-скролл: ключ кэша `` `${cat}/${sub}?tag=${tag}` ``, порция 24, `hasMore`/`loadingMore`, и `sentinelRef` — колбэк-ref, который вешает нативный `IntersectionObserver` (rootMargin 600px, отключается при `!hasMore || loadingMore`; новых зависимостей нет). Кэш хранит достигнутый offset, поэтому возврат из модалки и переключение табов не сбрасывают догруженное.

> Исторически фронт был на Astro + React islands; миграция на чистый Vite+React SPA завершена — никаких `.astro`, SSR и `@astrojs/*` больше нет.

## Architecture

Одностраничное портфолио. Ключевые неочевидные решения:

### Роутинг — react-router, по URL

`App.tsx` использует `react-router` (`Routes/Route/Navigate/useLocation/useNavigate`). Активный экран выводится из `pathname` через `pathnameToRoute()`. Маршруты:

- `/` — home (about)
- `/projects` (+ `?tag=<slug>`) — **корневая-обзор** (см. ниже) и `/projects/:cat/:sub`
- `/projects/:cat/:sub/:work` (+ `?img=<imageId>`) — **модалка работы** поверх листинга (карусель картинок, шарящийся URL; `Esc`/клик вне → `navigate` назад на листинг). `:work` — **слаг** работы (`GET /works/:cat/:sub/:work`); если сегмент — целое число (легаси-ссылки), деталь грузится по id и `useWorkModal` делает `replace`-редирект на канонический слаговый URL (слаги пути берутся из ответа, `?img=` переносится, история не засоряется)
- `/contacts`
- `*` — `<Navigate to="/" replace />`

URL реально меняется, история работает. Навигация — **настоящие ссылки** (`<Link>`): десктоп — `TopNav`, мобайл — `MobileTabBar`, сайдбар/чипы листинга и сами тайлы тоже ссылки (работают cmd-клик/новая вкладка/копирование адреса). Скролл к началу — эффект в `App.tsx`, привязанный к **ключу листинга** (`scrollKeyFromPath` — путь без `:work`-сегмента модалки), а не ко всему `pathname`: открытие/закрытие модалки внутри `/projects` (и карусель `?img=`) скролл листинга не сбрасывают, а смена раздела/подкатегории или переход подкатегория→общий `/projects` — сбрасывают. Повторный клик по уже активному пункту (URL не меняется → эффект молчит) докручивается плавно в самих nav-компонентах (`TopNav` + `MobileTabBar`) через общий `smoothScrollTo` из `src/lib/scroll.ts` — одинаково в обоих деревьях.

### Двойное дерево компонентов (не адаптив через CSS)

`App.tsx` через `useIsMobile()` (хук на `matchMedia('(max-width: 767.98px)')`) выбирает **одно из двух полностью отдельных деревьев** — `components/desktop/*` или `components/mobile/*`. Это не один отзывчивый layout: десктоп и мобайл — разные компоненты с разной разметкой. Любую фичу, затрагивающую обе платформы, нужно реализовывать в обоих деревьях (напр. `ProjectsScreen.tsx` + `MobileProjects.tsx`, модалка `WorkModal.tsx` + `MobileWorkModal.tsx`, футер `desktop/ProjectsFooter.tsx` + `mobile/ProjectsFooter.tsx`). Данные оба дерева тянут из общих API-хуков (`src/api/`), а не из дублированных статических массивов.

**`components/shared/`** — общие атомы БЕЗ развилок разметки, одинаковые в обоих деревьях; платформа передаётся пропом `mobile` (он лишь переключает класс с `--*-mob`-токенами). Сейчас там `FilterChip` (label + count, active/inactive; полиморфный — с пропом `to` рендерится `<Link>`, с `onClick` — `<button>`) и `CountBadge` («68 РАБОТ», плюрализация из `lib/format.ts`). Всё, что требует разной вёрстки на платформах, в `shared/` не кладём.

Общие хелперы — `src/lib/`: `format.ts` (`formatUpdated('2026-07-15…') → «ИЮЛЬ 2026»`, `pluralizeWorks`/`formatWorksCount`, `pluralizeSections`/`formatSectionsCount` → «05 РАЗДЕЛОВ»), `contacts.ts` (**единственный** источник email/Telegram/Behance/CV и текстов футера — читают и `/contacts`, и футеры; строки не дублировать), `scroll.ts`, `links.ts` (канонические URL: `workHref`/`categoryHref`/`tagHref` — ссылки не собираем строками по месту), `showcase.ts` (раскладка кураторских витрин по вариантам — чистые функции для обоих деревьев).

### Корневая `/projects` — обзор разделов (задача 18)

`ProjectsScreen.tsx` (desktop, фрейм `tVnqG`) и `MobileProjects.tsx` (mobile, фрейм `N8NrSi`) — **не общий листинг**, а обзор: сайдбар и «Показать ещё» удалены.

1. **Hero** — оверлайн, «ПРОЕКТЫ» + красный квадрат, подзаголовок (тексты — константы компонента) и 3 стата справа/в ряд: сумма `work_count` категорий, число категорий, константа «3 ГОДА». Пока категории грузятся, в счётчиках прочерк, а не нули.
2. **Ряд чипов-тегов** — `shared/FilterChip`-ссылки: «ВСЕ &lt;total&gt;» → `/projects`, тег → `/projects?tag=<slug>` (активный определяется `useSearchParams`). Пустой `/tags` → весь ряд (вместе с подсказкой) скрыт. Справа — кнопка «NN РАЗДЕЛОВ ↓», плавный скролл к первой секции (`smoothScrollTo` + компенсация `--nav-h`).
3. **Секции категорий** (порядок `/categories`) — голова (номер `01`, титул, `CountBadge`, описание/мета, «ВСЕ РАБОТЫ ↗» → `/projects/:cat`) + витрина из `GET /featured` по `category.display_variant`:
   - `showcase` — ряд A (hero-слот ~2/3 ширины с пилюлей-подписью = title работы + колонка из 2) и ряд B (до 4 тайлов); mobile — hero h240 + пары;
   - `strip` — один ряд: ≤4 работ высокий (`--strip-h`), 5+ низкий (`--strip-h-dense`); mobile — пары h180 либо тройка h110;
   - `cards` — карточки (превью `--card-preview` + title/description работы + мета раздела + «СМОТРЕТЬ КЕЙС ↗» в модалку); desktop — сетка 2 колонки, mobile — столбик.
   Раскладка «сколько работ куда» — чистые функции `lib/showcase.ts` (`splitShowcase`/`stripWorks`/`cardWorks`/`isDenseStrip`/`chunk`), одни на оба дерева; слоты — фиксированной высоты (токены по тирам), картинка обрезается `object-fit: cover`, ссылки — канонические (`lib/links.ts`).
4. **Тег-режим** (`?tag=`) — вместо витрины в каждой секции masonry-грид работ категории с тегом (`useInfiniteWorks({cat, tag, limit: 24})`, без сентинела: дальше «ВСЕ РАБОТЫ ↗»). Секции с 0 совпадений не рендерятся вовсе; когда пусты все — состояние «По этому тегу работ пока нет» + сброс на «ВСЕ». Каждая секция сообщает свой счётчик наверх ключом `тег:категория`, поэтому переключение тегов не путает состояния.
5. **Футер** — `ProjectsFooter` своего дерева. Плюс skeleton-состояния (головы + слоты тоном `--c-skeleton`) и текстовые ошибки — белых экранов нет.

Высоты слотов витрин — токены `--show-row-a`/`--show-row-b`/`--strip-h`/`--strip-h-dense`/`--card-preview` (+ `--t-projects-hero`) со ступенями в тирах 1100–1399 и 768–1099 и мобильные `--show-hero-h-mob`/`--show-pair-h-mob`/`--strip-pair-h-mob`/`--strip-row-h-mob`/`--card-preview-mob`.

### Листинг проектов — masonry (react-masonry-css)

Блок `data-test="projects-tiles"` (сейчас — тег-режим корневой в обоих деревьях, с задачи 19 ещё и страница категории) раскладывает тайлы через `<Masonry>` (Pinterest-стиль, распределение слева-направо). Число колонок задаётся `breakpointCols` (JS, по ширине окна): десктоп `{ default: 4, 1399: 3, 1099: 2 }` (повторяет тиры токенов), мобайл `{ default: 2 }`. Зазоры — токены `--tile-gap` / `--tile-gap-mob`; CSS-паттерн библиотеки: контейнер `.masonry` (`display:flex`, `margin-left: -gap`), колонки `.masonryColumn` (`padding-left: gap`), тайлы — `margin-bottom: gap`. `<Masonry>` обёрнут во внешний `<div data-test="projects-tiles">`, т.к. типы библиотеки не пробрасывают произвольные `data-*`. Картиночный тайл — **`<Link>` вокруг `<picture>` avif/webp/jpg** (thumb-варианты приходят в тайле из API; картинка целиком, без обрезки; класс `.tile` на ссылке — скелетон-фон/ховер, `.tilePicture`/`.tileImg` внутри). Натуральные размеры `w/h` → `aspect-ratio` резервирует место заранее (нет скачков layout при загрузке). Первые тайлы (`EAGER_TILES`: 8 десктоп / 4 мобайл) грузятся `loading="eager"` + `fetchpriority="high"` — это LCP листинга; остальные — `loading="lazy"` + `decoding="async"`, под ними skeleton-тон `--c-skeleton`. ⚠️ `react-masonry-css` распределяет тайлы по индексу (порядок чтения, баланс по числу элементов), **не** по измеренной пиксельной высоте — при сильном разбросе высот низы колонок не выравниваются идеально (компромисс выбранной библиотеки). Каждый тайл — настоящая ссылка на канонический `/projects/:cat/:sub/:slug` (`lib/links.ts → workHref`; слаги приходят в самом тайле) → модалка работы (`WorkModal`/`MobileWorkModal`) с каруселью поверх листинга. Форма тайла из API — `{ id, slug, title, src, w, h, cat, sub, variants }`.

### Занавес-герой (hero curtain)

Hero — это **fixed-оверлей поверх всего** (z-index 1000), а не первая секция. Управляется `heroPhase` (`'visible' | 'dismissing' | 'gone'`). Показывается **только при свежей загрузке пути `/`**; deep-link на `/projects` и т.п. инициализирует `heroPhase` сразу в `'gone'` (занавес пропускается). Любой первый ввод (`wheel`/`touchstart`/`keydown`) или клик запускает `dismissHero()` → CSS `translateY(-100%)` → через 600ms `heroPhase` → `'gone'` и оверлей удаляется из DOM. Пока занавес поднят, скролл документа заблокирован (`documentElement.style.overflow = 'hidden'`).

## Styling — CSS Modules + tokens (строго)

- **Единственный глобальный CSS** — `src/styles/tokens.css`: `@font-face`, сброс и все дизайн-токены как CSS Custom Properties в `:root`. Компоненты читают их через `var(--token)`. Шрифты лежат в `public/fonts/` (`Stengazeta-Regular.ttf`, `Kanit-Cyrillic.ttf`), пути в `@font-face` абсолютные `/fonts/...`.
- Каждый компонент — пара `Name.tsx` + `Name.module.css`. **Никаких инлайн-стилей и хардкода цветов/размеров.** Единственное допустимое инлайн-исключение — данные тайлов проектов (высота/картинка/цвет), которые приходят из массива.
- `src/styles/layout.module.css` — общая центрированная колонка `.page` (fluid-ширина до `--page-max`, фиксированные гаттеры по тиру). `src/App.module.css` — chrome: оверлей-занавес, fixed nav-host, stage.

### Респонсив — токеновые тиры, без scale/clamp

Часть токенов — **компонентные, вне тиров** (в дизайне это литералы): `--t-overline/-chip/-meta/-desc/-lead`, `--chip-pad(-mob)`, `--badge-pad(-mob)`, `--tile-caption`, `--cta-btn-pad`/`--cta-btn-h-mob` (блок «Редизайн листинга проектов» в `:root`). Их не нужно дублировать в медиа-блоках. А вот высоты слотов витрин (`--show-row-a`, `--show-row-b`, `--strip-h`, `--strip-h-dense`, `--card-preview`) и `--t-projects-hero` — **тировые**: заданы в `:root` (≥1400) и переопределены в обоих desktop-медиа-блоках.

Размеры не «резинятся». `tokens.css` переопределяет набор токенов в тирах: база в `:root` (`≥1400`), `@media 1100–1399.98`, `@media 768–1099.98`, и `<768` — мобильное дерево, использующее токены с суффиксом `--*-mob` (заданы в `:root`). Внутри тира всё фиксировано; fluid остаётся только ширина контентных колонок. Чтобы поправить размеры — меняй токены в нужном медиа-блоке `tokens.css`, не добавляй `transform: scale()` или `clamp()` в компонентах.

## Project structure

```
src/
├── main.tsx             # BrowserRouter → App
├── App.tsx              # react-router (URL) + занавес-герой + выбор дерева
├── types.ts             # Route ('home'|'projects'|'contacts'), HeroPhase
├── api/                 # client.ts (fetch → /api) · types.ts · status.ts (LoadStatus)
│                        #   · useCategories · useWorkDetail · useTags · useFeatured
│                        #   · useCategory · useInfiniteWorks
├── hooks/               # useIsMobile (<768px) · useWorkModal (контроллер модалки) · …
├── lib/                 # scroll.ts (smoothScrollTo) · format.ts · contacts.ts
│                        #   · links.ts (канонические URL) · showcase.ts (раскладка витрин)
├── styles/              # tokens.css (глобальный) + layout.module.css
├── App.module.css       # chrome: curtain / nav-host / stage
└── components/
    ├── shared/   FilterChip · CountBadge (атомы обоих деревьев)
    ├── desktop/  TopNav · HeroSection · AboutSection · ProjectsScreen · WorkModal · ContactsScreen · ProjectsFooter
    └── mobile/   MobileTabBar · MobileHero · MobileAbout · MobileProjects · MobileWorkModal · MobileContacts · ProjectsFooter
```

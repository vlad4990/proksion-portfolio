# Phase 05 — Verification (Final)

Это финальный аудит. После него сайт готов к проду.

## A. Файлы

```bash
find /Users/vtorgovcev/Downloads/portfolio/front/src/{components/nav,pages,data} -type f -name "*.astro" -o -name "*.ts"
```

- [ ] `front/src/components/nav/TopNav.astro`
- [ ] `front/src/components/nav/MobileTabBar.astro`
- [ ] `front/src/pages/contacts.astro`
- [ ] `front/src/data/contacts.ts`
- [ ] `front/src/layouts/BaseLayout.astro` импортит и рендерит `<TopNav />` + `<MobileTabBar />`.
- [ ] `front/public/robots.txt` создан.
- [ ] `front/astro.config.mjs` содержит интеграцию sitemap и `site:` URL (или TODO).

## B. Type-check + build

```bash
cd /Users/vtorgovcev/Downloads/portfolio/front
npm run type-check
npm run build
```

- [ ] Exit 0 на обоих.
- [ ] В `dist/` есть `sitemap-index.xml` и/или `sitemap-0.xml`.
- [ ] Bundle JS итоговый — **< 30 kb gzipped** на всех страницах (включая `/projects/*`).

## C. Десктоп (1440+)

`http://localhost:4321/`:

- [ ] До dismiss curtain — nav не видна (под занавесом). После dismiss — top-nav сверху: красный PROKSION слева, три пункта по центру, `2025` справа.
- [ ] Активный пункт `ОБО МНЕ` — paper-pill (`#e4e4e4` bg, тёмный текст, `12px` radius).
- [ ] Клик на `ПРОЕКТЫ` → переход на `/projects/press-f/banners`. Top-nav остаётся, активный pill — на `ПРОЕКТЫ`.
- [ ] Клик на `КОНТАКТЫ` → `/contacts`. Активный pill переехал.
- [ ] Клик на `PROKSION` (wordmark) → возвращает на `/`.
- [ ] Sticky top-nav: при скролле страницы он залипает сверху.

## D. Tablet (768–1023)

- [ ] Top-nav остаётся, но компактнее: меньший gap между ссылками, меньшее padding pill'а.
- [ ] Wordmark не уезжает за край.

## E. Mobile (≤767)

- [ ] Top-nav **скрыт**.
- [ ] Внизу — fixed-tab-bar с тремя табами.
- [ ] Активный таб — красный текст + тонкая красная полоска-индикатор по верхнему краю.
- [ ] Tap на «ПРОЕКТЫ» → переход.
- [ ] На iPhone (или эмуляция notch) — tab-bar над home-indicator, есть `safe-area-inset-bottom` padding.
- [ ] При скролле tab-bar остаётся fixed внизу, не «прыгает».
- [ ] Контент любой страницы имеет нижний padding ≥ высоты tab-bar — последний элемент не зажат.

## F. Контактная страница

`/contacts`:

- [ ] Заголовок `КОНТАКТЫ` (Stengazeta, `--t-header-1`).
- [ ] Список ссылок: каждая — крупная label (display) + мелкий hint (body).
- [ ] Hover на label → меняет цвет на `--accent`.
- [ ] Внешние ссылки (https://...) открываются в новой вкладке с `noopener noreferrer`.
- [ ] Email — `mailto:` ссылка.
- [ ] На mobile — корректный padding снизу под tab-bar.

## G. Адаптив-аудит: 7 брейкпойнтов

Открыть каждую страницу на каждой ширине. Ничего не должно ломаться визуально, не быть горизонтального скролла, не вылазить за viewport.

### Ширины для проверки:
- **360** (xs — iPhone SE)
- **480** (sm — small phone landscape)
- **768** (md — tablet portrait)
- **1024** (lg — tablet landscape / small laptop)
- **1280** (xl — typical laptop)
- **1440** (2xl — desktop)
- **1920** (3xl — large desktop)

### Страницы:
- `/` (с curtain и после dismiss)
- `/projects/press-f/banners`
- `/projects/sketchbook/all` (или эквивалент листовой)
- `/contacts`

Чек-лист на каждой комбинации (28 проверок):
- [ ] Нет горизонтального скролла.
- [ ] Все тексты читаемы (нет слишком мелких или гигантских).
- [ ] Фото / тайлы не обрезаются неправильно.
- [ ] Nav (top или bottom) в правильном виде.
- [ ] Padding достаточный по бокам (не плотный к краю экрана).

(Можно вести таблицу в Markdown: 7 ширин × 4 страницы = матрица, по ячейке.)

## H. Performance

Lighthouse mobile preset на каждой странице:

| Страница | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| `/` | ≥ 90 | ≥ 95 | ≥ 95 | ≥ 90 |
| `/projects/press-f/banners` | ≥ 88 | ≥ 95 | ≥ 95 | ≥ 90 |
| `/contacts` | ≥ 95 | ≥ 95 | ≥ 95 | ≥ 90 |

- [ ] Все цифры на месте.
- [ ] LCP < 2.5s на mobile preset.
- [ ] CLS < 0.05 (на curtain dismiss — но это user-triggered, считается норм).

## I. SEO meta

- [ ] `<title>` уникален на каждой странице (видно в DevTools → Elements).
- [ ] `<meta name="description">` есть на каждой.
- [ ] `<meta property="og:title">` и `og:description` — есть.
- [ ] `<meta name="theme-color" content="#141414">` — есть.
- [ ] `<html lang="ru">` — корректно.
- [ ] Sitemap отдаётся: `http://localhost:4321/sitemap-index.xml` → 200 OK.
- [ ] `robots.txt` отдаётся: `http://localhost:4321/robots.txt` → 200 OK.

## J. Accessibility

- [ ] Skip-link `<a href="#content">` присутствует первым в `<body>`, фокусируется при Tab.
- [ ] Все `<a>` с `target="_blank"` имеют `rel="noopener noreferrer"`.
- [ ] Все nav-кнопки имеют `aria-current="page"` для активной.
- [ ] Tab-навигация по всему сайту — фокус виден на каждом интерактивном элементе.
- [ ] `prefers-reduced-motion: reduce` отключает анимации (маркер, scale на hover тайлов, transition curtain).

## K. Prod через Docker

```bash
cd /Users/vtorgovcev/Downloads/portfolio
docker compose up --build -d
sleep 30
docker compose ps
```

- [ ] Сервис `front` — статус `running (healthy)` (healthcheck прошёл).
- [ ] `curl -I http://localhost:4321/` → 200 OK.
- [ ] `curl -I http://localhost:4321/projects/press-f/vitriny` → 200 OK (SSR в проде).
- [ ] `curl http://localhost:4321/sitemap-index.xml` → возвращает валидный XML.
- [ ] `docker compose logs front` — нет ошибок / warning'ов про hydration, missing assets, 404 на fonts/.
- [ ] `docker stats` — потребление RAM < 200 MB в idle.

```bash
docker compose down
```

## L. Git

```bash
git status
git log --oneline -10
```

- [ ] Все изменения закоммичены.
- [ ] Коммиты осмысленные: «phase 02 — hero + curtain», «phase 03 — about», «phase 04 — projects SSR», «phase 05 — nav + contacts + polish».
- [ ] Файл `CLAUDE.md` финально обновлён под прод-структуру.

## M. Документация

- [ ] `front/README.md` обновлён: команды dev / build / docker.
- [ ] Корневой `CLAUDE.md` финально описывает прод-стек.
- [ ] `tasks/` сохранён как история миграции (можно добавить заметку «миграция завершена» в `tasks/README.md`).
- [ ] В `front/src/data/contacts.ts` — TODO с пометкой «реальные ссылки запросить у Кристины».
- [ ] В `front/astro.config.mjs` — TODO с пометкой «реальный домен».

## N. Smoke-тест «свежий пользователь»

1. Открыть инкогнито: `http://localhost:4321/`
2. Curtain → клик → dismiss.
3. Прокрутить вниз → видеть About (LOFTY, КОПИРКА, образование).
4. Top-nav: клик «ПРОЕКТЫ» → видеть sidebar + grid.
5. Клик в sidebar на «KUPIKOD» → skeleton → grid.
6. Refresh страницы → SSR-рендер без skeleton.
7. Top-nav: «КОНТАКТЫ» → видеть список ссылок.
8. Top-nav: «PROKSION» → возврат на `/`, **curtain не показывается** (сессия сохранила).
9. Открыть тот же URL `/` в другой incognito-вкладке → curtain снова.
10. Резайз окна с 1920 до 360 → плавная трансформация без поломок.

- [ ] Все 10 шагов проходят гладко.

## Если что-то не сошлось

Записать точный пункт + симптом. Если что-то критичное (curtain не уезжает, SSR падает, build не собирается) — это блокер прода, чинить до сдачи. Если визуальный нюанс (фото чуть сдвинуто на 1440) — закидывать в backlog без блокера.

## Готовность к проду

Когда все пункты ✅:
- [ ] Сайт можно деплоить.
- [ ] Открыть пользователю задачу «развернуть на сервере»: дать `docker compose up -d`, прописать reverse-proxy с SSL, настроить домен в `astro.config.mjs`.
- [ ] Закрыть фазы 01–05 коммитом / тегом `v1.0`.

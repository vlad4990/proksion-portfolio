# Phase 04 — Verification

## A. Файлы

```bash
find /Users/vtorgovcev/Downloads/portfolio/front/src/{components/projects,lib,pages/projects} -type f
```

- [ ] `front/src/lib/projects-tree.ts`
- [ ] `front/src/lib/api.ts`
- [ ] `front/src/components/projects/ProjectsLayout.tsx`
- [ ] `front/src/components/projects/Sidebar.tsx`
- [ ] `front/src/components/projects/Grid.tsx`
- [ ] `front/src/components/projects/projects.css`
- [ ] `front/src/pages/projects/index.astro` (redirect или landing)
- [ ] `front/src/pages/projects/[section]/[subsection].astro` с `export const prerender = false`

## B. Type-check + build

```bash
cd /Users/vtorgovcev/Downloads/portfolio/front
npm run type-check
npm run build
```

- [ ] Exit 0 на обоих.
- [ ] В `dist/server/` появилась SSR-функция для динамического роута (`grep -r "subsection" dist/server`).
- [ ] Bundle для `/projects/*` страниц включает chunks ProjectsLayout/Sidebar/Grid. Суммарный JS — **< 25 kb gzipped**.

## C. SSR — прямой заход на URL

В чистом инкогнито (без кэша):

- [ ] `http://localhost:4321/projects` → редиректит на `/projects/press-f/banners` (или дефолтную пару).
- [ ] `http://localhost:4321/projects/press-f/vitriny` → отдаёт HTML, **в исходнике страницы уже видны тайлы** (View Source → grep `tile`). Это значит, SSR fetch отработал.
- [ ] Никакого «мерцания skeleton при первой загрузке».
- [ ] `http://localhost:4321/projects/kupikod/youtube` → также SSR-рендер, тайлы в HTML.
- [ ] `http://localhost:4321/projects/non-existent/foo` → редиректит на `/projects`.
- [ ] `http://localhost:4321/projects/press-f/non-existent` → редиректит на первый child секции `press-f` (т.е. `/projects/press-f/banners`).

## D. Десктоп — визуальная проверка

`http://localhost:4321/projects/press-f/banners` (1440+):

- [ ] Слева — sidebar с пятью группами (`Press F` подсвечен красным с маркер-иконкой слева).
- [ ] Под `Press F` развернут sub-tree: три child'а. `Баннера` выделен paper-pill (`#e4e4e4` background, тёмный текст, sharp слева, `4px` radius справа).
- [ ] Справа — masonry-grid 4 столбца, 16 тайлов, два из них — реальные миниатюры (`project-success.png`, `project-post.png`).
- [ ] Hover на тайле — `scale(1.02)`, плавно.
- [ ] Sidebar sticky — при скролле страницы он остаётся виден.

## E. Клиентское переключение (SPA-like)

- [ ] Клик на `KUPIKOD` в sidebar:
  - [ ] URL мгновенно меняется на `/projects/kupikod/banners` (первый child).
  - [ ] Активный pill переехал на «Баннера» под KUPIKOD.
  - [ ] Press F схлопнулся (children скрыты).
  - [ ] Появился skeleton (полупрозрачные тайлы с pulse-анимацией).
  - [ ] Через ~250 ms skeleton сменился на тайлы (с теми же 2 реальными миниатюрами — потому что stub один на всё).
- [ ] Клик на `Витрины товаров` внутри Press F:
  - [ ] URL → `/projects/press-f/vitriny`.
  - [ ] Skeleton показался, затем grid.
- [ ] Back в браузере (history): возвращается на предыдущую секцию, skeleton + новый fetch.
- [ ] Forward в браузере: всё симметрично.
- [ ] Reload на `/projects/kupikod/youtube`: SSR отдаёт сразу с тайлами, no skeleton.

## F. Адаптив

### Tablet (1024–1279)
- [ ] Sidebar чуть уже, grid в 3 столбца. Все категории видны.

### Tablet small (768–1023)
- [ ] Sidebar схлопнулся в **горизонтальную полосу chips** сверху (а не вертикальный список).
- [ ] При выборе активной группы её children рендерятся под ней как chips, активный — в paper-pill.
- [ ] Grid в 2 столбца.

### Mobile (≤767)
- [ ] Категории — vertical стек, single column grid.
- [ ] Активный child — pill.
- [ ] Тайлы занимают всю ширину.
- [ ] Горизонтальных скроллов нет на 360.

## G. Леф-секции (Sketchbook, UI/UX)

- [ ] Клик на `Sketchbook` (нет children).
- [ ] URL обновился (`/projects/sketchbook/all` или альтернатива по выбранному решению — должно быть единообразно с другими).
- [ ] Children-row не отображается под активной группой.
- [ ] Grid отрисовался (stub-данные те же).

## H. Accessibility

- [ ] `<nav aria-label="Категории проектов">` в DOM.
- [ ] При loading: `<div aria-busy="true">` на skeleton-контейнере.
- [ ] Все `<button>`'ы имеют видимый текст или `aria-label`.
- [ ] Lighthouse accessibility ≥ 95 на `/projects/press-f/banners` после полной загрузки.
- [ ] Tab-навигация по sidebar работает: фокус виден, клавиша Enter активирует кнопку.

## I. Performance

Network throttling «Fast 3G», reload `/projects/press-f/banners`:

- [ ] LCP < 2.5s.
- [ ] Skeleton не появляется при прямом reload (SSR подгрузил данные).
- [ ] Lighthouse perf на mobile preset ≥ 88.
- [ ] Total JS gzipped < 25 kb на projects-странице.

## J. Бренд

- [ ] `grep -rE "#[0-9a-fA-F]{3,6}" front/src/components/projects front/src/lib` — никаких hex, кроме fallback `#000` если есть.
- [ ] Marker-иконка на активной группе — `/assets/icon-marker-pixel.svg`, не replicate.
- [ ] Никаких drop-shadow, gradient, blur.

## K. Prod через Docker

```bash
cd /Users/vtorgovcev/Downloads/portfolio
docker compose up --build
```

- [ ] `http://localhost:4321/projects/press-f/banners` отвечает с правильным HTML.
- [ ] Клиентское переключение секций работает.
- [ ] `/projects/press-f/vitriny` через прямой URL — тоже работает (SSR в контейнере).
- [ ] Сетевая консоль не показывает ошибок 404/500.

## L. Тест на гидрацию

- [ ] DevTools → Console → reload страницу `/projects/press-f/vitriny`: никаких warning'ов про hydration mismatch.

## Если что-то не сошлось

Особое внимание:
- **Sidebar sticky** ломается часто из-за overflow в родителях. Если не работает — проверить `body`, `main`, `.projects`.
- **Hydration mismatch** часто из-за `Date.now()` / `Math.random()` в state init. Если warning — найти и убрать.
- **CSS columns** + динамическая высота тайлов даёт «неровный» порядок (тайлы заполняют колонки слева направо). Это намеренно — masonry-эффект. Если пользователь хочет «order by row» — это другой подход (grid-auto-flow: dense), но не в этой фазе.

# Context — 19 front-category-page

## Зачем

Новый второй уровень: страница категории `/projects/:cat` с табами подкатегорий,
синхронизированными в URL, masonry-листингом и **инфинити-скроллом** (спека:
[`docs/projects-redesign.md`](../../docs/projects-redesign.md) §1–§2.3–2.4, §5.6, §6).
Сейчас роута `/projects/:cat` нет вовсе (catch-all уводит на `/`), а
`/projects/:cat/:sub` — старый экран листинга.

## Дизайн

Desktop — фрейм `h16xA`, mobile — `fQvBp` в `front/1111.pen` (**только Pencil MCP**).
Кнопку «ПОКАЗАТЬ ЕЩЁ» из фреймов заменяет инфинити-скролл (решение владельца,
спека §1.5); счётчик «ПОКАЗАНО N ИЗ M» остаётся. Мобильные Header/Status Bar/Tab Bar
из фреймов — пропустить (текущий хром).

## Что уже есть в репо

- **Фундамент задачи 17**: `useCategory(cat)` (мета + подкатегории с счётчиками),
  `useInfiniteWorks({category, subcategory, tag?})` с кэшем достигнутого offset'а
  и `sentinelRef`, `FilterChip`, `CountBadge`, `formatUpdated`, `ProjectsFooter`,
  слаговая модалка (`useWorkModal`).
- **Роутинг** — `App.tsx`: два дерева `<Routes>` (desktop `:166-181`, mobile
  `:119-134`); модальный маршрут `/projects/:cat/:sub/:work` рендерит листинг +
  модалку поверх. `scrollKeyFromPath` (`App.tsx:33-37`) — «идентичность листинга» =
  путь без 4-го сегмента: модалка скролл не сбрасывает, смена таба — сбрасывает
  (новая страница — тоже ок).
- **Masonry-паттерн** — из старого `ProjectsScreen`/`MobileProjects` (к моменту
  задачи переписаны в 18, паттерн `<Masonry>` жив в тег-режиме корневой):
  `BREAKPOINT_COLS` desktop `{default:4,1399:3,1099:2}` / mobile `{default:2}`,
  обёртка `data-test="projects-tiles"`, скелетоны, eager-тайлы.
- **Данные** — `GET /categories/:cat` (описания/меты/`updated_max`/подкатегории
  со счётчиками видимых работ), `GET /works?category=&subcategory=&offset=&limit=24`
  (задача 14).

## Инварианты / ограничения

- **SDD**; оба дерева; никакие новые зависимости (IntersectionObserver — нативный).
- Тайл листинга — текущий паттерн: `<Link>` + `<picture>` + `aspect-ratio` из
  `w/h`, **без обрезки** (масонри), lazy/eager по индексу.
- Ссылка тайла — канонический слаговый URL `/projects/:cat/:sub/:slug`.
- URL — источник правды состояния табов: «ВСЕ» = `/projects/:cat`,
  таб = `/projects/:cat/:sub`; прямые ссылки и F5 работают.
- Возврат из модалки не сбрасывает скролл и догруженные страницы (кэш offset'а).

## На что НЕ замахиваться

- Корневая `/projects` — задача 18. Модалка — готова (17).
- Никакого «виртуального скролла»/оконного рендеринга — объёмы маленькие.
- SEO-прерондер, sitemap — вне скоупа.

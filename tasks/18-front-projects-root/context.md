# Context — 18 front-projects-root

## Зачем

Корневая `/projects` перестаёт быть общим masonry-листингом с сайдбаром и становится
«обзором разделов»: hero со статами, чипы-теги, секции категорий с кураторскими
витринами (спека: [`docs/projects-redesign.md`](../../docs/projects-redesign.md) §1–§2.2, §6).

## Дизайн

- Desktop — фрейм `tVnqG`, mobile — `N8NrSi` в `front/1111.pen` (**только Pencil MCP**:
  `batch_get` для структуры/размеров, `get_screenshot` для сверки). Тайлы в дизайне —
  инстансы «Медиа-заглушки» `zZTSg`; в реальности — картинки работ (`Tile.variants`,
  обрезка `object-fit: cover` под фиксированные слоты витрины).
- Три варианта секций (`category.display_variant`): `showcase` / `strip` / `cards` —
  анатомия и типографика по спеке §2.1(3) и §2.2.
- Шапка и мобильный tab bar из дизайна — **не делать** (остаются текущие TopNav /
  MobileTabBar); Mobile Header/Status Bar из фрейма пропустить, контент начинается
  с hero.

## Что уже есть в репо

- **Фундамент задачи 17**: `useTags`/`useFeatured`/`useCategory(-ies)`,
  `useInfiniteWorks`, `FilterChip`, `CountBadge`, `ProjectsFooter`, слаговая модалка.
- **Текущие экраны** — `components/desktop/ProjectsScreen.tsx` (+`.module.css`),
  `components/mobile/MobileProjects.tsx`: сайдбар/чипы категорий + masonry +
  «Показать ещё». Masonry-паттерн (`<Masonry>` из `react-masonry-css`,
  `BREAKPOINT_COLS`, обёртка `data-test="projects-tiles"`, скелетоны) —
  переиспользовать для тег-режима.
- **Роутинг** — `App.tsx`: `/projects` уже рендерит эти экраны; `scrollKeyFromPath`
  (путь без 4-го сегмента) сохранить как есть; `?tag=` — query, скролл не сбрасывает.
- **Данные**: категории с `kicker/meta_role/period/display_variant/work_count/
  updated_max`, `GET /featured` (fallback первых 8 работ включён на бэке),
  `GET /tags`, `GET /works?tag=&category=` — задача 14.

## Инварианты / ограничения

- **SDD**; оба дерева (desktop + mobile) — функционально эквивалентны.
- Никаких новых зависимостей; только `var(--token)`; тексты русские, display —
  uppercase.
- LCP: hero-тайлы витрин первых секций — `loading="eager"` + `fetchpriority="high"`
  (аналог `EAGER_TILES`), остальное lazy; `aspect-ratio`/фиксированные высоты
  резервируют место (нет layout shift).
- Тайлы и ссылки — настоящие `<Link>` (cmd-клик/копирование URL работают).

## На что НЕ замахиваться

- Страница категории — задача 19 (ссылки «ВСЕ РАБОТЫ ↗» ведут на `/projects/:cat`,
  которую сделает 19; до неё маршрут отдаст catch-all → `/` — допустимо в моменте,
  задачи соседние).
- Шапка, занавес-герой, `/contacts`, модалка — не трогать (модалка уже слаговая).

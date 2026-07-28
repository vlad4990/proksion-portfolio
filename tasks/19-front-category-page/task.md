# Task — 19 front-category-page

**Слой:** `/front`. **Методология:** **SDD** (build + визуал по дизайну).
Спека: [`docs/projects-redesign.md`](../../docs/projects-redesign.md) §2.3–§2.4, §5.6, §6.
Дизайн: фреймы `h16xA` (desktop) / `fQvBp` (mobile) в `front/1111.pen` (Pencil MCP).
Зависит от задач 14, 17 (18 — независимо, но ссылки друг на друга взаимные).

## Цель

`/projects/:cat` и `/projects/:cat/:sub` (оба дерева) = крошки + голова категории +
чипы-табы подкатегорий (URL-синхронизация) + masonry с инфинити-скроллом и счётчиком
«ПОКАЗАНО N ИЗ M» + футер. Модалка работает поверх, как прежде.

## Шаги

1. **Роутинг** — `App.tsx`, в ОБОИХ деревьях: добавить `/projects/:cat` →
   `CategoryScreen`/`MobileCategory`; `/projects/:cat/:sub` перевести на них же;
   модальный маршрут `/projects/:cat/:sub/:work` рендерит `CategoryScreen` +
   модалку (вместо старого экрана). Проверить `scrollKeyFromPath`: ключи
   `/projects/kupikod` и `/projects/kupikod/sub` различаются (смена таба —
   скролл вверх; допустимо и желаемо), модалка ключ не меняет.
   Несуществующий `:cat`/`:sub` (404 от API) → редирект на `/projects`.
2. **Desktop `CategoryScreen.tsx`** — по фрейму `h16xA`:
   - **Крошки** (панель с нижней hairline-soft): «ГЛАВНАЯ» → `/`, «ПРОЕКТЫ» →
     `/projects`, текущая — `--fg-strong` bold без ссылки; справа
     «ОБНОВЛЕНО — <formatUpdated(updated_max)>» (скрыть при null).
   - **Голова**: оверлайн «// РАЗДЕЛ NN — <kicker>» (NN = позиция категории,
     двузначно), Title Row (`--t-header-1` + красный квадрат + `CountBadge`
     по `work_count`), описание (`description_long || description`); справа:
     `meta_role`, `period`, «НАПИСАТЬ ПО ПРОЕКТУ ↗» → `/contacts`. NULL-поля
     не рендерят пустых узлов.
   - **Чипы-табы**: «ВСЕ <work_count>» → `/projects/:cat`; по чипу на
     подкатегорию (title uppercase + count) → `/projects/:cat/:sub` —
     `FilterChip`-ссылки, активный по URL. Справа — «ПОКАЗАНО N ИЗ M»
     (N = загружено тайлов, M = total текущего фильтра; live-обновление).
   - **Листинг**: `useInfiniteWorks({category: cat, subcategory: sub})` +
     `<Masonry>` (текущие `BREAKPOINT_COLS`, `--tile-gap`); тайлы — текущий
     паттерн (aspect-ratio, eager первые 8). Под гридом — sentinel-элемент
     (`sentinelRef` из 17): доводит следующую порцию за ~600px до конца;
     при догрузке — 2–4 скелетон-тайла в конце колонок или мини-индикатор;
     `hasMore=false` → сентинел размонтирован. Состояния skeleton/empty/error.
   - **Футер** — `<ProjectsFooter/>`.
3. **Mobile `MobileCategory.tsx`** — то же по фрейму `fQvBp`: крошки, голова
   (оверлайн/титул+квадрат+бейдж/описание/мета-ряд с «НАПИСАТЬ ПО ПРОЕКТУ ↗»),
   горизонтальный скролл чипов-табов, счётчик, masonry 2 колонки
   (`--tile-gap-mob`, eager первые 4), инфинити-скролл, футер.
4. **SEO** — `src/seo.ts`: title страницы категории «<TITLE> — PROKSION»
   (например «KUPIKOD — PROKSION»), выставлять в экране по образцу модалки;
   при уходе — вернуть стандартный.
5. **Перелинковка** — убедиться, что ссылки корневой («ВСЕ РАБОТЫ ↗», чипы)
   и тайлы витрин ведут сюда и работают в обе стороны (root ↔ category ↔ modal).

## Требования

- Strict TS; без новых зависимостей; только токены; тексты русские, uppercase
  display.
- Инфинити-скролл не запрашивает дубли (guard на `loadingMore`), не дёргается
  при закрытии модалки, переживает переключение табов (кэш по ключу).
- Переключение таба: мгновенный рендер из кэша при повторном визите; холодный
  таб — скелетоны, без сохранения тайлов прошлого таба на экране.

## Deliverables

`CategoryScreen` + `MobileCategory` (+ module.css), правки `App.tsx`
(оба дерева), `seo.ts`. `npm run build` зелёный, визуальная сверка с фреймами.
`front/CLAUDE.md` обновлён (маршруты, страница категории, инфинити-скролл);
таблица URL в `docs/architecture.md` §4 — актуализирована по спеке §5.6.

# Task — 17 front-ds-shared

**Слой:** `/front`. **Методология:** **SDD** (build + визуал).
Спека: [`docs/projects-redesign.md`](../../docs/projects-redesign.md) §3, §5.6, §6.
Зависит от задачи 14 (живые эндпоинты; для вёрстки атомов достаточно типов).

## Цель

Токены, API-обёртки с кэшами, общие атомы и слаговая модалка готовы — задачи 18–19
собирают из них страницы.

## Шаги

1. **Токены** — дополнить `front/src/styles/tokens.css` блоком из спеки §3
   (`--t-overline/-chip/-meta/-desc/-lead`, `--chip-pad(-mob)`, `--badge-pad`,
   `--tile-caption`). По тирам не меняются. Сверить точные значения с дизайном
   (`get_variables` + фреймы `ZRSQk`/`tVnqG` в `front/1111.pen` через Pencil MCP).
2. **API-клиент** — `front/src/api/client.ts`: `getTags()`, `getFeatured()`,
   `getCategory(cat)` (`GET /categories/:cat`), `getWorksFiltered(params)`
   (`GET /works?category&subcategory&tag&offset&limit`), `getWorkBySlug(cat, sub,
   work)`. Формы — из `types.ts` (уже синхронизированы задачей 14).
3. **Кэши** — по образцу `useProjects`: модульные кэш-Map'ы и хуки
   `useTags()` / `useFeatured()` / `useCategory(cat)`; ключ фильтрованных работ —
   `` `${cat ?? ''}/${sub ?? ''}?tag=${tag ?? ''}` ``. Кэш хранит
   `{tiles, total}` достигнутого offset'а — возврат из модалки и переключение
   табов не перезапрашивают и не мигают скелетонами.
4. **`useInfiniteWorks(params)`** — хук инфинити-скролла: состояние из кэша,
   `loadMore` через `getWorksFiltered(offset = tiles.length, limit = 24)`,
   `hasMore = tiles.length < total`, флаг `loadingMore`; экспортирует
   `sentinelRef` — колбэк-ref, вешающий IntersectionObserver (rootMargin
   ~`600px`, отключается при `!hasMore || loadingMore`). SSR-guard не нужен (SPA).
5. **Общие атомы** — `front/src/components/shared/`:
   - `FilterChip` — label + count, active/inactive, рендерится как `<Link>` или
     `<button>` (полиморфный проп); стили по спеке §2.1.2 (desktop) с
     `--*-mob`-вариантом класса для мобильного дерева;
   - `CountBadge` — «N РАБОТ» с плюрализацией (1 работа / 2 работы / 5 работ);
   - хелпер `formatUpdated(iso)` → «ИЮЛЬ 2026» (русские месяцы, uppercase) —
     в `src/lib/`.
6. **Футер** — `ProjectsFooter.tsx` в обоих деревьях (`desktop/` и `mobile/`,
   разметка по фреймам `tVnqG`/`N8NrSi`): CTA-заголовок, email, TG-кнопка,
   соцссылки, ©. Контакты-константы вынести в `src/lib/contacts.ts` и
   переиспользовать из `ContactsScreen`/`MobileContacts` (не дублировать строки).
   В этой задаче футер нигде не подключается — подключат 18–19.
7. **Слаговая модалка** — `useWorkModal.ts`: `:work` теперь слаг →
   `getWorkBySlug`; если `:work` — целое число (легаси-ссылка) → `getWorkById` и
   `navigate(..., {replace: true})` на слаговый URL (слаг приходит в
   `WorkDetailById`). Тайлы-ссылки поменяются в 18–19; сейчас — не сломать
   существующие экраны: текущие ссылки с id продолжают открываться через
   легаси-ветку. `?img=` и `close()` — без изменений.

## Требования

- Strict TS, без `any`, никаких новых зависимостей, только `var(--token)`.
- UI-тексты русские, display — uppercase.
- Существующие экраны работают как раньше (`/projects` со старым сайдбаром,
  модалка по числовым ссылкам — через редирект).

## Deliverables

Токены, `api/*` (+ хуки/кэши), `shared/FilterChip`/`CountBadge`,
`ProjectsFooter` ×2, `lib/contacts.ts`, слаговый `useWorkModal`.
`npm run build` зелёный. `front/CLAUDE.md` обновлён (api-слой, shared, модалка).

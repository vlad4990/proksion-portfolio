# Task — 14 public-api-listing

**Слой:** `/back`. **Методология:** **TDD** (`bun test`).
Спека: [`docs/projects-redesign.md`](../../docs/projects-redesign.md) §5 (контракт),
§2 (что потребляют страницы). Зависит от задачи 13.

## Цель

Публичный read-API отдаёт всё, что нужно новым страницам: расширенный `Tile`
(slug, title), метаданные и честные счётчики категорий, `GET /tags`, `GET /featured`
c fallback'ом, `GET /works` с фильтрами `category/subcategory/tag` и SQL-пагинацией.

## Шаги

1. **`Tile` + slug, title** (спека §5.1) — `dto.ts` (`toTile`), обновить строгие
   key-тесты (`public.test.ts:77,221`) и зеркала типов
   (`front/src/api/types.ts`, `admin/src/api/types.ts` — только типы).
2. **Категории** (спека §5.2) — `CategoryNav`: + `kicker`, `meta_role`, `period`,
   `display_variant`, `work_count` (видимые работы категории), `updated_max`
   (max `work.updated_at` по видимым работам | null). `GET /categories/:cat`
   дополнительно отдаёт `description_long`. `SubcategoryNav.work_count` — теперь
   только видимые (с картинками) работы. Счётчики — SQL'ем (JOIN + COUNT), а не
   `.length` в JS: см. `queries.ts`, там же держать новые композиции.
3. **`GET /tags`** (спека §5.3) — `TagNav { id, slug, title, sort_order, work_count }`,
   сортировка `sort_order, id`; `work_count` — видимые работы с тегом; тег без
   работ отдаётся с `work_count: 0`.
4. **`GET /featured`** (спека §5.3) — по всем категориям в порядке `sort_order`:
   `{ cat, curated, works: FeaturedWork[] }`; `FeaturedWork extends Tile
   { description }`. Работы `featured_order IS NOT NULL` по порядку
   (`curated: true`); если у категории витрины нет — fallback: первые 8 видимых
   работ (subcategory.sort_order → work.sort_order, `curated: false`).
   Категория вообще без видимых работ → `works: []`.
5. **`GET /works` — фильтры + SQL-пагинация** (спека §5.4):
   - параметры `category`, `subcategory` (требует category), `tag` — комбинируются;
   - один JOIN-запрос с `LIMIT/OFFSET` + отдельный `COUNT(*)` для `total`;
     сортировка `category.sort_order → subcategory.sort_order → work.sort_order →
     work.id`; работы без картинок отфильтрованы (EXISTS по image);
   - неизвестный слаг фильтра → `{items: [], total: 0}` (не 404);
   - дефолтный limit **24**, max 100 — обновить `DEFAULT_WORKS_LIMIT` и тесты;
   - cover-логика эквивалентна `resolveCover`.
6. **Теги работы в детали** — `WorkDetail`/`WorkDetailById`: + `tag_ids: number[]`
   (нужно админке для мультивыбора; фронту не мешает).
7. **Синхронизация зеркал типов** — `front/src/api/types.ts`,
   `admin/src/api/types.ts`: новые поля/типы (только типы; `tsc` обоих проектов
   должен остаться зелёным — `cd front && npm run build`, `cd admin && npm run build`).

## Требования

- TDD; контрактные тесты в стиле существующих (`Object.keys(...).sort()`,
  `app.handle(new Request(...))`, фикстура `seed(db)`).
- Покрыть тестами: каждый новый эндпоинт (форма + порядок + fallback), каждую
  комбинацию фильтров `/works` (category / category+subcategory / tag /
  category+tag / все вместе), пагинацию с фильтром (`total` учитывает фильтр,
  offset за концом → пустая страница), честность счётчиков (работа без картинок
  не считается ни в `work_count`, ни в `/tags`), `updated_max`.
- Strict TS, без `any`; никаких новых зависимостей.

## Deliverables

Обновлённые `dto.ts`, `queries.ts`, `routes/public.ts` + тесты; типы-зеркала во
`front/` и `admin/`. `bun test`, `bun run typecheck`, `npm run build` (front и admin)
зелёные. `docs/architecture.md` §7 (таблица публичных эндпоинтов) дополнена.

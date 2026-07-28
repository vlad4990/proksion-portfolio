# Task — 13 db-tags-featured

**Слой:** `/back`. **Методология:** **TDD** (`bun test`).
Спека: [`docs/projects-redesign.md`](../../docs/projects-redesign.md) §4 (+§1 — продуктовые
решения). Прочитать `context.md` этой папки.

## Цель

Слой данных под редизайн листинга: миграция `0002`, типы строк, репозиторий тегов,
связь работа↔тег, поле витрины, новые контентные поля категории; сид обновлён.

## Шаги

1. **Миграция `back/migrations/0002_tags_featured_category_meta.sql`** — строго по
   спеке §4: 5 новых колонок `category` (kicker, meta_role, period, description_long —
   TEXT NULL; display_variant — TEXT NOT NULL DEFAULT 'showcase' + CHECK),
   `work.featured_order` (INTEGER NULL), таблицы `tag` и `work_tag`, индексы
   `idx_work_tag_tag` и частичный `idx_work_featured`.
   Тест: после `openDb(':memory:')` обе миграции в `_migrations`; вставка/чтение
   новых колонок и таблиц работает; `display_variant` вне enum'а падает по CHECK;
   каскады `work_tag` при удалении работы и тега.
2. **Типы строк** — `back/src/types.ts`: расширить `CategoryRow`, `WorkRow`; добавить
   `TagRow`, `WorkTagRow`. `display_variant` — строковый union
   `'showcase' | 'strip' | 'cards'`.
3. **Репозиторий `tag`** — `back/src/db/repositories/tag.ts` по образцу `category.ts`:
   `create / getById / getBySlug / list (ORDER BY sort_order, id) / update (runUpdate:
   slug, title, sort_order, updated_at) / delete`. Подключить в композит репозиториев
   (там же, где собираются остальные — см. `back/src/db/repositories/index.ts` или
   аналог, как сделано для существующих).
4. **Связь работа↔тег** — в `tag.ts` или отдельном `work-tag.ts`:
   - `setWorkTags(workId, tagIds: number[])` — полная замена набора в транзакции
     (DELETE + INSERT), порядок не значим;
   - `listTagIdsByWork(workId): number[]`;
   - `listWorkIdsByTag(tagId): number[]`.
5. **Витрина** — в репозитории `work`:
   - `setFeatured(categoryId, workIds: number[])` — в одной транзакции: всем работам
     категории `featured_order = NULL`, затем работам из списка — индекс в массиве
     (0 = hero). Валидация принадлежности работ категории — на уровне API (задача 15),
     здесь — механика;
   - `listFeatured(categoryId)` — работы категории с `featured_order IS NOT NULL`
     по возрастанию.
   - обновить allowlist `runUpdate` работы: `featured_order` меняется только через
     `setFeatured` (в частичный UPDATE **не** добавлять).
6. **Категория** — allowlist `runUpdate` в `category.ts` дополнить: kicker, meta_role,
   period, description_long, display_variant.
7. **Сид** — `back/src/seed.ts`: добавить 2–3 тега, разметить часть работ, задать
   `featured_order` для части работ одной-двух категорий, заполнить новые поля
   category у одной категории (для контрактных тестов задач 14–15). Сохранить
   идемпотентность (DELETE новых таблиц в той же транзакции).

## Требования

- TDD: тест-файлы co-located (`tag.test.ts` и т.д.), фикстуры — `openDb(':memory:')`
  (+ `seed(db)` где удобно).
- Strict TS, без `any`. Стиль и структура — как в соседних репозиториях.
- Ничего не менять в `dto.ts` и роутах (упадут контрактные тесты задач 14–15 — их
  очередь ещё не пришла; существующие тесты должны остаться зелёными).

## Deliverables

`back/migrations/0002_*.sql`, обновлённые `types.ts`/репозитории/`seed.ts` + тесты.
`bun test` и `bun run typecheck` зелёные. Отметка в `docs/architecture.md` §3 (схема)
о новых таблицах/полях со ссылкой на спеку редизайна.

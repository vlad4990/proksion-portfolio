# Task — 15 admin-api-tags-featured

**Слой:** `/back`. **Методология:** **TDD** (`bun test`).
Спека: [`docs/projects-redesign.md`](../../docs/projects-redesign.md) §5.5.
Зависит от задач 13, 14.

## Цель

Admin-API покрывает весь новый контент: поля категории, CRUD+reorder тегов,
теги работы, витрина категории. Всё под auth+CSRF, с `onMutation()`.

## Шаги

1. **PATCH `/admin/categories/:id`** (`categories.ts`) — принять `kicker`,
   `meta_role`, `period`, `description_long` (`optStringOrNull`) и
   `display_variant` (строго один из `'showcase'|'strip'|'cards'`, иначе 400
   `bad_request`).
2. **Ресурс тегов** — новый `back/src/routes/admin/tags.ts` по образцу
   `categories.ts`:
   - POST `/admin/tags` `{title*, slug?, sort_order?}` → 201 + строка; слаг —
     `makeSlug` (уникальность глобальная), `sort_order` — `nextSortOrder`;
   - PATCH `/admin/tags/:id` `{title?, slug?, sort_order?}` → строка | 404;
     занятый слаг → 400;
   - DELETE `/admin/tags/:id` → `{ok:true}` (связи `work_tag` каскадом);
   - reorder: добавить `tag` в `reorder.ts` (`PATCH /admin/tags/reorder {ids}`) —
     монтирование ДО `/:id`;
   - подключить в композит `content.ts`.
3. **Теги работы** — PATCH `/admin/works/:id` (`works.ts`): опциональное поле
   `tag_ids: number[]` (`requireIntArray` при наличии) — полная замена набора
   через `setWorkTags`; несуществующий id тега → 400, работа не изменена
   (атомарно); `tag_ids` может приходить вместе с другими патч-полями.
4. **Витрина** — PATCH `/admin/categories/:id/featured` `{work_ids: number[]}`
   (в `categories.ts`, роут до `/:id`-generic не конфликтует — путь длиннее):
   - 404 если категории нет; 400 если какая-то работа не существует или
     принадлежит другой категории (проверка через subcategory.category_id);
   - порядок массива = `featured_order` (0 = hero), работы категории вне
     списка → NULL (репозиторий `setFeatured`);
   - пустой массив = очистить витрину; ответ `{ok:true}`.
5. **`onMutation`** — все новые мутации инкрементируют счётчик (проверять через
   `mutationCount()` в тестах).

## Требования

- TDD; на каждый роут: happy-path, валидация (400), not-found (404),
  auth (401 без cookie), CSRF (403 без заголовка), `onMutation`.
- Strict TS, без `any`; стиль — как в соседних ресурсах (guarded, хелперы
  `_shared.ts`, никакого сырого SQL в роутах).

## Deliverables

`back/src/routes/admin/tags.ts` (+ тесты), обновлённые `categories.ts`,
`works.ts`, `reorder.ts`, `content.ts`. `bun test` и `bun run typecheck` зелёные.
`docs/architecture.md` §7 (таблица admin-эндпоинтов) дополнена.

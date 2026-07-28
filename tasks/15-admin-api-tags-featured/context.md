# Context — 15 admin-api-tags-featured

## Зачем

Кураторство нового листинга (спека: [`docs/projects-redesign.md`](../../docs/projects-redesign.md)
§5.5): редактирование контентных полей категории, CRUD тегов, разметка работ тегами,
управление витриной раздела. Слой данных — задача 13, публичные GET'ы — задача 14.

## Что уже есть в репо

- **Композит admin-роутов** — `back/src/routes/admin/content.ts:13-20`; **порядок
  монтирования важен**: `reorder`-роуты ДО параметрических `/:id` (см. `reorder.ts`).
- **Паттерн ресурса** — `back/src/routes/admin/{categories,subcategories,works,images}.ts`:
  `guarded()`-обёртка (400/404/500), `protect(deps)` (JWT-guard + CSRF-заголовок
  `X-Requested-With`), хелперы валидации в `_shared.ts` (`parseId`, `requireString`,
  `optStringOrNull`, `requireIntArray`, `nextSortOrder`, `makeSlug`…).
- **PATCH работ** — `works.ts:74-108`: частичный UPDATE по allowlist; образец
  доп. валидации — проверка принадлежности `cover_image_id` работе (`:92-100`).
- **Reorder** — `reorder.ts:42-45`: `PATCH /admin/<res>/reorder {ids}` →
  `sort_order = index`. Для тегов — тот же паттерн.
- **Каждая успешная мутация** дёргает `deps.onMutation()` (дебаунс-пуш бэкапа) —
  новые мутации обязаны делать то же.
- **Тест-инфраструктура** — `back/src/routes/admin/_support.ts`: `makeCtx()`
  (in-memory БД + deps + `mutationCount()`), `authHeaders()`, `jsonHeaders()`,
  `req()`. Примеры: `categories.test.ts`, `works.test.ts`, `reorder.test.ts`.
- GET-эндпоинтов у admin-API нет и не нужно: админка читает публичные GET'ы
  (`/tags`, `/featured`, `/works?category=`, `WorkDetailById.tag_ids` — задача 14).

## Инварианты / ограничения

- **TDD**; auth+CSRF на всех новых мутациях (через существующий `protect`).
- Слаг тега: генерация `makeSlug` при отсутствии, уникальность глобальная,
  стабильность при PATCH без поля `slug` — как у категорий.
- Витрина: перезапись списка атомарна (репозиторий `setFeatured` из задачи 13);
  валидация «все работы принадлежат категории» — на этом уровне.
- Ошибки — в стиле `_shared.ts` (`bad_request`/`not_found` + `detail`).

## На что НЕ замахиваться

- UI админки — задача 16. Публичные роуты — задача 14 (уже сделана).
- Перенос работы между подкатегориями, bulk-операции — вне скоупа (как и были).
- Теги НЕ участвуют в slug-валидации работ/подкатегорий — это независимое
  пространство имён.

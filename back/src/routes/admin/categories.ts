// Admin-CRUD категорий (docs/architecture.md §7). Объявляются ОТ КОРНЯ как `/admin/categories…`
// — снаружи `/api/admin/categories…`. Все роуты под guard (401) + CSRF (403) из задачи 05.
//
// Слаг: из title (или явного `slug`), уникален среди всех категорий, стабилен после создания
// (PATCH без поля `slug` его не меняет). Удаление каскадит в БД (FK) и чистит объекты S3.
//
// Редизайн листинга (docs/projects-redesign.md §5.5) добавил сюда контент секции категории
// (`kicker`/`meta_role`/`period`/`description_long`/`display_variant`) и кураторскую витрину
// (`PATCH /admin/categories/:id/featured`).

import { Elysia } from 'elysia'
import type { CategoryPatch, DisplayVariant } from '../../types.ts'
import {
  asRecord,
  BadRequest,
  guarded,
  makeSlug,
  nextSortOrder,
  NotFound,
  optEnum,
  optNumber,
  optString,
  optStringOrNull,
  parseId,
  protect,
  purgeWorkObjects,
  requireIntArray,
  requireString,
  workIdsUnderCategory,
  type AdminDeps,
} from './_shared.ts'

/** Допустимые варианты секции-витрины (`category.display_variant`, спека редизайна §2.1). */
const DISPLAY_VARIANTS: readonly DisplayVariant[] = ['showcase', 'strip', 'cards']

export function adminCategoryRoutes(deps: AdminDeps) {
  const { repos, onMutation } = deps
  const guard = protect(deps)

  /** Слаги соседей (всех категорий), опционально исключая собственный (для PATCH). */
  const siblingSlugs = (exclude?: string): string[] =>
    repos.category
      .list()
      .map((c) => c.slug)
      .filter((s) => s !== exclude)

  return new Elysia()
    .post(
      '/admin/categories',
      ({ body, set }) =>
        guarded(set, () => {
          const b = asRecord(body)
          const title = requireString(b, 'title')
          const slug = makeSlug(optString(b, 'slug') ?? title, 'category', siblingSlugs())
          const description = optStringOrNull(b, 'description') ?? null
          const sort_order =
            optNumber(b, 'sort_order') ?? nextSortOrder(repos.category.list().map((c) => c.sort_order))
          const row = repos.category.create({ slug, title, description, sort_order })
          onMutation()
          set.status = 201
          return row
        }),
      guard,
    )
    .patch(
      '/admin/categories/:id',
      ({ params, body, set }) =>
        guarded(set, () => {
          const id = parseId(params.id)
          const existing = repos.category.getById(id)
          if (!existing) throw new NotFound('category')
          const b = asRecord(body)
          const patch: CategoryPatch = {}
          const title = optString(b, 'title')
          if (title !== undefined) patch.title = title
          const slug = optString(b, 'slug')
          if (slug !== undefined) patch.slug = makeSlug(slug, 'category', siblingSlugs(existing.slug))
          const description = optStringOrNull(b, 'description')
          if (description !== undefined) patch.description = description
          const sortOrder = optNumber(b, 'sort_order')
          if (sortOrder !== undefined) patch.sort_order = sortOrder
          // Контент секции/страницы категории (редизайн §4): все четыре — сбрасываемые в null.
          const kicker = optStringOrNull(b, 'kicker')
          if (kicker !== undefined) patch.kicker = kicker
          const metaRole = optStringOrNull(b, 'meta_role')
          if (metaRole !== undefined) patch.meta_role = metaRole
          const period = optStringOrNull(b, 'period')
          if (period !== undefined) patch.period = period
          const descriptionLong = optStringOrNull(b, 'description_long')
          if (descriptionLong !== undefined) patch.description_long = descriptionLong
          const displayVariant = optEnum(b, 'display_variant', DISPLAY_VARIANTS)
          if (displayVariant !== undefined) patch.display_variant = displayVariant
          const row = repos.category.update(id, patch)
          onMutation()
          return row
        }),
      guard,
    )
    // Кураторская витрина секции (§5.5). Путь длиннее generic-`/:id`, конфликта роутов нет.
    // Валидация принадлежности работ категории — здесь: репозиторий `setFeatured` даёт только
    // механику (одна транзакция), проверок области он не делает.
    .patch(
      '/admin/categories/:id/featured',
      ({ params, body, set }) =>
        guarded(set, () => {
          const id = parseId(params.id)
          if (!repos.category.getById(id)) throw new NotFound('category')
          const workIds = requireIntArray(asRecord(body), 'work_ids')
          if (new Set(workIds).size !== workIds.length) {
            throw new BadRequest('"work_ids" must not contain duplicates')
          }
          for (const workId of workIds) {
            const work = repos.work.getById(workId)
            const subcategory = work ? repos.subcategory.getById(work.subcategory_id) : null
            if (!subcategory || subcategory.category_id !== id) {
              throw new BadRequest(`work ${workId} does not belong to this category`)
            }
          }
          repos.work.setFeatured(id, workIds) // пустой список = очистить витрину
          onMutation()
          return { ok: true }
        }),
      guard,
    )
    .delete(
      '/admin/categories/:id',
      ({ params, set }) =>
        guarded(set, async () => {
          const id = parseId(params.id)
          if (!repos.category.getById(id)) throw new NotFound('category')
          // Чистка S3 до DB-delete: каскад БД уберёт строки, а объекты S3 чистим явно.
          for (const workId of workIdsUnderCategory(repos, id)) {
            await purgeWorkObjects(deps.store, workId)
          }
          repos.category.delete(id)
          onMutation()
          return { ok: true }
        }),
      guard,
    )
}

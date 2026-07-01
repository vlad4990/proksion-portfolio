// Admin-CRUD подкатегорий (docs/architecture.md §7). Слаг уникален в рамках своей категории
// (UNIQUE (category_id, slug)). Create требует существующий `category_id`. Удаление каскадит
// в БД (работы/картинки) и чистит объекты S3 работ.

import { Elysia } from 'elysia'
import type { SubcategoryPatch } from '../../types.ts'
import {
  asRecord,
  BadRequest,
  guarded,
  makeSlug,
  nextSortOrder,
  NotFound,
  optNumber,
  optString,
  optStringOrNull,
  parseId,
  protect,
  purgeWorkObjects,
  requireNumber,
  requireString,
  workIdsUnderSubcategory,
  type AdminDeps,
} from './_shared.ts'

export function adminSubcategoryRoutes(deps: AdminDeps) {
  const { repos, onMutation } = deps
  const guard = protect(deps)

  /** Слаги соседей в рамках одной категории (для уникальности). */
  const siblingSlugs = (categoryId: number, exclude?: string): string[] =>
    repos.subcategory
      .list(categoryId)
      .map((s) => s.slug)
      .filter((s) => s !== exclude)

  return new Elysia()
    .post(
      '/admin/subcategories',
      ({ body, set }) =>
        guarded(set, () => {
          const b = asRecord(body)
          const categoryId = requireNumber(b, 'category_id')
          if (!repos.category.getById(categoryId)) {
            throw new BadRequest('category_id does not reference an existing category')
          }
          const title = requireString(b, 'title')
          const slug = makeSlug(optString(b, 'slug') ?? title, 'subcategory', siblingSlugs(categoryId))
          const description = optStringOrNull(b, 'description') ?? null
          const sort_order =
            optNumber(b, 'sort_order') ??
            nextSortOrder(repos.subcategory.list(categoryId).map((s) => s.sort_order))
          const row = repos.subcategory.create({
            category_id: categoryId,
            slug,
            title,
            description,
            sort_order,
          })
          onMutation()
          set.status = 201
          return row
        }),
      guard,
    )
    .patch(
      '/admin/subcategories/:id',
      ({ params, body, set }) =>
        guarded(set, () => {
          const id = parseId(params.id)
          const existing = repos.subcategory.getById(id)
          if (!existing) throw new NotFound('subcategory')
          const b = asRecord(body)
          const patch: SubcategoryPatch = {}
          const title = optString(b, 'title')
          if (title !== undefined) patch.title = title
          const slug = optString(b, 'slug')
          if (slug !== undefined) {
            patch.slug = makeSlug(slug, 'subcategory', siblingSlugs(existing.category_id, existing.slug))
          }
          const description = optStringOrNull(b, 'description')
          if (description !== undefined) patch.description = description
          const sortOrder = optNumber(b, 'sort_order')
          if (sortOrder !== undefined) patch.sort_order = sortOrder
          const row = repos.subcategory.update(id, patch)
          onMutation()
          return row
        }),
      guard,
    )
    .delete(
      '/admin/subcategories/:id',
      ({ params, set }) =>
        guarded(set, async () => {
          const id = parseId(params.id)
          if (!repos.subcategory.getById(id)) throw new NotFound('subcategory')
          for (const workId of workIdsUnderSubcategory(repos, id)) {
            await purgeWorkObjects(deps.store, workId)
          }
          repos.subcategory.delete(id)
          onMutation()
          return { ok: true }
        }),
      guard,
    )
}

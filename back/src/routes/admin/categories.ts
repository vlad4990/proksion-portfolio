// Admin-CRUD категорий (docs/architecture.md §7). Объявляются ОТ КОРНЯ как `/admin/categories…`
// — снаружи `/api/admin/categories…`. Все роуты под guard (401) + CSRF (403) из задачи 05.
//
// Слаг: из title (или явного `slug`), уникален среди всех категорий, стабилен после создания
// (PATCH без поля `slug` его не меняет). Удаление каскадит в БД (FK) и чистит объекты S3.

import { Elysia } from 'elysia'
import type { CategoryPatch } from '../../types.ts'
import {
  asRecord,
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
  requireString,
  workIdsUnderCategory,
  type AdminDeps,
} from './_shared.ts'

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
          const row = repos.category.update(id, patch)
          onMutation()
          return row
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

// Admin-CRUD работ (docs/architecture.md §7, §3). Слаг уникален в рамках подкатегории.
// Работа создаётся БЕЗ cover (циклическая ссылка cover_image_id ↔ image): cover проставляется
// после первой загруженной картинки (см. images.ts) либо вручную через PATCH. Удаление каскадит
// картинки в БД (FK) и чистит объекты S3 работы.
//
// `subcategory_id` задаётся только на create (репозиторий 02 не поддерживает перенос работы
// между подкатегориями — не расширяем его в этой задаче).

import { Elysia } from 'elysia'
import type { WorkPatch } from '../../types.ts'
import {
  asRecord,
  BadRequest,
  guarded,
  makeSlug,
  nextSortOrder,
  NotFound,
  optNumber,
  optNumberOrNull,
  optString,
  optStringOrNull,
  parseId,
  protect,
  purgeWorkObjects,
  requireNumber,
  type AdminDeps,
} from './_shared.ts'

export function adminWorkRoutes(deps: AdminDeps) {
  const { repos, onMutation } = deps
  const guard = protect(deps)

  /** Слаги соседей в рамках одной подкатегории (для уникальности). */
  const siblingSlugs = (subcategoryId: number, exclude?: string): string[] =>
    repos.work
      .list(subcategoryId)
      .map((w) => w.slug)
      .filter((s) => s !== exclude)

  return new Elysia()
    .post(
      '/admin/works',
      ({ body, set }) =>
        guarded(set, () => {
          const b = asRecord(body)
          const subcategoryId = requireNumber(b, 'subcategory_id')
          if (!repos.subcategory.getById(subcategoryId)) {
            throw new BadRequest('subcategory_id does not reference an existing subcategory')
          }
          const title = optStringOrNull(b, 'title') ?? null
          const slug = makeSlug(
            optString(b, 'slug') ?? title ?? '',
            'work',
            siblingSlugs(subcategoryId),
          )
          const description = optStringOrNull(b, 'description') ?? null
          const sort_order =
            optNumber(b, 'sort_order') ??
            nextSortOrder(repos.work.list(subcategoryId).map((w) => w.sort_order))
          // Создаётся без cover — он проставится после первой картинки.
          const row = repos.work.create({
            subcategory_id: subcategoryId,
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
      '/admin/works/:id',
      ({ params, body, set }) =>
        guarded(set, () => {
          const id = parseId(params.id)
          const existing = repos.work.getById(id)
          if (!existing) throw new NotFound('work')
          const b = asRecord(body)
          const patch: WorkPatch = {}
          const title = optStringOrNull(b, 'title')
          if (title !== undefined) patch.title = title
          const slug = optString(b, 'slug')
          if (slug !== undefined) {
            patch.slug = makeSlug(slug, 'work', siblingSlugs(existing.subcategory_id, existing.slug))
          }
          const description = optStringOrNull(b, 'description')
          if (description !== undefined) patch.description = description
          const cover = optNumberOrNull(b, 'cover_image_id')
          if (cover !== undefined) {
            if (cover !== null) {
              const img = repos.image.getById(cover)
              if (!img || img.work_id !== id) {
                throw new BadRequest('cover_image_id must reference an image of this work')
              }
            }
            patch.cover_image_id = cover
          }
          const sortOrder = optNumber(b, 'sort_order')
          if (sortOrder !== undefined) patch.sort_order = sortOrder
          const row = repos.work.update(id, patch)
          onMutation()
          return row
        }),
      guard,
    )
    .delete(
      '/admin/works/:id',
      ({ params, set }) =>
        guarded(set, async () => {
          const id = parseId(params.id)
          if (!repos.work.getById(id)) throw new NotFound('work')
          await purgeWorkObjects(deps.store, id) // объекты S3 всех картинок работы
          repos.work.delete(id) // строки картинок уйдут каскадом (FK)
          onMutation()
          return { ok: true }
        }),
      guard,
    )
}

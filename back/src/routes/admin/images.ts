// Admin-управление картинками работ (docs/architecture.md §6, §7, §3).
//
// POST /admin/works/:id/images — multipart-загрузка: пайплайн sharp (04) → заливка вариантов
//   в MinIO → строка `image`. Первая картинка работы становится cover.
// PATCH /admin/images/:id     — обновить alt / sort_order.
// DELETE /admin/images/:id    — удалить объекты S3 + строку; если это был cover — переназначить
//   на следующую картинку работы (или NULL).
//
// Атомарность загрузки (task.md): key_base детерминирован по (workId, imageId), но imageId
// известен только ПОСЛЕ вставки строки. Поэтому: вставляем строку-заготовку → грузим в S3 →
// дописываем метаданные. Если заливка падает — откатываем: чистим уже залитые объекты и удаляем
// строку, чтобы не осталось «висячей» записи `image` (и наоборот — объектов без строки).

import { Elysia } from 'elysia'
import type { ImagePatch } from '../../types.ts'
import { imageKeyBase, storeImage } from '../../images/store.ts'
import {
  asRecord,
  BadRequest,
  guarded,
  nextSortOrder,
  NotFound,
  optNumber,
  optStringOrNull,
  parseId,
  protect,
  type AdminDeps,
} from './_shared.ts'

/** Достаёт файл (web `File`) из распарсенного Elysia multipart-тела. */
function extractFile(body: unknown, field: string): File | null {
  if (typeof body === 'object' && body !== null && field in body) {
    const v = (body as Record<string, unknown>)[field]
    if (v instanceof File) return v
  }
  return null
}

/** Достаёт alt из multipart-полей (всегда строка); пустое/отсутствует → null. */
function extractAlt(body: unknown): string | null {
  if (typeof body === 'object' && body !== null && 'alt' in body) {
    const v = (body as Record<string, unknown>).alt
    if (typeof v === 'string' && v.trim() !== '') return v
  }
  return null
}

export function adminImageRoutes(deps: AdminDeps) {
  const { repos, onMutation } = deps
  const guard = protect(deps)

  return new Elysia()
    .post(
      '/admin/works/:id/images',
      ({ params, body, set }) =>
        guarded(set, async () => {
          const store = deps.store
          if (!store) {
            set.status = 503
            return { error: 'storage_unavailable' }
          }
          const workId = parseId(params.id)
          const work = repos.work.getById(workId)
          if (!work) throw new NotFound('work')
          const file = extractFile(body, 'file')
          if (!file) throw new BadRequest('multipart field "file" is required')
          const bytes = new Uint8Array(await file.arrayBuffer())
          const alt = extractAlt(body)
          const sortOrder = nextSortOrder(repos.image.list(workId).map((i) => i.sort_order))

          // 1) строка-заготовка (key_base проставится после успешной заливки).
          const row = repos.image.create({
            work_id: workId,
            key_base: '',
            width: 0,
            height: 0,
            alt,
            sort_order: sortOrder,
          })
          try {
            // 2) пайплайн + заливка всех вариантов в MinIO.
            const stored = await storeImage(store, workId, row.id, bytes)
            // 3) дописать метаданные.
            const updated = repos.image.update(row.id, {
              key_base: stored.key_base,
              width: stored.width,
              height: stored.height,
              lqip: stored.lqip,
            })
            if (!updated) throw new Error('image row vanished mid-upload')
            // Первая картинка работы → cover.
            if (work.cover_image_id === null) repos.work.update(workId, { cover_image_id: row.id })
            onMutation()
            set.status = 201
            return updated
          } catch (err) {
            // Откат: убрать залитые объекты и строку-заготовку — без «висячих» записей.
            await store.deletePrefix(imageKeyBase(workId, row.id)).catch(() => {})
            repos.image.delete(row.id)
            throw err
          }
        }),
      guard,
    )
    .patch(
      '/admin/images/:id',
      ({ params, body, set }) =>
        guarded(set, () => {
          const id = parseId(params.id)
          if (!repos.image.getById(id)) throw new NotFound('image')
          const b = asRecord(body)
          const patch: ImagePatch = {}
          const alt = optStringOrNull(b, 'alt')
          if (alt !== undefined) patch.alt = alt
          const sortOrder = optNumber(b, 'sort_order')
          if (sortOrder !== undefined) patch.sort_order = sortOrder
          const row = repos.image.update(id, patch)
          onMutation()
          return row
        }),
      guard,
    )
    .delete(
      '/admin/images/:id',
      ({ params, set }) =>
        guarded(set, async () => {
          const id = parseId(params.id)
          const image = repos.image.getById(id)
          if (!image) throw new NotFound('image')
          const work = repos.work.getById(image.work_id)
          const wasCover = work?.cover_image_id === image.id

          // Объекты S3 — до DB-delete: если чистка падает, строка остаётся (можно повторить).
          if (deps.store) await deps.store.deletePrefix(image.key_base)
          repos.image.delete(id) // FK снимет cover_image_id (ON DELETE SET NULL), если это был cover

          if (wasCover) {
            // Переназначить cover на следующую картинку работы (по sort_order) или NULL.
            const next = repos.image.list(image.work_id)[0] ?? null
            repos.work.update(image.work_id, { cover_image_id: next ? next.id : null })
          }
          onMutation()
          return { ok: true }
        }),
      guard,
    )
}

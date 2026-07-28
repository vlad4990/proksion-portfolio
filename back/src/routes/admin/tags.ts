// Admin-CRUD глобальных тегов (спека редизайна §5.5). Теги — чипы-фильтры корневой
// `/projects`, отдельное пространство имён: со слагами категорий/подкатегорий/работ они
// не пересекаются. Объявляются ОТ КОРНЯ как `/admin/tags…` — снаружи `/api/admin/tags…`.
//
// Слаг: уникален ГЛОБАЛЬНО и стабилен после создания (PATCH без поля `slug` его не меняет).
// Автогенерация из title получает суффикс `-2` (как у категорий), а явно заданный занятый
// слаг — 400: запрошенный пользователем слаг молча подменять нельзя.
//
// Удаление тега каскадит в `work_tag` (FK ON DELETE CASCADE, миграция 0002) — сами работы
// не трогаются, объектов S3 у тега нет.

import { Elysia } from 'elysia'
import type { TagPatch } from '../../types.ts'
import {
  asRecord,
  exactSlug,
  guarded,
  makeSlug,
  nextSortOrder,
  NotFound,
  optNumber,
  optString,
  parseId,
  protect,
  requireString,
  type AdminDeps,
} from './_shared.ts'

export function adminTagRoutes(deps: AdminDeps) {
  const { repos, onMutation } = deps
  const guard = protect(deps)

  /** Слаги всех прочих тегов, опционально исключая собственный (для PATCH). */
  const siblingSlugs = (exclude?: string): string[] =>
    repos.tag
      .list()
      .map((t) => t.slug)
      .filter((s) => s !== exclude)

  return new Elysia()
    .post(
      '/admin/tags',
      ({ body, set }) =>
        guarded(set, () => {
          const b = asRecord(body)
          const title = requireString(b, 'title')
          const explicit = optString(b, 'slug')
          const slug =
            explicit === undefined
              ? makeSlug(title, 'tag', siblingSlugs())
              : exactSlug(explicit, 'tag', siblingSlugs())
          const sort_order =
            optNumber(b, 'sort_order') ?? nextSortOrder(repos.tag.list().map((t) => t.sort_order))
          const row = repos.tag.create({ slug, title, sort_order })
          onMutation()
          set.status = 201
          return row
        }),
      guard,
    )
    .patch(
      '/admin/tags/:id',
      ({ params, body, set }) =>
        guarded(set, () => {
          const id = parseId(params.id)
          const existing = repos.tag.getById(id)
          if (!existing) throw new NotFound('tag')
          const b = asRecord(body)
          const patch: TagPatch = {}
          const title = optString(b, 'title')
          if (title !== undefined) patch.title = title
          const slug = optString(b, 'slug')
          if (slug !== undefined) patch.slug = exactSlug(slug, 'tag', siblingSlugs(existing.slug))
          const sortOrder = optNumber(b, 'sort_order')
          if (sortOrder !== undefined) patch.sort_order = sortOrder
          const row = repos.tag.update(id, patch)
          onMutation()
          return row
        }),
      guard,
    )
    .delete(
      '/admin/tags/:id',
      ({ params, set }) =>
        guarded(set, () => {
          const id = parseId(params.id)
          if (!repos.tag.getById(id)) throw new NotFound('tag')
          repos.tag.delete(id) // строки work_tag уйдут каскадом (FK)
          onMutation()
          return { ok: true }
        }),
      guard,
    )
}

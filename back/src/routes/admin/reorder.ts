// Reorder admin-сущностей (docs/architecture.md §7): PATCH `/admin/<kind>/reorder` принимает
// упорядоченный список id → пишет `sort_order = позиция`. Публичный листинг (03) сортирует по
// sort_order, поэтому новый порядок сразу отражается на сайте.
//
// Статические пути `/reorder` приоритетнее параметрических `/:id` в роутере Elysia, конфликта с
// PATCH `/admin/<kind>/:id` нет.

import { Elysia } from 'elysia'
import { asRecord, guarded, protect, requireIntArray, type AdminDeps } from './_shared.ts'

type Kind = 'category' | 'subcategory' | 'work' | 'image'

export function adminReorderRoutes(deps: AdminDeps) {
  const { repos, onMutation } = deps
  const guard = protect(deps)

  // Точечные апдейтеры — чтобы TS видел конкретный тип patch у каждого репозитория.
  const setOrder: Record<Kind, (id: number, sortOrder: number) => void> = {
    category: (id, sort_order) => {
      repos.category.update(id, { sort_order })
    },
    subcategory: (id, sort_order) => {
      repos.subcategory.update(id, { sort_order })
    },
    work: (id, sort_order) => {
      repos.work.update(id, { sort_order })
    },
    image: (id, sort_order) => {
      repos.image.update(id, { sort_order })
    },
  }

  const reorder = (kind: Kind, body: unknown, set: { status?: number | string }) =>
    guarded(set, () => {
      const ids = requireIntArray(asRecord(body), 'ids')
      ids.forEach((id, index) => setOrder[kind](id, index))
      onMutation()
      return { ok: true }
    })

  return new Elysia()
    .patch('/admin/categories/reorder', ({ body, set }) => reorder('category', body, set), guard)
    .patch('/admin/subcategories/reorder', ({ body, set }) => reorder('subcategory', body, set), guard)
    .patch('/admin/works/reorder', ({ body, set }) => reorder('work', body, set), guard)
    .patch('/admin/images/reorder', ({ body, set }) => reorder('image', body, set), guard)
}

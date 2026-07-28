// Композит: проверяем, что роуты не затирают друг друга при совместном монтировании —
// в частности, статический `/admin/<kind>/reorder` не перехватывается параметрическим `/:id`.

import { beforeEach, describe, expect, test } from 'bun:test'
import { adminContentRoutes } from './content.ts'
import { jsonHeaders, makeCtx, req, type TestCtx } from './_support.ts'

describe('adminContentRoutes composite wiring', () => {
  let ctx: TestCtx
  let app: ReturnType<typeof adminContentRoutes>

  beforeEach(() => {
    ctx = makeCtx()
    app = adminContentRoutes(ctx.deps)
  })

  test('create flows through the composite (POST /admin/categories)', async () => {
    const res = await app.handle(
      req('/admin/categories', {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ title: 'Через композит' }),
      }),
    )
    expect(res.status).toBe(201)
  })

  test('PATCH /admin/categories/reorder is NOT shadowed by /admin/categories/:id', async () => {
    const a = ctx.repos.category.create({ slug: 'a', title: 'A', sort_order: 0 })
    const b = ctx.repos.category.create({ slug: 'b', title: 'B', sort_order: 1 })
    const res = await app.handle(
      req('/admin/categories/reorder', {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify({ ids: [b.id, a.id] }),
      }),
    )
    expect(res.status).toBe(200) // reorder handler ran (not parseId("reorder") → 400)
    expect(ctx.repos.category.list().map((c) => c.id)).toEqual([b.id, a.id])
  })

  test('tags flow through the composite (POST /admin/tags)', async () => {
    const res = await app.handle(
      req('/admin/tags', {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ title: 'Айдентика' }),
      }),
    )
    expect(res.status).toBe(201)
  })

  test('PATCH /admin/tags/reorder is NOT shadowed by /admin/tags/:id', async () => {
    const a = ctx.repos.tag.create({ slug: 'a', title: 'A', sort_order: 0 })
    const b = ctx.repos.tag.create({ slug: 'b', title: 'B', sort_order: 1 })
    const res = await app.handle(
      req('/admin/tags/reorder', {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify({ ids: [b.id, a.id] }),
      }),
    )
    expect(res.status).toBe(200)
    expect(ctx.repos.tag.list().map((t) => t.id)).toEqual([b.id, a.id])
  })

  test('PATCH /admin/categories/:id/featured coexists with /admin/categories/:id', async () => {
    const cat = ctx.repos.category.create({ slug: 'cat', title: 'Кат' })
    const sub = ctx.repos.subcategory.create({ category_id: cat.id, slug: 'sub', title: 'Под' })
    const work = ctx.repos.work.create({ subcategory_id: sub.id, slug: 'w', title: 'W' })

    const res = await app.handle(
      req(`/admin/categories/${cat.id}/featured`, {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify({ work_ids: [work.id] }),
      }),
    )
    expect(res.status).toBe(200)
    expect(ctx.repos.work.listFeatured(cat.id).map((w) => w.id)).toEqual([work.id])
  })
})

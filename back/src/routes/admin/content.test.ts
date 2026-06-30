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
})

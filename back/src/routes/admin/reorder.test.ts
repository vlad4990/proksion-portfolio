import { beforeEach, describe, expect, test } from 'bun:test'
import { adminReorderRoutes } from './reorder.ts'
import { jsonHeaders, makeCtx, req, type TestCtx } from './_support.ts'

describe('admin reorder', () => {
  let ctx: TestCtx
  let app: ReturnType<typeof adminReorderRoutes>

  beforeEach(() => {
    ctx = makeCtx()
    app = adminReorderRoutes(ctx.deps)
  })

  const patch = (path: string, ids: number[]) =>
    app.handle(req(path, { method: 'PATCH', headers: jsonHeaders(), body: JSON.stringify({ ids }) }))

  test('categories reorder persists sort_order by position', async () => {
    const a = ctx.repos.category.create({ slug: 'a', title: 'A', sort_order: 0 })
    const b = ctx.repos.category.create({ slug: 'b', title: 'B', sort_order: 1 })
    const c = ctx.repos.category.create({ slug: 'c', title: 'C', sort_order: 2 })

    const res = await patch('/admin/categories/reorder', [c.id, a.id, b.id])
    expect(res.status).toBe(200)
    // repo lists by sort_order → new order is c, a, b
    expect(ctx.repos.category.list().map((x) => x.id)).toEqual([c.id, a.id, b.id])
    expect(ctx.mutationCount()).toBe(1)
  })

  test('works reorder is reflected by the same ordered listing the public API uses', async () => {
    const cat = ctx.repos.category.create({ slug: 'cat', title: 'Кат' })
    const sub = ctx.repos.subcategory.create({ category_id: cat.id, slug: 'sub', title: 'Под' })
    const w0 = ctx.repos.work.create({ subcategory_id: sub.id, slug: 'w0', title: 'W0', sort_order: 0 })
    const w1 = ctx.repos.work.create({ subcategory_id: sub.id, slug: 'w1', title: 'W1', sort_order: 1 })
    const w2 = ctx.repos.work.create({ subcategory_id: sub.id, slug: 'w2', title: 'W2', sort_order: 2 })

    await patch('/admin/works/reorder', [w2.id, w0.id, w1.id])
    expect(ctx.repos.work.list(sub.id).map((w) => w.id)).toEqual([w2.id, w0.id, w1.id])
  })

  test('images reorder persists carousel order', async () => {
    const cat = ctx.repos.category.create({ slug: 'c', title: 'C' })
    const sub = ctx.repos.subcategory.create({ category_id: cat.id, slug: 's', title: 'S' })
    const work = ctx.repos.work.create({ subcategory_id: sub.id, slug: 'w', title: 'W' })
    const i0 = ctx.repos.image.create({ work_id: work.id, key_base: 'images/1/1', width: 1, height: 1 })
    const i1 = ctx.repos.image.create({ work_id: work.id, key_base: 'images/1/2', width: 1, height: 1 })

    await patch('/admin/images/reorder', [i1.id, i0.id])
    expect(ctx.repos.image.list(work.id).map((i) => i.id)).toEqual([i1.id, i0.id])
  })

  test('tags reorder persists the chip order of /projects', async () => {
    const a = ctx.repos.tag.create({ slug: 'a', title: 'A', sort_order: 0 })
    const b = ctx.repos.tag.create({ slug: 'b', title: 'B', sort_order: 1 })
    const c = ctx.repos.tag.create({ slug: 'c', title: 'C', sort_order: 2 })

    const res = await patch('/admin/tags/reorder', [c.id, a.id, b.id])
    expect(res.status).toBe(200)
    expect(ctx.repos.tag.list().map((t) => t.id)).toEqual([c.id, a.id, b.id])
    expect(ctx.mutationCount()).toBe(1)
  })

  test('bad payload (not an array of ints) → 400', async () => {
    expect((await patch('/admin/categories/reorder', 'nope' as unknown as number[])).status).toBe(400)
  })
})

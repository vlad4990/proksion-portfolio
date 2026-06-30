import { beforeEach, describe, expect, test } from 'bun:test'
import { adminCategoryRoutes } from './categories.ts'
import { authHeaders, jsonHeaders, makeCtx, req, type TestCtx } from './_support.ts'

describe('admin categories CRUD', () => {
  let ctx: TestCtx
  let app: ReturnType<typeof adminCategoryRoutes>

  beforeEach(() => {
    ctx = makeCtx()
    app = adminCategoryRoutes(ctx.deps)
  })

  const post = (body: unknown, headers = jsonHeaders()) =>
    app.handle(req('/admin/categories', { method: 'POST', headers, body: JSON.stringify(body) }))

  test('POST creates a category with an auto slug from the russian title', async () => {
    const res = await post({ title: 'Баннеры и обложки' })
    expect(res.status).toBe(201)
    const row = (await res.json()) as { id: number; slug: string; title: string; sort_order: number }
    expect(row.title).toBe('Баннеры и обложки')
    expect(row.slug).toBe('bannery-i-oblozhki')
    expect(ctx.mutationCount()).toBe(1)
  })

  test('duplicate titles get a unique slug suffix', async () => {
    const a = (await (await post({ title: 'Логотип' })).json()) as { slug: string }
    const b = (await (await post({ title: 'Логотип' })).json()) as { slug: string }
    expect(a.slug).toBe('logotip')
    expect(b.slug).toBe('logotip-2')
  })

  test('sort_order defaults to the end of the list', async () => {
    const a = (await (await post({ title: 'A' })).json()) as { sort_order: number }
    const b = (await (await post({ title: 'B' })).json()) as { sort_order: number }
    expect(a.sort_order).toBe(0)
    expect(b.sort_order).toBe(1)
  })

  test('explicit slug is honoured (slugified + uniqued)', async () => {
    const row = (await (await post({ title: 'Тест', slug: 'Custom Slug' })).json()) as { slug: string }
    expect(row.slug).toBe('custom-slug')
  })

  test('POST without a title → 400', async () => {
    const res = await post({})
    expect(res.status).toBe(400)
  })

  test('PATCH edits title but keeps the slug stable', async () => {
    const created = (await (await post({ title: 'Старое' })).json()) as { id: number; slug: string }
    const res = await app.handle(
      req(`/admin/categories/${created.id}`, {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify({ title: 'Новое название' }),
      }),
    )
    expect(res.status).toBe(200)
    const row = (await res.json()) as { title: string; slug: string }
    expect(row.title).toBe('Новое название')
    expect(row.slug).toBe(created.slug) // slug unchanged by a title edit
  })

  test('PATCH with an explicit slug changes it', async () => {
    const created = (await (await post({ title: 'X' })).json()) as { id: number }
    const row = (await (
      await app.handle(
        req(`/admin/categories/${created.id}`, {
          method: 'PATCH',
          headers: jsonHeaders(),
          body: JSON.stringify({ slug: 'переименовано' }),
        }),
      )
    ).json()) as { slug: string }
    expect(row.slug).toBe('pereimenovano')
  })

  test('PATCH unknown id → 404', async () => {
    const res = await app.handle(
      req('/admin/categories/999', {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify({ title: 'x' }),
      }),
    )
    expect(res.status).toBe(404)
  })

  test('DELETE cascades subcategories/works/images in the DB', async () => {
    const created = (await (await post({ title: 'Cascade' })).json()) as { id: number }
    const sub = ctx.repos.subcategory.create({ category_id: created.id, slug: 's', title: 'S' })
    const work = ctx.repos.work.create({ subcategory_id: sub.id, slug: 'w', title: 'W' })
    const img = ctx.repos.image.create({ work_id: work.id, key_base: 'images/1/1', width: 1, height: 1 })

    const res = await app.handle(
      req(`/admin/categories/${created.id}`, { method: 'DELETE', headers: authHeaders() }),
    )
    expect(res.status).toBe(200)
    expect(ctx.repos.category.getById(created.id)).toBeNull()
    expect(ctx.repos.subcategory.getById(sub.id)).toBeNull()
    expect(ctx.repos.work.getById(work.id)).toBeNull()
    expect(ctx.repos.image.getById(img.id)).toBeNull()
  })
})

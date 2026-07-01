import { beforeEach, describe, expect, test } from 'bun:test'
import { adminSubcategoryRoutes } from './subcategories.ts'
import { authHeaders, jsonHeaders, makeCtx, req, type TestCtx } from './_support.ts'

describe('admin subcategories CRUD', () => {
  let ctx: TestCtx
  let app: ReturnType<typeof adminSubcategoryRoutes>
  let categoryId: number
  let otherCategoryId: number

  beforeEach(() => {
    ctx = makeCtx()
    app = adminSubcategoryRoutes(ctx.deps)
    categoryId = ctx.repos.category.create({ slug: 'cat', title: 'Категория' }).id
    otherCategoryId = ctx.repos.category.create({ slug: 'cat2', title: 'Категория 2' }).id
  })

  const post = (body: unknown, headers = jsonHeaders()) =>
    app.handle(req('/admin/subcategories', { method: 'POST', headers, body: JSON.stringify(body) }))

  test('POST creates a subcategory with an auto slug', async () => {
    const res = await post({ category_id: categoryId, title: 'Баннеры' })
    expect(res.status).toBe(201)
    const row = (await res.json()) as { slug: string; category_id: number }
    expect(row.slug).toBe('bannery')
    expect(row.category_id).toBe(categoryId)
    expect(ctx.mutationCount()).toBe(1)
  })

  test('slug uniqueness is scoped per category (same slug allowed in another category)', async () => {
    const a = (await (await post({ category_id: categoryId, title: 'Обложки' })).json()) as {
      slug: string
    }
    const b = (await (await post({ category_id: categoryId, title: 'Обложки' })).json()) as {
      slug: string
    }
    const c = (await (await post({ category_id: otherCategoryId, title: 'Обложки' })).json()) as {
      slug: string
    }
    expect(a.slug).toBe('oblozhki')
    expect(b.slug).toBe('oblozhki-2') // unique within the same category
    expect(c.slug).toBe('oblozhki') // independent scope in another category
  })

  test('POST with a non-existent category_id → 400', async () => {
    const res = await post({ category_id: 9999, title: 'X' })
    expect(res.status).toBe(400)
  })

  test('PATCH keeps slug stable across a title edit', async () => {
    const created = (await (await post({ category_id: categoryId, title: 'Старое' })).json()) as {
      id: number
      slug: string
    }
    const row = (await (
      await app.handle(
        req(`/admin/subcategories/${created.id}`, {
          method: 'PATCH',
          headers: jsonHeaders(),
          body: JSON.stringify({ title: 'Совсем другое' }),
        }),
      )
    ).json()) as { title: string; slug: string }
    expect(row.title).toBe('Совсем другое')
    expect(row.slug).toBe(created.slug)
  })

  test('DELETE cascades works/images', async () => {
    const created = (await (await post({ category_id: categoryId, title: 'C' })).json()) as {
      id: number
    }
    const work = ctx.repos.work.create({ subcategory_id: created.id, slug: 'w', title: 'W' })
    const img = ctx.repos.image.create({ work_id: work.id, key_base: 'images/1/1', width: 1, height: 1 })
    const res = await app.handle(
      req(`/admin/subcategories/${created.id}`, { method: 'DELETE', headers: authHeaders() }),
    )
    expect(res.status).toBe(200)
    expect(ctx.repos.subcategory.getById(created.id)).toBeNull()
    expect(ctx.repos.work.getById(work.id)).toBeNull()
    expect(ctx.repos.image.getById(img.id)).toBeNull()
  })
})

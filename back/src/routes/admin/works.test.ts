import { beforeEach, describe, expect, test } from 'bun:test'
import { adminWorkRoutes } from './works.ts'
import { authHeaders, jsonHeaders, makeCtx, req, type TestCtx } from './_support.ts'

describe('admin works CRUD', () => {
  let ctx: TestCtx
  let app: ReturnType<typeof adminWorkRoutes>
  let subcategoryId: number

  beforeEach(() => {
    ctx = makeCtx()
    app = adminWorkRoutes(ctx.deps)
    const cat = ctx.repos.category.create({ slug: 'cat', title: 'Категория' })
    subcategoryId = ctx.repos.subcategory.create({ category_id: cat.id, slug: 'sub', title: 'Под' }).id
  })

  const post = (body: unknown, headers = jsonHeaders()) =>
    app.handle(req('/admin/works', { method: 'POST', headers, body: JSON.stringify(body) }))

  test('POST creates a work without a cover, slug auto from title', async () => {
    const res = await post({ subcategory_id: subcategoryId, title: 'Афиша концерта' })
    expect(res.status).toBe(201)
    const row = (await res.json()) as { slug: string; cover_image_id: number | null }
    expect(row.slug).toBe('afisha-kontserta') // ц → ts (см. таблицу транслита в slug.ts)
    expect(row.cover_image_id).toBeNull() // created without cover
    expect(ctx.mutationCount()).toBe(1)
  })

  test('slug uniqueness scoped per subcategory', async () => {
    const a = (await (await post({ subcategory_id: subcategoryId, title: 'Постер' })).json()) as {
      slug: string
    }
    const b = (await (await post({ subcategory_id: subcategoryId, title: 'Постер' })).json()) as {
      slug: string
    }
    expect(a.slug).toBe('poster')
    expect(b.slug).toBe('poster-2')
  })

  test('work with no title still gets a deterministic fallback slug', async () => {
    const row = (await (await post({ subcategory_id: subcategoryId })).json()) as {
      slug: string
      title: string | null
    }
    expect(row.title).toBeNull()
    expect(row.slug).toBe('work')
  })

  test('POST with a non-existent subcategory_id → 400', async () => {
    expect((await post({ subcategory_id: 9999, title: 'X' })).status).toBe(400)
  })

  test('PATCH changes the cover_image_id (must belong to the work)', async () => {
    const work = (await (await post({ subcategory_id: subcategoryId, title: 'W' })).json()) as {
      id: number
    }
    const img = ctx.repos.image.create({
      work_id: work.id,
      key_base: `images/${work.id}/1`,
      width: 1,
      height: 1,
    })
    const res = await app.handle(
      req(`/admin/works/${work.id}`, {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify({ cover_image_id: img.id }),
      }),
    )
    expect(res.status).toBe(200)
    expect(((await res.json()) as { cover_image_id: number }).cover_image_id).toBe(img.id)
  })

  test('PATCH rejects a cover image that belongs to another work → 400', async () => {
    const work = (await (await post({ subcategory_id: subcategoryId, title: 'W1' })).json()) as {
      id: number
    }
    const other = (await (await post({ subcategory_id: subcategoryId, title: 'W2' })).json()) as {
      id: number
    }
    const foreign = ctx.repos.image.create({
      work_id: other.id,
      key_base: `images/${other.id}/1`,
      width: 1,
      height: 1,
    })
    const res = await app.handle(
      req(`/admin/works/${work.id}`, {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify({ cover_image_id: foreign.id }),
      }),
    )
    expect(res.status).toBe(400)
  })

  test('PATCH keeps the slug stable across a title edit', async () => {
    const work = (await (await post({ subcategory_id: subcategoryId, title: 'Старое' })).json()) as {
      id: number
      slug: string
    }
    const row = (await (
      await app.handle(
        req(`/admin/works/${work.id}`, {
          method: 'PATCH',
          headers: jsonHeaders(),
          body: JSON.stringify({ title: 'Переименовали' }),
        }),
      )
    ).json()) as { slug: string }
    expect(row.slug).toBe(work.slug)
  })

  test('DELETE cascades images', async () => {
    const work = (await (await post({ subcategory_id: subcategoryId, title: 'W' })).json()) as {
      id: number
    }
    const img = ctx.repos.image.create({
      work_id: work.id,
      key_base: `images/${work.id}/1`,
      width: 1,
      height: 1,
    })
    const res = await app.handle(
      req(`/admin/works/${work.id}`, { method: 'DELETE', headers: authHeaders() }),
    )
    expect(res.status).toBe(200)
    expect(ctx.repos.work.getById(work.id)).toBeNull()
    expect(ctx.repos.image.getById(img.id)).toBeNull()
  })
})

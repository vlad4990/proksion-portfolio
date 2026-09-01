import { beforeEach, describe, expect, test } from 'bun:test'
import { adminWorkRoutes } from './works.ts'
import { publicRoutes } from '../public.ts'
import type { WorkDetailById } from '../../dto.ts'
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

  // Флаг «единое полотно»: чекбокс админки → 0|1 в БД → boolean в публичном контракте.
  test('POST defaults seamless to 0; POST with seamless: true stores 1', async () => {
    const off = (await (await post({ subcategory_id: subcategoryId, title: 'A' })).json()) as {
      seamless: number
    }
    expect(off.seamless).toBe(0)
    const on = (await (
      await post({ subcategory_id: subcategoryId, title: 'B', seamless: true })
    ).json()) as { seamless: number }
    expect(on.seamless).toBe(1)
  })

  test('PATCH toggles seamless both ways and leaves it alone when omitted', async () => {
    const work = (await (await post({ subcategory_id: subcategoryId, title: 'W' })).json()) as {
      id: number
    }
    const patch = (body: unknown) =>
      app.handle(
        req(`/admin/works/${work.id}`, {
          method: 'PATCH',
          headers: jsonHeaders(),
          body: JSON.stringify(body),
        }),
      )
    expect(((await (await patch({ seamless: true })).json()) as { seamless: number }).seamless).toBe(1)
    // Патч без флага не должен его сбрасывать
    expect(
      ((await (await patch({ title: 'Другое' })).json()) as { seamless: number }).seamless,
    ).toBe(1)
    expect(((await (await patch({ seamless: false })).json()) as { seamless: number }).seamless).toBe(
      0,
    )
  })

  test('a non-boolean seamless → 400', async () => {
    const work = (await (await post({ subcategory_id: subcategoryId, title: 'W' })).json()) as {
      id: number
    }
    const res = await app.handle(
      req(`/admin/works/${work.id}`, {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify({ seamless: 1 }),
      }),
    )
    expect(res.status).toBe(400)
    expect(ctx.repos.work.getById(work.id)?.seamless).toBe(0)
  })

  // Флаг «карусель» (десктопная модалка): чекбокс админки → 0|1 в БД → boolean в контракте.
  test('POST defaults carousel to 0; POST with carousel: true stores 1', async () => {
    const off = (await (await post({ subcategory_id: subcategoryId, title: 'A' })).json()) as {
      carousel: number
    }
    expect(off.carousel).toBe(0)
    const on = (await (
      await post({ subcategory_id: subcategoryId, title: 'B', carousel: true })
    ).json()) as { carousel: number }
    expect(on.carousel).toBe(1)
  })

  test('PATCH toggles carousel both ways and leaves it alone when omitted', async () => {
    const work = (await (await post({ subcategory_id: subcategoryId, title: 'W' })).json()) as {
      id: number
    }
    const patch = (body: unknown) =>
      app.handle(
        req(`/admin/works/${work.id}`, {
          method: 'PATCH',
          headers: jsonHeaders(),
          body: JSON.stringify(body),
        }),
      )
    expect(((await (await patch({ carousel: true })).json()) as { carousel: number }).carousel).toBe(1)
    // Патч без флага не должен его сбрасывать
    expect(
      ((await (await patch({ title: 'Другое' })).json()) as { carousel: number }).carousel,
    ).toBe(1)
    expect(((await (await patch({ carousel: false })).json()) as { carousel: number }).carousel).toBe(
      0,
    )
  })

  test('a non-boolean carousel → 400', async () => {
    const work = (await (await post({ subcategory_id: subcategoryId, title: 'W' })).json()) as {
      id: number
    }
    const res = await app.handle(
      req(`/admin/works/${work.id}`, {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify({ carousel: 1 }),
      }),
    )
    expect(res.status).toBe(400)
    expect(ctx.repos.work.getById(work.id)?.carousel).toBe(0)
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

// Теги работы (§5.5): PATCH `/admin/works/:id` c `tag_ids` — полная замена набора.
describe('admin works tag_ids', () => {
  let ctx: TestCtx
  let app: ReturnType<typeof adminWorkRoutes>
  let publicApp: ReturnType<typeof publicRoutes>
  let workId: number
  let tagA: number
  let tagB: number
  let tagC: number

  beforeEach(() => {
    ctx = makeCtx()
    app = adminWorkRoutes(ctx.deps)
    publicApp = publicRoutes(ctx.db)
    const cat = ctx.repos.category.create({ slug: 'cat', title: 'Кат' })
    const sub = ctx.repos.subcategory.create({ category_id: cat.id, slug: 'sub', title: 'Под' })
    workId = ctx.repos.work.create({ subcategory_id: sub.id, slug: 'w', title: 'W' }).id
    tagA = ctx.repos.tag.create({ slug: 'a', title: 'A', sort_order: 0 }).id
    tagB = ctx.repos.tag.create({ slug: 'b', title: 'B', sort_order: 1 }).id
    tagC = ctx.repos.tag.create({ slug: 'c', title: 'C', sort_order: 2 }).id
  })

  const patch = (body: unknown, id: number = workId) =>
    app.handle(
      req(`/admin/works/${id}`, {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify(body),
      }),
    )

  test('tag_ids replaces the whole set', async () => {
    expect((await patch({ tag_ids: [tagA, tagB] })).status).toBe(200)
    expect(ctx.repos.tag.listTagIdsByWork(workId)).toEqual([tagA, tagB])

    expect((await patch({ tag_ids: [tagC] })).status).toBe(200)
    expect(ctx.repos.tag.listTagIdsByWork(workId)).toEqual([tagC])
    expect(ctx.mutationCount()).toBe(2)
  })

  test('an empty tag_ids clears every tag', async () => {
    await patch({ tag_ids: [tagA, tagB] })
    expect((await patch({ tag_ids: [] })).status).toBe(200)
    expect(ctx.repos.tag.listTagIdsByWork(workId)).toEqual([])
  })

  test('omitting tag_ids leaves the set untouched', async () => {
    await patch({ tag_ids: [tagA] })
    expect((await patch({ title: 'Другое' })).status).toBe(200)
    expect(ctx.repos.tag.listTagIdsByWork(workId)).toEqual([tagA])
  })

  test('a non-existent tag id → 400, neither tags nor the work change', async () => {
    await patch({ tag_ids: [tagA] })
    const before = ctx.mutationCount()

    const res = await patch({ title: 'НЕ ДОЛЖНО СОХРАНИТЬСЯ', tag_ids: [tagB, 9999] })
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: string }).error).toBe('bad_request')
    expect(ctx.repos.tag.listTagIdsByWork(workId)).toEqual([tagA])
    expect(ctx.repos.work.getById(workId)?.title).toBe('W')
    expect(ctx.mutationCount()).toBe(before)
  })

  test('tag_ids that is not an array of ints → 400', async () => {
    expect((await patch({ tag_ids: 'nope' })).status).toBe(400)
    expect((await patch({ tag_ids: [1.5] })).status).toBe(400)
    expect(ctx.mutationCount()).toBe(0)
  })

  test('tag_ids works alongside the other patch fields', async () => {
    const res = await patch({ title: 'Новый заголовок', description: 'Текст', tag_ids: [tagB] })
    expect(res.status).toBe(200)
    const row = (await res.json()) as { title: string; description: string }
    expect(row.title).toBe('Новый заголовок')
    expect(row.description).toBe('Текст')
    expect(ctx.repos.tag.listTagIdsByWork(workId)).toEqual([tagB])
    expect(ctx.mutationCount()).toBe(1)
  })

  test('tag_ids on an unknown work → 404', async () => {
    expect((await patch({ tag_ids: [tagA] }, 9999)).status).toBe(404)
  })

  test('the public work detail reflects the new tag set', async () => {
    await patch({ tag_ids: [tagC, tagA] })
    const detail = (await (
      await publicApp.handle(req(`/works/by-id/${workId}`))
    ).json()) as WorkDetailById
    expect(detail.tag_ids).toEqual([tagA, tagC]) // порядок — по tag.sort_order
  })
})

import { beforeEach, describe, expect, test } from 'bun:test'
import { adminCategoryRoutes } from './categories.ts'
import { publicRoutes } from '../public.ts'
import type { FeaturedSection } from '../../dto.ts'
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

  // ── Контент секции категории (редизайн §4/§5.5) ───────────────────────────────────

  test('PATCH stores the section content fields', async () => {
    const created = (await (await post({ title: 'Кат' })).json()) as { id: number }
    const res = await app.handle(
      req(`/admin/categories/${created.id}`, {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify({
          kicker: 'КОММЕРЧЕСКАЯ ГРАФИКА',
          meta_role: 'SMM · ПРОМО-ГРАФИКА',
          period: '2023 — 2026',
          description_long: 'Полный текст для страницы категории.',
          display_variant: 'strip',
        }),
      }),
    )
    expect(res.status).toBe(200)
    const row = (await res.json()) as {
      kicker: string | null
      meta_role: string | null
      period: string | null
      description_long: string | null
      display_variant: string
    }
    expect(row.kicker).toBe('КОММЕРЧЕСКАЯ ГРАФИКА')
    expect(row.meta_role).toBe('SMM · ПРОМО-ГРАФИКА')
    expect(row.period).toBe('2023 — 2026')
    expect(row.description_long).toBe('Полный текст для страницы категории.')
    expect(row.display_variant).toBe('strip')
  })

  test('PATCH resets the content fields to null', async () => {
    const created = (await (await post({ title: 'Кат' })).json()) as { id: number }
    const patchBody = (body: unknown) =>
      app.handle(
        req(`/admin/categories/${created.id}`, {
          method: 'PATCH',
          headers: jsonHeaders(),
          body: JSON.stringify(body),
        }),
      )
    await patchBody({ kicker: 'K', meta_role: 'M', period: 'P', description_long: 'D' })
    const row = (await (
      await patchBody({ kicker: null, meta_role: null, period: null, description_long: null })
    ).json()) as Record<string, unknown>
    expect(row.kicker).toBeNull()
    expect(row.meta_role).toBeNull()
    expect(row.period).toBeNull()
    expect(row.description_long).toBeNull()
  })

  test('PATCH accepts every allowed display_variant', async () => {
    const created = (await (await post({ title: 'Кат' })).json()) as { id: number }
    for (const variant of ['showcase', 'strip', 'cards'] as const) {
      const row = (await (
        await app.handle(
          req(`/admin/categories/${created.id}`, {
            method: 'PATCH',
            headers: jsonHeaders(),
            body: JSON.stringify({ display_variant: variant }),
          }),
        )
      ).json()) as { display_variant: string }
      expect(row.display_variant).toBe(variant)
    }
  })

  test('PATCH with an unknown display_variant → 400 and the category is untouched', async () => {
    const created = (await (await post({ title: 'Кат' })).json()) as { id: number }
    const before = ctx.mutationCount()
    const res = await app.handle(
      req(`/admin/categories/${created.id}`, {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify({ display_variant: 'x', kicker: 'НЕ ДОЛЖЕН СОХРАНИТЬСЯ' }),
      }),
    )
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: string }).error).toBe('bad_request')
    const row = ctx.repos.category.getById(created.id)
    expect(row?.display_variant).toBe('showcase') // дефолт схемы
    expect(row?.kicker).toBeNull()
    expect(ctx.mutationCount()).toBe(before)
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

// Кураторская витрина категории (§5.5): проверяем сквозь публичный `/featured` — именно
// его читает корневая /projects, поэтому результат мутации виден там, а не в admin-GET.
describe('admin category featured showcase', () => {
  let ctx: TestCtx
  let app: ReturnType<typeof adminCategoryRoutes>
  let publicApp: ReturnType<typeof publicRoutes>
  let categoryId: number
  let otherCategoryId: number
  let works: number[]
  let foreignWorkId: number

  /** Работа с картинкой — только такие «видимы» для публичных листингов/витрины. */
  const makeWork = (subcategoryId: number, slug: string, sortOrder: number): number => {
    const work = ctx.repos.work.create({
      subcategory_id: subcategoryId,
      slug,
      title: slug.toUpperCase(),
      sort_order: sortOrder,
    })
    ctx.repos.image.create({
      work_id: work.id,
      key_base: `images/${work.id}/1`,
      width: 100,
      height: 100,
    })
    return work.id
  }

  beforeEach(() => {
    ctx = makeCtx()
    app = adminCategoryRoutes(ctx.deps)
    publicApp = publicRoutes(ctx.db)

    const cat = ctx.repos.category.create({ slug: 'cat', title: 'Кат', sort_order: 0 })
    categoryId = cat.id
    const sub = ctx.repos.subcategory.create({ category_id: cat.id, slug: 'sub', title: 'Под' })
    works = [makeWork(sub.id, 'w1', 0), makeWork(sub.id, 'w2', 1), makeWork(sub.id, 'w3', 2)]

    const other = ctx.repos.category.create({ slug: 'other', title: 'Другая', sort_order: 1 })
    otherCategoryId = other.id
    const otherSub = ctx.repos.subcategory.create({
      category_id: other.id,
      slug: 'osub',
      title: 'ОПод',
    })
    foreignWorkId = makeWork(otherSub.id, 'ow1', 0)
  })

  const setFeatured = (id: number | string, body: unknown, headers = jsonHeaders()) =>
    app.handle(
      req(`/admin/categories/${id}/featured`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),
      }),
    )

  const featured = async (): Promise<FeaturedSection[]> =>
    (await (await publicApp.handle(req('/featured'))).json()) as FeaturedSection[]

  const sectionOf = async (slug: string): Promise<FeaturedSection> => {
    const section = (await featured()).find((s) => s.cat === slug)
    if (!section) throw new Error(`section "${slug}" missing in /featured`)
    return section
  }

  test('PATCH sets the curated order, /featured reflects it', async () => {
    const [w1, , w3] = works
    const res = await setFeatured(categoryId, { work_ids: [w3, w1] })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })

    const section = await sectionOf('cat')
    expect(section.curated).toBe(true)
    expect(section.works.map((w) => w.id)).toEqual([w3, w1])
    expect(ctx.mutationCount()).toBe(1)
  })

  test('a second PATCH replaces the previous showcase entirely', async () => {
    const [w1, w2, w3] = works
    await setFeatured(categoryId, { work_ids: [w3, w1] })
    await setFeatured(categoryId, { work_ids: [w2] })
    const section = await sectionOf('cat')
    expect(section.works.map((w) => w.id)).toEqual([w2])
  })

  test('an empty list clears the showcase → /featured falls back to the first works', async () => {
    const [w1, w2, w3] = works
    await setFeatured(categoryId, { work_ids: [w3] })
    expect((await sectionOf('cat')).curated).toBe(true)

    const res = await setFeatured(categoryId, { work_ids: [] })
    expect(res.status).toBe(200)
    const section = await sectionOf('cat')
    expect(section.curated).toBe(false)
    expect(section.works.map((w) => w.id)).toEqual([w1, w2, w3]) // fallback по sort_order
  })

  test('a work of another category → 400 and the showcase is unchanged', async () => {
    const [w1, , w3] = works
    await setFeatured(categoryId, { work_ids: [w3, w1] })
    const before = ctx.mutationCount()

    const res = await setFeatured(categoryId, { work_ids: [w1, foreignWorkId] })
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: string }).error).toBe('bad_request')
    expect((await sectionOf('cat')).works.map((w) => w.id)).toEqual([w3, w1])
    expect((await sectionOf('other')).curated).toBe(false) // чужая витрина тоже нетронута
    expect(ctx.mutationCount()).toBe(before)
  })

  test('a non-existent work id → 400', async () => {
    const res = await setFeatured(categoryId, { work_ids: [9999] })
    expect(res.status).toBe(400)
    expect((await sectionOf('cat')).curated).toBe(false)
    expect(ctx.mutationCount()).toBe(0)
  })

  test('duplicate work ids → 400', async () => {
    const [w1] = works
    const res = await setFeatured(categoryId, { work_ids: [w1, w1] })
    expect(res.status).toBe(400)
    expect(ctx.mutationCount()).toBe(0)
  })

  test('a malformed body (work_ids is not an array of ints) → 400', async () => {
    expect((await setFeatured(categoryId, { work_ids: 'nope' })).status).toBe(400)
    expect((await setFeatured(categoryId, {})).status).toBe(400)
    expect(ctx.mutationCount()).toBe(0)
  })

  test('an unknown category → 404', async () => {
    const res = await setFeatured(9999, { work_ids: [] })
    expect(res.status).toBe(404)
    expect(((await res.json()) as { error: string }).error).toBe('not_found')
    expect(ctx.mutationCount()).toBe(0)
  })

  test('showcases of different categories are independent', async () => {
    const [, , w3] = works
    await setFeatured(categoryId, { work_ids: [w3] })
    await setFeatured(otherCategoryId, { work_ids: [foreignWorkId] })
    expect((await sectionOf('cat')).works.map((w) => w.id)).toEqual([w3])
    expect((await sectionOf('other')).works.map((w) => w.id)).toEqual([foreignWorkId])
  })
})

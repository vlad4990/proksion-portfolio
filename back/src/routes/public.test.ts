import { beforeEach, describe, expect, test } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { openDb } from '../db/index.ts'
import { createRepos, type Repos } from '../repos.ts'
import { seed } from '../seed.ts'
import { publicRoutes } from './public.ts'

/** Helper: fetch JSON body + status from the in-memory Elysia app. */
async function get(app: ReturnType<typeof publicRoutes>, path: string) {
  const res = await app.handle(new Request(`http://localhost${path}`))
  const body = res.status === 200 ? await res.json() : await res.json().catch(() => null)
  return { status: res.status, body }
}

describe('public routes (seeded)', () => {
  let db: Database
  let app: ReturnType<typeof publicRoutes>
  let repos: Repos

  beforeEach(() => {
    db = openDb(':memory:')
    seed(db)
    repos = createRepos(db)
    app = publicRoutes(db)
  })

  test('GET /health → 200 ok', async () => {
    const res = await app.handle(new Request('http://localhost/health'))
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('ok')
  })

  test('GET /categories → list with nested subcategories + work_count', async () => {
    const { status, body } = await get(app, '/categories')
    expect(status).toBe(200)
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBe(repos.category.list().length)
    const first = body[0]
    expect(typeof first.slug).toBe('string')
    expect(Array.isArray(first.subcategories)).toBe(true)
    expect(typeof first.subcategories[0].work_count).toBe('number')
    // work_count matches the data
    const cat = repos.category.getBySlug(first.slug)!
    const sub = repos.subcategory.list(cat.id)[0]!
    const navSub = first.subcategories.find((s: { slug: string }) => s.slug === sub.slug)
    expect(navSub.work_count).toBe(repos.work.list(sub.id).length)
  })

  test('GET /categories ordered by sort_order', async () => {
    const { body } = await get(app, '/categories')
    const orders = body.map((c: { sort_order: number }) => c.sort_order)
    expect([...orders]).toEqual([...orders].sort((a, b) => a - b))
  })

  test('GET /categories/:cat → single category + subcategories', async () => {
    const cat = repos.category.list()[0]!
    const { status, body } = await get(app, `/categories/${cat.slug}`)
    expect(status).toBe(200)
    expect(body.slug).toBe(cat.slug)
    expect(Array.isArray(body.subcategories)).toBe(true)
  })

  test('GET /categories/:cat → 404 for unknown slug', async () => {
    const { status } = await get(app, '/categories/does-not-exist')
    expect(status).toBe(404)
  })

  test('GET /categories/:cat/:sub → tiles strictly { id, slug, title, src, w, h, cat, sub, variants }', async () => {
    const cat = repos.category.list()[0]!
    const sub = repos.subcategory.list(cat.id)[0]!
    const { status, body } = await get(app, `/categories/${cat.slug}/${sub.slug}`)
    expect(status).toBe(200)
    expect(body.category.slug).toBe(cat.slug)
    expect(body.subcategory.slug).toBe(sub.slug)
    expect(body.works.length).toBe(repos.work.list(sub.id).length)
    for (const tile of body.works) {
      expect(Object.keys(tile).sort()).toEqual([
        'cat',
        'h',
        'id',
        'slug',
        'src',
        'sub',
        'title',
        'variants',
        'w',
      ])
      expect(typeof tile.id).toBe('number')
      expect(typeof tile.slug).toBe('string')
      expect(typeof tile.w).toBe('number')
      expect(typeof tile.h).toBe('number')
      expect(tile.src).toMatch(/^\/media\/.+\/thumb\.(avif|webp|jpg)$/)
      expect(tile.cat).toBe(cat.slug)
      expect(tile.sub).toBe(sub.slug)
      // thumb-варианты для <picture> в листинге; jpg совпадает с fallback-src
      for (const fmt of ['avif', 'webp', 'jpg']) {
        expect(tile.variants[fmt]).toMatch(new RegExp(`^/media/.+/thumb\\.${fmt}$`))
      }
      expect(tile.variants.jpg).toBe(tile.src)
    }
  })

  test('GET /categories/:cat/:sub → 404 for unknown cat or sub', async () => {
    const cat = repos.category.list()[0]!
    const sub = repos.subcategory.list(cat.id)[0]!
    expect((await get(app, `/categories/nope/${sub.slug}`)).status).toBe(404)
    expect((await get(app, `/categories/${cat.slug}/nope`)).status).toBe(404)
  })

  test('listing is ordered by sort_order', async () => {
    // craft a fresh subcategory with out-of-order sort_order
    const cat = repos.category.create({ slug: 'order-cat', title: 'Порядок' })
    const sub = repos.subcategory.create({ category_id: cat.id, slug: 'order-sub', title: 'Под' })
    const mk = (slug: string, order: number) => {
      const w = repos.work.create({ subcategory_id: sub.id, slug, title: slug, sort_order: order })
      const img = repos.image.create({ work_id: w.id, key_base: 'tmp', width: 10, height: 10 })
      repos.image.update(img.id, { key_base: `images/${w.id}/${img.id}` })
      repos.work.update(w.id, { cover_image_id: img.id })
      return w
    }
    const c = mk('c', 2)
    const a = mk('a', 0)
    const b = mk('b', 1)
    const { body } = await get(app, `/categories/${cat.slug}/${sub.slug}`)
    expect(body.works.map((t: { id: number }) => t.id)).toEqual([a.id, b.id, c.id])
  })

  test('GET /works/:cat/:sub/:work → detail with images (variants, w/h, alt, sort_order)', async () => {
    const cat = repos.category.list()[0]!
    const sub = repos.subcategory.list(cat.id)[0]!
    const work = repos.work.list(sub.id)[0]!
    const { status, body } = await get(app, `/works/${cat.slug}/${sub.slug}/${work.slug}`)
    expect(status).toBe(200)
    expect(body.id).toBe(work.id)
    expect(body.slug).toBe(work.slug)
    expect('description' in body).toBe(true)
    expect(Array.isArray(body.images)).toBe(true)
    expect(body.images.length).toBeGreaterThan(0)
    const img = body.images[0]
    expect(typeof img.w).toBe('number')
    expect(typeof img.h).toBe('number')
    expect('alt' in img).toBe(true)
    expect(typeof img.sort_order).toBe('number')
    for (const variant of ['thumb', 'full']) {
      for (const fmt of ['avif', 'webp', 'jpg']) {
        expect(img.variants[variant][fmt]).toBe(`/media/${repos.image.list(work.id)[0]!.key_base}/${variant}.${fmt}`)
      }
    }
  })

  test('detail images carry lqip only when set', async () => {
    // find a seeded image with lqip and one without via the API
    const cat = repos.category.list()[0]!
    let sawWithLqip = false
    let sawWithoutLqip = false
    for (const sub of repos.subcategory.list(cat.id)) {
      for (const work of repos.work.list(sub.id)) {
        const { body } = await get(app, `/works/${cat.slug}/${sub.slug}/${work.slug}`)
        for (const [i, img] of body.images.entries()) {
          const raw = repos.image.list(work.id)[i]!
          if (raw.lqip !== null) {
            sawWithLqip = true
            expect(img.lqip).toBe(raw.lqip)
          } else {
            sawWithoutLqip = true
            expect('lqip' in img).toBe(false)
          }
        }
      }
    }
    expect(sawWithLqip).toBe(true)
    expect(sawWithoutLqip).toBe(true)
  })

  test('GET /works/:cat/:sub/:work → 404 for unknown work', async () => {
    const cat = repos.category.list()[0]!
    const sub = repos.subcategory.list(cat.id)[0]!
    expect((await get(app, `/works/${cat.slug}/${sub.slug}/nope`)).status).toBe(404)
    expect((await get(app, `/works/${cat.slug}/nope/x`)).status).toBe(404)
    expect((await get(app, `/works/nope/x/y`)).status).toBe(404)
  })

  test('GET /works/by-id/:id → detail by id with cat/sub slugs + same detail shape', async () => {
    const cat = repos.category.list()[0]!
    const sub = repos.subcategory.list(cat.id)[0]!
    const work = repos.work.list(sub.id)[0]!
    const { status, body } = await get(app, `/works/by-id/${work.id}`)
    expect(status).toBe(200)
    expect(body.id).toBe(work.id)
    expect(body.slug).toBe(work.slug)
    expect(body.cat).toBe(cat.slug)
    expect(body.sub).toBe(sub.slug)
    expect(Array.isArray(body.images)).toBe(true)
    expect(body.images.length).toBe(repos.image.list(work.id).length)
    // тот же контент, что и by-slug эндпоинт (описание + картинки)
    const bySlug = (await get(app, `/works/${cat.slug}/${sub.slug}/${work.slug}`)).body
    expect(body.description).toBe(bySlug.description)
    expect(body.images).toEqual(bySlug.images)
  })

  test('GET /works/by-id/:id → resolves cat/sub for a work in a non-first subcategory', async () => {
    // берём работу из последней категории/подкатегории — проверяем корректный резолв пути
    const cat = repos.category.list().at(-1)!
    const sub = repos.subcategory.list(cat.id).at(-1)!
    const work = repos.work.list(sub.id).at(-1)!
    const { status, body } = await get(app, `/works/by-id/${work.id}`)
    expect(status).toBe(200)
    expect(body.cat).toBe(cat.slug)
    expect(body.sub).toBe(sub.slug)
  })

  test('GET /works/by-id/:id → 404 for nonexistent id', async () => {
    expect((await get(app, '/works/by-id/999999')).status).toBe(404)
  })

  test('GET /works/by-id/:id → 404 for non-numeric / invalid id', async () => {
    expect((await get(app, '/works/by-id/abc')).status).toBe(404)
    expect((await get(app, '/works/by-id/1.5')).status).toBe(404)
    expect((await get(app, '/works/by-id/0')).status).toBe(404)
    expect((await get(app, '/works/by-id/-3')).status).toBe(404)
  })

  test('GET /works → paginated tiles with total/limit/offset', async () => {
    const { status, body } = await get(app, '/works')
    expect(status).toBe(200)
    expect(typeof body.total).toBe('number')
    expect(body.total).toBeGreaterThan(0)
    expect(body.limit).toBe(24)
    expect(body.offset).toBe(0)
    expect(Array.isArray(body.items)).toBe(true)
    for (const tile of body.items) {
      expect(Object.keys(tile).sort()).toEqual([
        'cat',
        'h',
        'id',
        'slug',
        'src',
        'sub',
        'title',
        'variants',
        'w',
      ])
    }
    // слаги глобального листинга сверяем с резолвом by-id (один источник правды пути)
    const first = body.items[0]
    const byId = (await get(app, `/works/by-id/${first.id}`)).body
    expect(first.cat).toBe(byId.cat)
    expect(first.sub).toBe(byId.sub)
  })
})

describe('public /works pagination boundaries', () => {
  let db: Database
  let app: ReturnType<typeof publicRoutes>

  beforeEach(() => {
    db = openDb(':memory:')
    const repos = createRepos(db)
    const cat = repos.category.create({ slug: 'c', title: 'C' })
    const sub = repos.subcategory.create({ category_id: cat.id, slug: 's', title: 'S' })
    for (let i = 0; i < 5; i++) {
      const w = repos.work.create({ subcategory_id: sub.id, slug: `w${i}`, title: `W${i}`, sort_order: i })
      const img = repos.image.create({ work_id: w.id, key_base: 'tmp', width: 10, height: 10 })
      repos.image.update(img.id, { key_base: `images/${w.id}/${img.id}` })
      repos.work.update(w.id, { cover_image_id: img.id })
    }
    app = publicRoutes(db)
  })

  test('first page', async () => {
    const { body } = await get(app, '/works?limit=2&offset=0')
    expect(body.items.length).toBe(2)
    expect(body.total).toBe(5)
    expect(body.limit).toBe(2)
    expect(body.offset).toBe(0)
  })

  test('last (partial) page', async () => {
    const { body } = await get(app, '/works?limit=2&offset=4')
    expect(body.items.length).toBe(1)
    expect(body.total).toBe(5)
  })

  test('empty page beyond the end', async () => {
    const { body } = await get(app, '/works?limit=2&offset=10')
    expect(body.items.length).toBe(0)
    expect(body.total).toBe(5)
  })

  test('limit is clamped to the max, bad values fall back to defaults', async () => {
    expect((await get(app, '/works?limit=9999')).body.limit).toBe(100)
    expect((await get(app, '/works?limit=0')).body.limit).toBe(24)
    expect((await get(app, '/works?limit=abc')).body.limit).toBe(24)
    expect((await get(app, '/works?offset=-3')).body.offset).toBe(0)
  })
})

// ── Редизайн листинга (docs/projects-redesign.md §5, задача 14) ──────────────────

/** Видимые (с картинками) работы подкатегории — то, что реально попадает в тайлы. */
function visibleWorks(repos: Repos, subcategoryId: number) {
  return repos.work.list(subcategoryId).filter((w) => repos.image.list(w.id).length > 0)
}

/** Видимые работы всей категории в порядке обхода дерева. */
function visibleCategoryWorks(repos: Repos, categoryId: number) {
  return repos.subcategory.list(categoryId).flatMap((sub) => visibleWorks(repos, sub.id))
}

/** Работа с одной картинкой (сразу видимая в листинге). */
function makeVisibleWork(repos: Repos, subcategoryId: number, slug: string, sortOrder = 0) {
  const work = repos.work.create({
    subcategory_id: subcategoryId,
    slug,
    title: slug.toUpperCase(),
    sort_order: sortOrder,
  })
  const img = repos.image.create({ work_id: work.id, key_base: 'tmp', width: 10, height: 10 })
  repos.image.update(img.id, { key_base: `images/${work.id}/${img.id}` })
  repos.work.update(work.id, { cover_image_id: img.id })
  return work
}

const TILE_KEYS = ['cat', 'h', 'id', 'slug', 'src', 'sub', 'title', 'variants', 'w']

describe('GET /categories — контент секции и честные счётчики (§5.2)', () => {
  let db: Database
  let app: ReturnType<typeof publicRoutes>
  let repos: Repos

  beforeEach(() => {
    db = openDb(':memory:')
    seed(db)
    repos = createRepos(db)
    app = publicRoutes(db)
  })

  test('форма категории: мета редизайна + work_count/updated_max', async () => {
    const { status, body } = await get(app, '/categories')
    expect(status).toBe(200)
    for (const nav of body) {
      expect(Object.keys(nav).sort()).toEqual([
        'description',
        'display_variant',
        'id',
        'kicker',
        'meta_role',
        'period',
        'slug',
        'sort_order',
        'subcategories',
        'title',
        'updated_max',
        'work_count',
      ])
      expect(['showcase', 'strip', 'cards']).toContain(nav.display_variant)
    }
    // сид заполняет меты у первой категории и оставляет пустыми у последней
    const withMeta = body.find((c: { kicker: string | null }) => c.kicker !== null)
    expect(typeof withMeta.kicker).toBe('string')
    expect(typeof withMeta.meta_role).toBe('string')
    expect(typeof withMeta.period).toBe('string')
  })

  test('work_count категории = сумме видимых работ подкатегорий; updated_max — их максимум', async () => {
    const { body } = await get(app, '/categories')
    for (const nav of body) {
      const cat = repos.category.getBySlug(nav.slug)!
      const works = visibleCategoryWorks(repos, cat.id)
      expect(nav.work_count).toBe(works.length)
      expect(nav.work_count).toBe(
        nav.subcategories.reduce((sum: number, s: { work_count: number }) => sum + s.work_count, 0),
      )
      // updated_max — ISO-строка (в БД timestamp'ы лежат как `YYYY-MM-DD HH:MM:SS`)
      const rawMax = works.map((w) => w.updated_at).sort().at(-1)
      expect(nav.updated_max).toBe(rawMax === undefined ? null : `${rawMax.replace(' ', 'T')}Z`)
      if (nav.updated_max !== null) {
        expect(nav.updated_max).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
        expect(Number.isNaN(new Date(nav.updated_max).getTime())).toBe(false)
      }
      for (const subNav of nav.subcategories) {
        const sub = repos.subcategory.getBySlug(cat.id, subNav.slug)!
        expect(subNav.work_count).toBe(visibleWorks(repos, sub.id).length)
      }
    }
  })

  test('работа без картинок не попадает ни в счётчик подкатегории, ни в счётчик категории', async () => {
    const cat = repos.category.list()[0]!
    const sub = repos.subcategory.list(cat.id)[0]!
    const before = (await get(app, '/categories')).body.find(
      (c: { slug: string }) => c.slug === cat.slug,
    )

    repos.work.create({ subcategory_id: sub.id, slug: 'bez-kartinok', title: 'Без картинок' })

    const after = (await get(app, '/categories')).body.find(
      (c: { slug: string }) => c.slug === cat.slug,
    )
    expect(after.work_count).toBe(before.work_count)
    const subNav = after.subcategories.find((s: { slug: string }) => s.slug === sub.slug)
    expect(subNav.work_count).toBe(
      before.subcategories.find((s: { slug: string }) => s.slug === sub.slug).work_count,
    )
    // счётчик тайлов и счётчик навигации сходятся
    const listing = (await get(app, `/categories/${cat.slug}/${sub.slug}`)).body
    expect(subNav.work_count).toBe(listing.works.length)
  })

  test('категория без видимых работ → work_count 0, updated_max null', async () => {
    const cat = repos.category.create({ slug: 'pustaya', title: 'Пустая', sort_order: 99 })
    const sub = repos.subcategory.create({ category_id: cat.id, slug: 'pusto', title: 'Пусто' })
    repos.work.create({ subcategory_id: sub.id, slug: 'nevidimka', title: 'Невидимка' })

    const { body } = await get(app, '/categories/pustaya')
    expect(body.work_count).toBe(0)
    expect(body.updated_max).toBeNull()
    expect(body.subcategories[0].work_count).toBe(0)
  })

  test('GET /categories/:cat дополнительно отдаёт description_long', async () => {
    const cat = repos.category.list()[0]!
    const { status, body } = await get(app, `/categories/${cat.slug}`)
    expect(status).toBe(200)
    expect('description_long' in body).toBe(true)
    expect(body.description_long).toBe(repos.category.getById(cat.id)!.description_long)
    // в списке категорий длинного описания нет (он только для страницы категории)
    const list = (await get(app, '/categories')).body
    expect('description_long' in list[0]).toBe(false)
  })
})

describe('GET /tags (§5.3)', () => {
  let db: Database
  let app: ReturnType<typeof publicRoutes>
  let repos: Repos

  beforeEach(() => {
    db = openDb(':memory:')
    seed(db)
    repos = createRepos(db)
    app = publicRoutes(db)
  })

  test('форма { id, slug, title, sort_order, work_count } и порядок sort_order, id', async () => {
    const { status, body } = await get(app, '/tags')
    expect(status).toBe(200)
    expect(body.length).toBe(repos.tag.list().length)
    for (const tag of body) {
      expect(Object.keys(tag).sort()).toEqual(['id', 'slug', 'sort_order', 'title', 'work_count'])
    }
    expect(body.map((t: { slug: string }) => t.slug)).toEqual(
      repos.tag.list().map((t) => t.slug),
    )
    // порядок именно sort_order → id (перекрёстная проверка с обратными sort_order)
    const [first, second] = repos.tag.list()
    repos.tag.update(first!.id, { sort_order: 10 })
    repos.tag.update(second!.id, { sort_order: -1 })
    const reordered = (await get(app, '/tags')).body.map((t: { id: number }) => t.id)
    expect(reordered[0]).toBe(second!.id)
    expect(reordered.at(-1)).toBe(first!.id)
  })

  test('work_count считает только видимые работы', async () => {
    const { body } = await get(app, '/tags')
    for (const tagNav of body) {
      const tag = repos.tag.getBySlug(tagNav.slug)!
      const visible = repos.tag
        .listWorkIdsByTag(tag.id)
        .filter((workId) => repos.image.list(workId).length > 0)
      expect(tagNav.work_count).toBe(visible.length)
      expect(tagNav.work_count).toBeGreaterThan(0)
    }
  })

  test('работа без картинок с тегом счётчик не увеличивает', async () => {
    const tag = repos.tag.list()[0]!
    const before = (await get(app, '/tags')).body.find((t: { id: number }) => t.id === tag.id)
    const sub = repos.subcategory.list(repos.category.list()[0]!.id)[0]!
    const work = repos.work.create({ subcategory_id: sub.id, slug: 'nevidimka', title: null })
    repos.tag.setWorkTags(work.id, [tag.id])

    const after = (await get(app, '/tags')).body.find((t: { id: number }) => t.id === tag.id)
    expect(after.work_count).toBe(before.work_count)
  })

  test('тег без работ отдаётся с work_count: 0', async () => {
    const tag = repos.tag.create({ slug: 'pustoj', title: 'Пустой', sort_order: 99 })
    const { body } = await get(app, '/tags')
    const nav = body.find((t: { id: number }) => t.id === tag.id)
    expect(nav).toBeDefined()
    expect(nav.work_count).toBe(0)
  })

  test('пустая БД → []', async () => {
    const { status, body } = await get(publicRoutes(openDb(':memory:')), '/tags')
    expect(status).toBe(200)
    expect(body).toEqual([])
  })
})

describe('GET /featured (§5.3)', () => {
  let db: Database
  let app: ReturnType<typeof publicRoutes>
  let repos: Repos

  beforeEach(() => {
    db = openDb(':memory:')
    seed(db)
    repos = createRepos(db)
    app = publicRoutes(db)
  })

  test('секции по всем категориям в порядке sort_order', async () => {
    const { status, body } = await get(app, '/featured')
    expect(status).toBe(200)
    expect(body.map((s: { cat: string }) => s.cat)).toEqual(
      repos.category.list().map((c) => c.slug),
    )
    for (const section of body) {
      expect(Object.keys(section).sort()).toEqual(['cat', 'curated', 'works'])
      expect(typeof section.curated).toBe('boolean')
    }
  })

  test('кураторская витрина: порядок featured_order (0 = первый), curated: true', async () => {
    const cat = repos.category.list()[0]!
    const featured = repos.work.listFeatured(cat.id)
    expect(featured.length).toBeGreaterThan(1)
    const { body } = await get(app, '/featured')
    const section = body.find((s: { cat: string }) => s.cat === cat.slug)
    expect(section.curated).toBe(true)
    expect(section.works.map((w: { id: number }) => w.id)).toEqual(featured.map((w) => w.id))
    expect(section.works[0].id).toBe(featured.find((w) => w.featured_order === 0)!.id)
  })

  test('FeaturedWork = тайл + description', async () => {
    const { body } = await get(app, '/featured')
    const work = body[0].works[0]
    expect(Object.keys(work).sort()).toEqual([...TILE_KEYS, 'description'].sort())
    expect(work.description).toBe(repos.work.getById(work.id)!.description)
  })

  test('категория без витрины → fallback: первые 8 видимых работ, curated: false', async () => {
    // категория с 10 видимыми работами в двух подкатегориях и без featured_order
    const cat = repos.category.create({ slug: 'bez-vitriny', title: 'Без витрины', sort_order: 50 })
    const subB = repos.subcategory.create({
      category_id: cat.id,
      slug: 'b',
      title: 'Б',
      sort_order: 1,
    })
    const subA = repos.subcategory.create({
      category_id: cat.id,
      slug: 'a',
      title: 'А',
      sort_order: 0,
    })
    const expected = [
      ...[0, 1, 2, 3, 4].map((i) => makeVisibleWork(repos, subA.id, `a${i}`, i)),
      ...[0, 1, 2, 3, 4].map((i) => makeVisibleWork(repos, subB.id, `b${i}`, i)),
    ]

    const { body } = await get(app, '/featured')
    const section = body.find((s: { cat: string }) => s.cat === cat.slug)
    expect(section.curated).toBe(false)
    expect(section.works.length).toBe(8)
    expect(section.works.map((w: { id: number }) => w.id)).toEqual(
      expected.slice(0, 8).map((w) => w.id),
    )
  })

  test('категория вообще без видимых работ → works: []', async () => {
    const cat = repos.category.create({ slug: 'pustaya', title: 'Пустая', sort_order: 60 })
    const sub = repos.subcategory.create({ category_id: cat.id, slug: 's', title: 'С' })
    repos.work.create({ subcategory_id: sub.id, slug: 'nevidimka', title: null })

    const { body } = await get(app, '/featured')
    const section = body.find((s: { cat: string }) => s.cat === cat.slug)
    expect(section.works).toEqual([])
    expect(section.curated).toBe(false)
  })

  test('работа витрины без картинок в витрину не попадает', async () => {
    const cat = repos.category.list()[0]!
    const sub = repos.subcategory.list(cat.id)[0]!
    const invisible = repos.work.create({ subcategory_id: sub.id, slug: 'nevidimka', title: null })
    const curated = repos.work.listFeatured(cat.id)
    repos.work.setFeatured(cat.id, [invisible.id, ...curated.map((w) => w.id)])

    const { body } = await get(app, '/featured')
    const section = body.find((s: { cat: string }) => s.cat === cat.slug)
    expect(section.curated).toBe(true)
    expect(section.works.map((w: { id: number }) => w.id)).toEqual(curated.map((w) => w.id))
  })

  test('пустая БД → []', async () => {
    const { status, body } = await get(publicRoutes(openDb(':memory:')), '/featured')
    expect(status).toBe(200)
    expect(body).toEqual([])
  })
})

describe('GET /works — фильтры и SQL-пагинация (§5.4)', () => {
  let db: Database
  let app: ReturnType<typeof publicRoutes>
  let repos: Repos

  beforeEach(() => {
    db = openDb(':memory:')
    seed(db)
    repos = createRepos(db)
    app = publicRoutes(db)
  })

  test('без фильтров: порядок category → subcategory → work по sort_order (как раньше)', async () => {
    const expected = repos.category
      .list()
      .flatMap((cat) => visibleCategoryWorks(repos, cat.id))
      .map((w) => w.id)
    const { body } = await get(app, '/works?limit=100')
    expect(body.items.map((t: { id: number }) => t.id)).toEqual(expected)
    expect(body.total).toBe(expected.length)
  })

  test('?category= — только работы категории', async () => {
    const cat = repos.category.list()[0]!
    const expected = visibleCategoryWorks(repos, cat.id).map((w) => w.id)
    const { status, body } = await get(app, `/works?category=${cat.slug}`)
    expect(status).toBe(200)
    expect(body.total).toBe(expected.length)
    expect(body.items.map((t: { id: number }) => t.id)).toEqual(expected)
    expect(body.items.every((t: { cat: string }) => t.cat === cat.slug)).toBe(true)
  })

  test('?category=&subcategory= — только работы подкатегории', async () => {
    const cat = repos.category.list()[0]!
    const sub = repos.subcategory.list(cat.id).at(-1)!
    const expected = visibleWorks(repos, sub.id).map((w) => w.id)
    const { body } = await get(app, `/works?category=${cat.slug}&subcategory=${sub.slug}`)
    expect(body.total).toBe(expected.length)
    expect(body.items.map((t: { id: number }) => t.id)).toEqual(expected)
    expect(body.items.every((t: { sub: string }) => t.sub === sub.slug)).toBe(true)
  })

  test('?tag= — работы с тегом по всем категориям', async () => {
    const tag = repos.tag.list()[0]!
    const tagged = new Set(repos.tag.listWorkIdsByTag(tag.id))
    const expected = repos.category
      .list()
      .flatMap((cat) => visibleCategoryWorks(repos, cat.id))
      .filter((w) => tagged.has(w.id))
      .map((w) => w.id)
    expect(expected.length).toBeGreaterThan(1)
    const { body } = await get(app, `/works?tag=${tag.slug}`)
    expect(body.total).toBe(expected.length)
    expect(body.items.map((t: { id: number }) => t.id)).toEqual(expected)
  })

  test('?category=&tag= — пересечение фильтров', async () => {
    const tag = repos.tag.list()[0]!
    const tagged = new Set(repos.tag.listWorkIdsByTag(tag.id))
    const cat = repos.category.list()[0]!
    const expected = visibleCategoryWorks(repos, cat.id)
      .filter((w) => tagged.has(w.id))
      .map((w) => w.id)
    expect(expected.length).toBeGreaterThan(0)
    const { body } = await get(app, `/works?category=${cat.slug}&tag=${tag.slug}`)
    expect(body.total).toBe(expected.length)
    expect(body.items.map((t: { id: number }) => t.id)).toEqual(expected)
  })

  test('все три фильтра вместе', async () => {
    const tag = repos.tag.list()[0]!
    const tagged = new Set(repos.tag.listWorkIdsByTag(tag.id))
    const cat = repos.category.list()[0]!
    const sub = repos.subcategory
      .list(cat.id)
      .find((s) => visibleWorks(repos, s.id).some((w) => tagged.has(w.id)))!
    const expected = visibleWorks(repos, sub.id)
      .filter((w) => tagged.has(w.id))
      .map((w) => w.id)
    const { body } = await get(
      app,
      `/works?category=${cat.slug}&subcategory=${sub.slug}&tag=${tag.slug}`,
    )
    expect(body.total).toBe(expected.length)
    expect(body.items.map((t: { id: number }) => t.id)).toEqual(expected)
  })

  test('неизвестный слаг фильтра → { items: [], total: 0 } со статусом 200', async () => {
    const cat = repos.category.list()[0]!
    for (const qs of [
      'category=net-takoj',
      `category=${cat.slug}&subcategory=net-takoj`,
      'tag=net-takogo',
      `category=${cat.slug}&tag=net-takogo`,
    ]) {
      const { status, body } = await get(app, `/works?${qs}`)
      expect(status).toBe(200)
      expect(body.items).toEqual([])
      expect(body.total).toBe(0)
    }
  })

  test('subcategory без category — неразрешимый фильтр → пустая страница', async () => {
    const cat = repos.category.list()[0]!
    const sub = repos.subcategory.list(cat.id)[0]!
    const { status, body } = await get(app, `/works?subcategory=${sub.slug}`)
    expect(status).toBe(200)
    expect(body.items).toEqual([])
    expect(body.total).toBe(0)
  })

  test('пустые значения параметров игнорируются (фильтр не применяется)', async () => {
    const all = (await get(app, '/works?limit=100')).body
    const { body } = await get(app, '/works?limit=100&category=&subcategory=&tag=')
    expect(body.total).toBe(all.total)
    expect(body.items.map((t: { id: number }) => t.id)).toEqual(
      all.items.map((t: { id: number }) => t.id),
    )
  })

  test('пагинация внутри фильтра: total по фильтру, offset за концом → пустые items', async () => {
    const cat = repos.category.list()[0]!
    const total = visibleCategoryWorks(repos, cat.id).length
    expect(total).toBeGreaterThan(1)

    const firstPage = (await get(app, `/works?category=${cat.slug}&limit=1&offset=0`)).body
    expect(firstPage.total).toBe(total)
    expect(firstPage.items.length).toBe(1)
    expect(firstPage.limit).toBe(1)

    const secondPage = (await get(app, `/works?category=${cat.slug}&limit=1&offset=1`)).body
    expect(secondPage.total).toBe(total)
    expect(secondPage.items[0].id).not.toBe(firstPage.items[0].id)

    const beyond = (await get(app, `/works?category=${cat.slug}&limit=10&offset=${total}`)).body
    expect(beyond.items).toEqual([])
    expect(beyond.total).toBe(total)
    expect(beyond.offset).toBe(total)
  })

  test('работа без картинок не попадает ни в items, ни в total', async () => {
    const before = (await get(app, '/works?limit=100')).body
    const cat = repos.category.list()[0]!
    const sub = repos.subcategory.list(cat.id)[0]!
    repos.work.create({ subcategory_id: sub.id, slug: 'nevidimka', title: null })
    const after = (await get(app, '/works?limit=100')).body
    expect(after.total).toBe(before.total)
    expect(after.items.map((t: { id: number }) => t.id)).toEqual(
      before.items.map((t: { id: number }) => t.id),
    )
  })

  test('cover: тайл берёт cover_image_id, иначе первую картинку работы', async () => {
    const cat = repos.category.create({ slug: 'cover-cat', title: 'Cover', sort_order: 70 })
    const sub = repos.subcategory.create({ category_id: cat.id, slug: 'cover-sub', title: 'C' })
    // работа без cover_image_id → первая картинка по sort_order
    const noCover = repos.work.create({ subcategory_id: sub.id, slug: 'no-cover', sort_order: 0 })
    const second = repos.image.create({ work_id: noCover.id, key_base: 'tmp', width: 20, height: 10, sort_order: 1 })
    repos.image.update(second.id, { key_base: `images/${noCover.id}/${second.id}` })
    const first = repos.image.create({ work_id: noCover.id, key_base: 'tmp', width: 30, height: 10, sort_order: 0 })
    repos.image.update(first.id, { key_base: `images/${noCover.id}/${first.id}` })
    // работа с явным cover — вторая картинка
    const withCover = repos.work.create({ subcategory_id: sub.id, slug: 'with-cover', sort_order: 1 })
    const a = repos.image.create({ work_id: withCover.id, key_base: 'tmp', width: 40, height: 10, sort_order: 0 })
    repos.image.update(a.id, { key_base: `images/${withCover.id}/${a.id}` })
    const b = repos.image.create({ work_id: withCover.id, key_base: 'tmp', width: 50, height: 10, sort_order: 1 })
    repos.image.update(b.id, { key_base: `images/${withCover.id}/${b.id}` })
    repos.work.update(withCover.id, { cover_image_id: b.id })

    const { body } = await get(app, `/works?category=${cat.slug}`)
    expect(body.items.map((t: { src: string }) => t.src)).toEqual([
      `/media/images/${noCover.id}/${first.id}/thumb.jpg`,
      `/media/images/${withCover.id}/${b.id}/thumb.jpg`,
    ])
    expect(body.items[0].w).toBe(30)
    expect(body.items[1].w).toBe(50)
  })

  test('тайл фильтрованного листинга совпадает с тайлом листинга подкатегории', async () => {
    const cat = repos.category.list()[0]!
    const sub = repos.subcategory.list(cat.id)[0]!
    const listing = (await get(app, `/categories/${cat.slug}/${sub.slug}`)).body
    const filtered = (await get(app, `/works?category=${cat.slug}&subcategory=${sub.slug}`)).body
    expect(filtered.items).toEqual(listing.works)
  })
})

describe('tag_ids в детали работы (§5.5)', () => {
  let db: Database
  let app: ReturnType<typeof publicRoutes>
  let repos: Repos

  beforeEach(() => {
    db = openDb(':memory:')
    seed(db)
    repos = createRepos(db)
    app = publicRoutes(db)
  })

  test('WorkDetail и WorkDetailById несут tag_ids в порядке tag.sort_order, tag.id', async () => {
    const cat = repos.category.list()[0]!
    const sub = repos.subcategory.list(cat.id).at(-1)!
    const work = repos.work.list(sub.id)[0]!
    const expected = repos.tag.listTagIdsByWork(work.id)
    expect(expected.length).toBeGreaterThan(1)

    const bySlug = (await get(app, `/works/${cat.slug}/${sub.slug}/${work.slug}`)).body
    expect(bySlug.tag_ids).toEqual(expected)
    const byId = (await get(app, `/works/by-id/${work.id}`)).body
    expect(byId.tag_ids).toEqual(expected)
  })

  test('работа без тегов → tag_ids: []', async () => {
    const cat = repos.category.list()[0]!
    const sub = repos.subcategory.list(cat.id)[0]!
    const work = repos.work.list(sub.id).find((w) => repos.tag.listTagIdsByWork(w.id).length === 0)!
    const { body } = await get(app, `/works/${cat.slug}/${sub.slug}/${work.slug}`)
    expect(body.tag_ids).toEqual([])
  })
})

describe('public /works empty db', () => {
  test('returns an empty page with total 0', async () => {
    const app = publicRoutes(openDb(':memory:'))
    const { status, body } = await get(app, '/works')
    expect(status).toBe(200)
    expect(body.items).toEqual([])
    expect(body.total).toBe(0)
  })
})

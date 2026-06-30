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

  test('GET /categories/:cat/:sub → tiles strictly { id, src, w, h }', async () => {
    const cat = repos.category.list()[0]!
    const sub = repos.subcategory.list(cat.id)[0]!
    const { status, body } = await get(app, `/categories/${cat.slug}/${sub.slug}`)
    expect(status).toBe(200)
    expect(body.category.slug).toBe(cat.slug)
    expect(body.subcategory.slug).toBe(sub.slug)
    expect(body.works.length).toBe(repos.work.list(sub.id).length)
    for (const tile of body.works) {
      expect(Object.keys(tile).sort()).toEqual(['h', 'id', 'src', 'w'])
      expect(typeof tile.id).toBe('number')
      expect(typeof tile.w).toBe('number')
      expect(typeof tile.h).toBe('number')
      expect(tile.src).toMatch(/^\/media\/.+\/thumb\.(avif|webp|jpg)$/)
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

  test('GET /works → paginated tiles with total/limit/offset', async () => {
    const { status, body } = await get(app, '/works')
    expect(status).toBe(200)
    expect(typeof body.total).toBe('number')
    expect(body.total).toBeGreaterThan(0)
    expect(body.limit).toBe(60)
    expect(body.offset).toBe(0)
    expect(Array.isArray(body.items)).toBe(true)
    for (const tile of body.items) {
      expect(Object.keys(tile).sort()).toEqual(['h', 'id', 'src', 'w'])
    }
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
    expect((await get(app, '/works?limit=0')).body.limit).toBe(60)
    expect((await get(app, '/works?limit=abc')).body.limit).toBe(60)
    expect((await get(app, '/works?offset=-3')).body.offset).toBe(0)
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

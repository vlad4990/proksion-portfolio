import { describe, expect, test } from 'bun:test'
import type { Category, Image, Subcategory, Tag, Work } from './types.ts'
import {
  featuredWorkFromRow,
  tileFromRow,
  toCategoryDetail,
  toCategoryNav,
  toCategoryRef,
  toImageDetail,
  toSubcategoryNav,
  toSubcategoryRef,
  toTagNav,
  toTile,
  toWorkDetail,
  toWorkDetailById,
} from './dto.ts'

function makeWork(over: Partial<Work> = {}): Work {
  return {
    id: 5,
    subcategory_id: 2,
    slug: 'kofejnya',
    title: 'Кофейня',
    description: 'Описание',
    cover_image_id: 9,
    sort_order: 0,
    featured_order: null,
    created_at: 't',
    updated_at: 't',
    ...over,
  }
}

function makeImage(over: Partial<Image> = {}): Image {
  return {
    id: 9,
    work_id: 5,
    key_base: 'images/5/9',
    width: 1200,
    height: 800,
    alt: 'Альт',
    lqip: null,
    sort_order: 0,
    created_at: 't',
    ...over,
  }
}

describe('toTile', () => {
  test('produces strictly { id, slug, title, src, w, h, cat, sub, variants }; src is thumb jpg cover', () => {
    const tile = toTile(
      makeWork({ id: 42, slug: 'bannery-2024', title: 'Баннеры 2024' }),
      makeImage({ key_base: 'images/42/7', width: 640, height: 480 }),
      'kupikod',
      'bannera',
    )
    expect(tile).toEqual({
      id: 42,
      slug: 'bannery-2024',
      title: 'Баннеры 2024',
      src: '/media/images/42/7/thumb.jpg',
      w: 640,
      h: 480,
      cat: 'kupikod',
      sub: 'bannera',
      variants: {
        avif: '/media/images/42/7/thumb.avif',
        webp: '/media/images/42/7/thumb.webp',
        jpg: '/media/images/42/7/thumb.jpg',
      },
    })
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
  })

  test('title остаётся null, если у работы его нет', () => {
    expect(toTile(makeWork({ title: null }), makeImage(), 'c', 's').title).toBeNull()
  })
})

describe('tileFromRow / featuredWorkFromRow', () => {
  test('tileFromRow даёт ту же форму, что toTile (SQL-листинг ↔ repo-листинг)', () => {
    const work = makeWork({ id: 42, slug: 'bannery', title: 'Баннеры' })
    const cover = makeImage({ key_base: 'images/42/7', width: 640, height: 480 })
    expect(
      tileFromRow({
        id: 42,
        slug: 'bannery',
        title: 'Баннеры',
        cat: 'kupikod',
        sub: 'bannera',
        key_base: 'images/42/7',
        width: 640,
        height: 480,
      }),
    ).toEqual(toTile(work, cover, 'kupikod', 'bannera'))
  })

  test('featuredWorkFromRow — тайл + description', () => {
    const featured = featuredWorkFromRow({
      id: 1,
      slug: 'w',
      title: 'W',
      cat: 'c',
      sub: 's',
      key_base: 'images/1/1',
      width: 10,
      height: 20,
      description: 'Описание витрины',
    })
    expect(featured.description).toBe('Описание витрины')
    expect(Object.keys(featured).sort()).toEqual([
      'cat',
      'description',
      'h',
      'id',
      'slug',
      'src',
      'sub',
      'title',
      'variants',
      'w',
    ])
  })
})

describe('toImageDetail', () => {
  test('includes variants, w/h, alt, sort_order', () => {
    const d = toImageDetail(makeImage({ id: 9, width: 1200, height: 800, alt: 'A', sort_order: 3 }))
    expect(d.id).toBe(9)
    expect(d.w).toBe(1200)
    expect(d.h).toBe(800)
    expect(d.alt).toBe('A')
    expect(d.sort_order).toBe(3)
    expect(d.variants.thumb.jpg).toBe('/media/images/5/9/thumb.jpg')
    expect(d.variants.full.avif).toBe('/media/images/5/9/full.avif')
  })

  test('omits lqip when not set, includes it when present', () => {
    expect('lqip' in toImageDetail(makeImage({ lqip: null }))).toBe(false)
    expect(toImageDetail(makeImage({ lqip: 'data:image/x' })).lqip).toBe('data:image/x')
  })
})

describe('toWorkDetail', () => {
  test('description + ordered images[] + tag_ids', () => {
    const w = makeWork({ id: 5, slug: 's', title: 'T', description: 'D', cover_image_id: 9 })
    const imgs = [makeImage({ id: 9, sort_order: 0 }), makeImage({ id: 10, sort_order: 1 })]
    const detail = toWorkDetail(w, imgs, [3, 1])
    expect(detail.id).toBe(5)
    expect(detail.slug).toBe('s')
    expect(detail.title).toBe('T')
    expect(detail.description).toBe('D')
    expect(detail.cover_image_id).toBe(9)
    expect(detail.tag_ids).toEqual([3, 1])
    expect(detail.images.map((i) => i.id)).toEqual([9, 10])
  })

  test('работа без тегов → tag_ids: []', () => {
    expect(toWorkDetail(makeWork(), [], []).tag_ids).toEqual([])
  })
})

describe('toWorkDetailById', () => {
  test('same detail shape plus cat/sub slugs (для клика из глобального листинга)', () => {
    const w = makeWork({ id: 5, slug: 's', title: 'T', description: 'D', cover_image_id: 9 })
    const imgs = [makeImage({ id: 9, sort_order: 0 }), makeImage({ id: 10, sort_order: 1 })]
    const detail = toWorkDetailById(w, imgs, [7], 'brending', 'logotipy')
    // всё, что есть в toWorkDetail
    expect(detail.id).toBe(5)
    expect(detail.slug).toBe('s')
    expect(detail.description).toBe('D')
    expect(detail.tag_ids).toEqual([7])
    expect(detail.images.map((i) => i.id)).toEqual([9, 10])
    // плюс слаги пути
    expect(detail.cat).toBe('brending')
    expect(detail.sub).toBe('logotipy')
  })
})

describe('category/subcategory serializers', () => {
  function makeCategory(over: Partial<Category> = {}): Category {
    return { id: 1, slug: 'brending', title: 'Брендинг', description: null, sort_order: 0, kicker: null, meta_role: null, period: null, description_long: null, display_variant: 'showcase', created_at: 't', updated_at: 't', ...over }
  }
  function makeSub(over: Partial<Subcategory> = {}): Subcategory {
    return { id: 2, category_id: 1, slug: 'logotipy', title: 'Логотипы', description: null, sort_order: 0, created_at: 't', updated_at: 't', ...over }
  }

  test('toCategoryRef / toSubcategoryRef are flat meta', () => {
    expect(toCategoryRef(makeCategory())).toEqual({ id: 1, slug: 'brending', title: 'Брендинг', description: null, sort_order: 0 })
    expect(toSubcategoryRef(makeSub())).toEqual({ id: 2, slug: 'logotipy', title: 'Логотипы', description: null, sort_order: 0 })
  })

  test('toSubcategoryNav carries work_count', () => {
    expect(toSubcategoryNav(makeSub(), 4).work_count).toBe(4)
  })

  test('toCategoryNav nests subcategories + контент секции и счётчики', () => {
    const category = makeCategory({
      kicker: 'КОММЕРЧЕСКАЯ ГРАФИКА',
      meta_role: 'SMM · ПРОМО',
      period: '2023 — 2026',
      description_long: 'Длинный текст',
      display_variant: 'strip',
    })
    const nav = toCategoryNav(category, [toSubcategoryNav(makeSub(), 2)], {
      work_count: 2,
      updated_max: '2026-07-28 10:00:00',
    })
    expect(nav.slug).toBe('brending')
    expect(nav.subcategories).toHaveLength(1)
    expect(nav.subcategories[0]?.work_count).toBe(2)
    expect(nav.kicker).toBe('КОММЕРЧЕСКАЯ ГРАФИКА')
    expect(nav.meta_role).toBe('SMM · ПРОМО')
    expect(nav.period).toBe('2023 — 2026')
    expect(nav.display_variant).toBe('strip')
    expect(nav.work_count).toBe(2)
    expect(nav.updated_max).toBe('2026-07-28 10:00:00')
    // description_long — только в детали категории (см. toCategoryDetail)
    expect('description_long' in nav).toBe(false)
  })

  test('toCategoryDetail = nav + description_long', () => {
    const detail = toCategoryDetail(makeCategory({ description_long: 'Полный текст' }), [], {
      work_count: 0,
      updated_max: null,
    })
    expect(detail.description_long).toBe('Полный текст')
    expect(detail.work_count).toBe(0)
    expect(detail.updated_max).toBeNull()
  })
})

describe('toTagNav', () => {
  function makeTag(over: Partial<Tag> = {}): Tag {
    return { id: 3, slug: 'identika', title: 'Айдентика', sort_order: 1, created_at: 't', updated_at: 't', ...over }
  }

  test('строго { id, slug, title, sort_order, work_count }', () => {
    const nav = toTagNav(makeTag(), 5)
    expect(nav).toEqual({ id: 3, slug: 'identika', title: 'Айдентика', sort_order: 1, work_count: 5 })
    expect(Object.keys(nav).sort()).toEqual(['id', 'slug', 'sort_order', 'title', 'work_count'])
  })
})

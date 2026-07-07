import { describe, expect, test } from 'bun:test'
import type { Category, Image, Subcategory, Work } from './types.ts'
import {
  toCategoryNav,
  toCategoryRef,
  toImageDetail,
  toSubcategoryNav,
  toSubcategoryRef,
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
  test('produces strictly { id, src, w, h, cat, sub }; id is the work id, src is thumb jpg cover', () => {
    const tile = toTile(
      makeWork({ id: 42 }),
      makeImage({ key_base: 'images/42/7', width: 640, height: 480 }),
      'kupikod',
      'bannera',
    )
    expect(tile).toEqual({
      id: 42,
      src: '/media/images/42/7/thumb.jpg',
      w: 640,
      h: 480,
      cat: 'kupikod',
      sub: 'bannera',
    })
    expect(Object.keys(tile).sort()).toEqual(['cat', 'h', 'id', 'src', 'sub', 'w'])
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
  test('description + ordered images[]', () => {
    const w = makeWork({ id: 5, slug: 's', title: 'T', description: 'D', cover_image_id: 9 })
    const imgs = [makeImage({ id: 9, sort_order: 0 }), makeImage({ id: 10, sort_order: 1 })]
    const detail = toWorkDetail(w, imgs)
    expect(detail.id).toBe(5)
    expect(detail.slug).toBe('s')
    expect(detail.title).toBe('T')
    expect(detail.description).toBe('D')
    expect(detail.cover_image_id).toBe(9)
    expect(detail.images.map((i) => i.id)).toEqual([9, 10])
  })
})

describe('toWorkDetailById', () => {
  test('same detail shape plus cat/sub slugs (для клика из глобального листинга)', () => {
    const w = makeWork({ id: 5, slug: 's', title: 'T', description: 'D', cover_image_id: 9 })
    const imgs = [makeImage({ id: 9, sort_order: 0 }), makeImage({ id: 10, sort_order: 1 })]
    const detail = toWorkDetailById(w, imgs, 'brending', 'logotipy')
    // всё, что есть в toWorkDetail
    expect(detail.id).toBe(5)
    expect(detail.slug).toBe('s')
    expect(detail.description).toBe('D')
    expect(detail.images.map((i) => i.id)).toEqual([9, 10])
    // плюс слаги пути
    expect(detail.cat).toBe('brending')
    expect(detail.sub).toBe('logotipy')
  })
})

describe('category/subcategory serializers', () => {
  function makeCategory(over: Partial<Category> = {}): Category {
    return { id: 1, slug: 'brending', title: 'Брендинг', description: null, sort_order: 0, created_at: 't', updated_at: 't', ...over }
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

  test('toCategoryNav nests subcategories', () => {
    const nav = toCategoryNav(makeCategory(), [toSubcategoryNav(makeSub(), 2)])
    expect(nav.slug).toBe('brending')
    expect(nav.subcategories).toHaveLength(1)
    expect(nav.subcategories[0]?.work_count).toBe(2)
  })
})

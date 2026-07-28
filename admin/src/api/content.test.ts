// Контент-API админки: пути/тела запросов + постраничная выгрузка работ категории.
// Транспорт (`api`) мокается — здесь проверяется контракт обёрток (задачи 14/15, спека
// редизайна §5.3–§5.5), а не fetch (он покрыт client.test.ts).

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Tile, WorksPage } from '@/api/types'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}))
vi.mock('./client', () => ({ api: mocks }))

import {
  createTag,
  deleteTag,
  getFeatured,
  getTags,
  getWorksByCategory,
  reorderTags,
  setCategoryFeatured,
  updateCategory,
  updateTag,
  updateWork,
  WORKS_PAGE_LIMIT,
} from './content'

const tile = (id: number): Tile => ({
  id,
  slug: `w${id}`,
  title: `Работа ${id}`,
  src: `/media/images/${id}/1/thumb.jpg`,
  w: 800,
  h: 600,
  cat: 'grafika',
  sub: 'bannery',
  variants: {
    avif: `/media/images/${id}/1/thumb.avif`,
    webp: `/media/images/${id}/1/thumb.webp`,
    jpg: `/media/images/${id}/1/thumb.jpg`,
  },
})

const page = (items: Tile[], total: number, offset: number): WorksPage => ({
  items,
  total,
  limit: WORKS_PAGE_LIMIT,
  offset,
})

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset())
})

describe('чтение контента листинга', () => {
  it('getTags → GET /tags', async () => {
    mocks.get.mockResolvedValue([])
    await getTags()
    expect(mocks.get).toHaveBeenCalledWith('/tags', undefined)
  })

  it('getFeatured → GET /featured', async () => {
    mocks.get.mockResolvedValue([])
    await getFeatured()
    expect(mocks.get).toHaveBeenCalledWith('/featured', undefined)
  })
})

describe('getWorksByCategory', () => {
  it('одна страница: слаг экранируется, лимит — максимум API', async () => {
    mocks.get.mockResolvedValueOnce(page([tile(1), tile(2)], 2, 0))

    const works = await getWorksByCategory('гра фика')

    expect(works.map((w) => w.id)).toEqual([1, 2])
    expect(mocks.get).toHaveBeenCalledTimes(1)
    expect(mocks.get).toHaveBeenCalledWith(
      `/works?category=${encodeURIComponent('гра фика')}&limit=${WORKS_PAGE_LIMIT}&offset=0`,
      undefined,
    )
  })

  it('выгребает все страницы до total и склеивает их по порядку', async () => {
    const first = Array.from({ length: WORKS_PAGE_LIMIT }, (_, i) => tile(i + 1))
    mocks.get
      .mockResolvedValueOnce(page(first, WORKS_PAGE_LIMIT + 1, 0))
      .mockResolvedValueOnce(page([tile(999)], WORKS_PAGE_LIMIT + 1, WORKS_PAGE_LIMIT))

    const works = await getWorksByCategory('grafika')

    expect(works).toHaveLength(WORKS_PAGE_LIMIT + 1)
    expect(works.at(-1)?.id).toBe(999)
    expect(mocks.get).toHaveBeenNthCalledWith(
      2,
      `/works?category=grafika&limit=${WORKS_PAGE_LIMIT}&offset=${WORKS_PAGE_LIMIT}`,
      undefined,
    )
  })

  it('пустая страница обрывает цикл, даже если total врёт', async () => {
    mocks.get.mockResolvedValue(page([], 5, 0))
    await expect(getWorksByCategory('grafika')).resolves.toEqual([])
    expect(mocks.get).toHaveBeenCalledTimes(1)
  })

  it('пробрасывает signal в каждый запрос', async () => {
    const signal = new AbortController().signal
    mocks.get.mockResolvedValueOnce(page([tile(1)], 1, 0))
    await getWorksByCategory('grafika', signal)
    expect(mocks.get).toHaveBeenCalledWith(expect.any(String), signal)
  })
})

describe('меты категории', () => {
  it('updateCategory шлёт контентные поля и вариант секции', async () => {
    mocks.patch.mockResolvedValue({})
    await updateCategory(7, {
      title: 'Графика',
      kicker: 'КОММЕРЧЕСКАЯ ГРАФИКА',
      meta_role: null,
      period: '2023 — 2026',
      description_long: null,
      display_variant: 'strip',
    })
    expect(mocks.patch).toHaveBeenCalledWith('/admin/categories/7', {
      title: 'Графика',
      kicker: 'КОММЕРЧЕСКАЯ ГРАФИКА',
      meta_role: null,
      period: '2023 — 2026',
      description_long: null,
      display_variant: 'strip',
    })
  })
})

describe('теги', () => {
  it('createTag → POST /admin/tags', async () => {
    mocks.post.mockResolvedValue({})
    await createTag({ title: 'Айдентика' })
    expect(mocks.post).toHaveBeenCalledWith('/admin/tags', { title: 'Айдентика' })
  })

  it('updateTag → PATCH /admin/tags/:id', async () => {
    mocks.patch.mockResolvedValue({})
    await updateTag(3, { title: 'Плакаты' })
    expect(mocks.patch).toHaveBeenCalledWith('/admin/tags/3', { title: 'Плакаты' })
  })

  it('deleteTag → DELETE /admin/tags/:id', async () => {
    mocks.delete.mockResolvedValue({ ok: true })
    await deleteTag(3)
    expect(mocks.delete).toHaveBeenCalledWith('/admin/tags/3')
  })

  it('reorderTags → PATCH /admin/tags/reorder {ids}', async () => {
    mocks.patch.mockResolvedValue({ ok: true })
    await reorderTags([3, 1, 2])
    expect(mocks.patch).toHaveBeenCalledWith('/admin/tags/reorder', { ids: [3, 1, 2] })
  })

  it('updateWork принимает tag_ids (полная замена набора)', async () => {
    mocks.patch.mockResolvedValue({})
    await updateWork(5, { tag_ids: [2, 4] })
    expect(mocks.patch).toHaveBeenCalledWith('/admin/works/5', { tag_ids: [2, 4] })
  })
})

describe('витрина категории', () => {
  it('setCategoryFeatured → PATCH /admin/categories/:id/featured {work_ids}', async () => {
    mocks.patch.mockResolvedValue({ ok: true })
    await setCategoryFeatured(7, [10, 11])
    expect(mocks.patch).toHaveBeenCalledWith('/admin/categories/7/featured', {
      work_ids: [10, 11],
    })
  })

  it('пустой массив = очистить витрину', async () => {
    mocks.patch.mockResolvedValue({ ok: true })
    await setCategoryFeatured(7, [])
    expect(mocks.patch).toHaveBeenCalledWith('/admin/categories/7/featured', { work_ids: [] })
  })
})

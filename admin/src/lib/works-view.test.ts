import { describe, expect, it } from 'vitest'

import type { Tile } from '@/api/types'
import type { KnownWork } from '@/content/work-registry'

import { buildWorksView } from './works-view'

const tile = (id: number): Tile => ({
  id,
  slug: `w${id}`,
  title: null,
  src: `/media/images/${id}/1/thumb.jpg`,
  w: 800,
  h: 600,
  cat: 'cat',
  sub: 'sub',
  variants: {
    avif: `/media/images/${id}/1/thumb.avif`,
    webp: `/media/images/${id}/1/thumb.webp`,
    jpg: `/media/images/${id}/1/thumb.jpg`,
  },
})
const known = (id: number, slug: string, title: string | null = null): KnownWork => ({
  id,
  catSlug: 'cat',
  subSlug: 'sub',
  slug,
  title,
})

describe('buildWorksView', () => {
  it('тайлы идут первыми в их порядке, slug/title подтягиваются из реестра', () => {
    const rows = buildWorksView([tile(2), tile(1)], [known(1, 'one', 'Один')])
    expect(rows.map((r) => r.id)).toEqual([2, 1])
    expect(rows[0]).toMatchObject({ id: 2, slug: null, title: null, cover: tile(2).src })
    expect(rows[1]).toMatchObject({ id: 1, slug: 'one', title: 'Один' })
  })

  it('известные работы без картинок (не в тайлах) добавляются в хвост, cover=null', () => {
    const rows = buildWorksView([tile(1)], [known(1, 'one'), known(5, 'five', 'Пять')])
    expect(rows.map((r) => r.id)).toEqual([1, 5])
    expect(rows[1]).toMatchObject({ id: 5, slug: 'five', title: 'Пять', cover: null, w: null })
  })

  it('пустой листинг + пустой реестр → пустой список', () => {
    expect(buildWorksView([], [])).toEqual([])
  })

  it('работа с картинкой, но неизвестная реестру → slug/title null (нельзя редактировать)', () => {
    const rows = buildWorksView([tile(9)], [])
    expect(rows[0]).toMatchObject({ id: 9, slug: null, title: null, cover: tile(9).src })
  })
})

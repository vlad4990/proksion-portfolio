import { describe, expect, it } from 'vitest'

import type { Tile } from '@/api/types'
import type { KnownWork } from '@/content/work-registry'

import { buildWorksView } from './works-view'

const tile = (id: number, title: string | null = null): Tile => ({
  id,
  slug: `w${id}`,
  title,
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
  it('тайлы идут первыми в их порядке; slug/title берутся из тайла (задача 14)', () => {
    const rows = buildWorksView([tile(2, 'Два'), tile(1, 'Один')], [])
    expect(rows.map((r) => r.id)).toEqual([2, 1])
    expect(rows[0]).toMatchObject({ id: 2, slug: 'w2', title: 'Два', cover: tile(2).src })
    expect(rows[1]).toMatchObject({ id: 1, slug: 'w1', title: 'Один' })
  })

  it('тайл без названия: имя подставляется из реестра, слаг всё равно из тайла', () => {
    const rows = buildWorksView([tile(1)], [known(1, 'ignored-slug', 'Один')])
    expect(rows[0]).toMatchObject({ id: 1, slug: 'w1', title: 'Один' })
  })

  it('известные работы без картинок (не в тайлах) добавляются в хвост, cover=null', () => {
    const rows = buildWorksView([tile(1)], [known(1, 'one'), known(5, 'five', 'Пять')])
    expect(rows.map((r) => r.id)).toEqual([1, 5])
    expect(rows[1]).toMatchObject({ id: 5, slug: 'five', title: 'Пять', cover: null, w: null })
  })

  it('пустой листинг + пустой реестр → пустой список', () => {
    expect(buildWorksView([], [])).toEqual([])
  })

  it('работа с картинкой из прошлой сессии (реестр пуст) — слаг есть, «Управление» доступно', () => {
    const rows = buildWorksView([tile(9)], [])
    expect(rows[0]).toMatchObject({ id: 9, slug: 'w9', title: null, cover: tile(9).src })
  })
})

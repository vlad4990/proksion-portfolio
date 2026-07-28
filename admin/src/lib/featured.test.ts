import { describe, expect, it } from 'vitest'

import type { FeaturedSection, FeaturedWork, Tile } from '@/api/types'

import { curatedWorks, featuredCandidates, sectionForCategory, withoutWork, withWork } from './featured'

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

const work = (id: number): FeaturedWork => ({ ...tile(id), description: null })

const section = (cat: string, curated: boolean, works: FeaturedWork[]): FeaturedSection => ({
  cat,
  curated,
  works,
})

describe('sectionForCategory', () => {
  it('находит секцию по слагу категории', () => {
    const sections = [section('other', true, []), section('grafika', true, [work(1)])]
    expect(sectionForCategory(sections, 'grafika')?.works.map((w) => w.id)).toEqual([1])
  })

  it('нет секции → null', () => {
    expect(sectionForCategory([], 'grafika')).toBeNull()
  })
})

describe('curatedWorks', () => {
  it('curated: true → работы витрины в их порядке', () => {
    expect(curatedWorks(section('grafika', true, [work(3), work(1)])).map((w) => w.id)).toEqual([
      3, 1,
    ])
  })

  it('curated: false (fallback) → пусто: витрина НЕ настроена', () => {
    expect(curatedWorks(section('grafika', false, [work(3), work(1)]))).toEqual([])
  })

  it('секции нет → пусто', () => {
    expect(curatedWorks(null)).toEqual([])
  })
})

describe('featuredCandidates', () => {
  it('исключает работы, уже стоящие в витрине', () => {
    expect(featuredCandidates([tile(1), tile(2), tile(3)], [2]).map((w) => w.id)).toEqual([1, 3])
  })

  it('пустая витрина → все видимые работы категории', () => {
    expect(featuredCandidates([tile(1), tile(2)], []).map((w) => w.id)).toEqual([1, 2])
  })
})

describe('withWork / withoutWork', () => {
  it('withWork добавляет в конец (hero — первый элемент, новые уходят в хвост)', () => {
    expect(withWork([5], 9)).toEqual([5, 9])
  })

  it('withWork игнорирует дубль (бэк отвергает повторы)', () => {
    expect(withWork([5, 9], 9)).toEqual([5, 9])
  })

  it('withoutWork убирает работу, сохраняя порядок', () => {
    expect(withoutWork([5, 9, 7], 9)).toEqual([5, 7])
  })
})

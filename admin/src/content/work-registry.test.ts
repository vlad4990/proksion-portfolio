import { describe, expect, it } from 'vitest'

import { mergeKnown, type KnownWork } from './work-registry'

const work = (id: number, slug: string, title: string | null = null): KnownWork => ({
  id,
  catSlug: 'cat',
  subSlug: 'sub',
  slug,
  title,
})

describe('mergeKnown', () => {
  it('добавляет новые записи по id', () => {
    const next = mergeKnown({}, [work(1, 'a'), work(2, 'b')])
    expect(Object.keys(next)).toEqual(['1', '2'])
    expect(next[1]!.slug).toBe('a')
  })

  it('перезаписывает существующую запись по id', () => {
    const prev = { 1: work(1, 'old', 'Старое') }
    const next = mergeKnown(prev, [work(1, 'new', 'Новое')])
    expect(next[1]).toEqual(work(1, 'new', 'Новое'))
  })

  it('не мутирует prev', () => {
    const prev = { 1: work(1, 'a') }
    mergeKnown(prev, [work(2, 'b')])
    expect(Object.keys(prev)).toEqual(['1'])
  })
})

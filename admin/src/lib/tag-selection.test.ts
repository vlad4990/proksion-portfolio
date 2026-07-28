import { describe, expect, it } from 'vitest'

import { sameTagIds, toggleTagId } from './tag-selection'

describe('toggleTagId', () => {
  it('добавляет отсутствующий тег в конец', () => {
    expect(toggleTagId([2, 5], 7)).toEqual([2, 5, 7])
  })

  it('снимает присутствующий тег, сохраняя порядок остальных', () => {
    expect(toggleTagId([2, 5, 7], 5)).toEqual([2, 7])
  })

  it('снятие последнего даёт пустой набор', () => {
    expect(toggleTagId([5], 5)).toEqual([])
  })

  it('не мутирует исходный массив', () => {
    const ids = [1]
    toggleTagId(ids, 2)
    expect(ids).toEqual([1])
  })
})

describe('sameTagIds', () => {
  it('порядок не важен', () => {
    expect(sameTagIds([1, 2], [2, 1])).toBe(true)
  })

  it('разный состав → false', () => {
    expect(sameTagIds([1, 2], [1])).toBe(false)
    expect(sameTagIds([1], [2])).toBe(false)
  })

  it('пустые наборы равны', () => {
    expect(sameTagIds([], [])).toBe(true)
  })
})

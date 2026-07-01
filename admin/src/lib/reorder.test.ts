import { describe, expect, it } from 'vitest'

import { move, moveById, orderChanged, toReorderPayload } from './reorder'

const ids = (items: { id: number }[]) => items.map((i) => i.id)

describe('move', () => {
  it('переносит элемент вперёд (вниз по списку)', () => {
    expect(move([1, 2, 3, 4], 0, 2)).toEqual([2, 3, 1, 4])
  })

  it('переносит элемент назад (вверх по списку)', () => {
    expect(move([1, 2, 3, 4], 3, 1)).toEqual([1, 4, 2, 3])
  })

  it('перенос в конец, когда to >= длины', () => {
    expect(move([1, 2, 3], 0, 99)).toEqual([2, 3, 1])
  })

  it('перенос в начало при отрицательном to', () => {
    expect(move([1, 2, 3], 2, -5)).toEqual([3, 1, 2])
  })

  it('from вне диапазона → копия без изменений', () => {
    expect(move([1, 2, 3], 5, 0)).toEqual([1, 2, 3])
  })

  it('не мутирует исходный массив', () => {
    const src = [1, 2, 3]
    move(src, 0, 2)
    expect(src).toEqual([1, 2, 3])
  })
})

describe('moveById', () => {
  const list = [{ id: 10 }, { id: 20 }, { id: 30 }]

  it('переносит элемент к позиции другого по id', () => {
    expect(ids(moveById(list, 10, 30))).toEqual([20, 30, 10])
  })

  it('dragId === overId → без изменений', () => {
    expect(ids(moveById(list, 20, 20))).toEqual([10, 20, 30])
  })

  it('неизвестный id → копия без изменений', () => {
    expect(ids(moveById(list, 999, 10))).toEqual([10, 20, 30])
  })
})

describe('toReorderPayload', () => {
  it('собирает { ids } из порядка элементов', () => {
    expect(toReorderPayload([{ id: 3 }, { id: 1 }, { id: 2 }])).toEqual({ ids: [3, 1, 2] })
  })

  it('пустой список → пустой ids', () => {
    expect(toReorderPayload([])).toEqual({ ids: [] })
  })
})

describe('orderChanged', () => {
  it('тот же порядок → false', () => {
    expect(orderChanged([{ id: 1 }, { id: 2 }], [{ id: 1 }, { id: 2 }])).toBe(false)
  })

  it('переставленный порядок → true', () => {
    expect(orderChanged([{ id: 1 }, { id: 2 }], [{ id: 2 }, { id: 1 }])).toBe(true)
  })

  it('разная длина → true', () => {
    expect(orderChanged([{ id: 1 }], [{ id: 1 }, { id: 2 }])).toBe(true)
  })
})

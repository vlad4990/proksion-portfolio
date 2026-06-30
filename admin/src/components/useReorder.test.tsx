import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useReorder } from './useReorder'

const ids = (items: { id: number }[]) => items.map((i) => i.id)

// ВАЖНО: useReorder требует СТАБИЛЬНУЮ ссылку items (на странице — useMemo). Поэтому в тестах
// держим массив в const вне колбэка renderHook, иначе sync-эффект зациклит ре-рендер.

describe('useReorder', () => {
  it('moveDown переставляет элемент и шлёт reorder с новым порядком id', () => {
    const persist = vi.fn().mockResolvedValue(undefined)
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }]
    const { result } = renderHook(() => useReorder(items, persist))

    act(() => result.current.moveDown(0))

    expect(ids(result.current.order)).toEqual([2, 1, 3])
    expect(persist).toHaveBeenCalledWith([2, 1, 3])
  })

  it('moveUp на первом элементе — без эффекта', () => {
    const persist = vi.fn().mockResolvedValue(undefined)
    const items = [{ id: 1 }, { id: 2 }]
    const { result } = renderHook(() => useReorder(items, persist))

    act(() => result.current.moveUp(0))

    expect(ids(result.current.order)).toEqual([1, 2])
    expect(persist).not.toHaveBeenCalled()
  })

  it('оптимистично переставляет, затем откатывается при ошибке persist', async () => {
    const persist = vi.fn().mockRejectedValue(new Error('fail'))
    const items = [{ id: 1 }, { id: 2 }]
    const { result } = renderHook(() => useReorder(items, persist))

    act(() => result.current.moveDown(0))
    // оптимистичный порядок применён сразу
    expect(ids(result.current.order)).toEqual([2, 1])

    // после реджекта — откат к снимку
    await waitFor(() => expect(ids(result.current.order)).toEqual([1, 2]))
  })

  it('подхватывает новый серверный порядок при смене items', () => {
    const persist = vi.fn().mockResolvedValue(undefined)
    const a = [{ id: 1 }, { id: 2 }]
    const b = [{ id: 2 }, { id: 1 }]
    const { result, rerender } = renderHook(({ items }) => useReorder(items, persist), {
      initialProps: { items: a },
    })

    rerender({ items: b })
    expect(ids(result.current.order)).toEqual([2, 1])
  })
})

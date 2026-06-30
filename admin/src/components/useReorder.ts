// Хук перестановки списка: соединяет чистую логику (src/lib/reorder.ts) с UI — нативным HTML5
// drag-n-drop И доступными кнопками вверх/вниз. Хранит оптимистичный локальный порядок,
// синхронизируется с входными `items` (после рефетча), при ошибке persist откатывается.
//
// persist вызывается из обработчиков событий (один раз на действие) — не из апдейтера состояния,
// поэтому StrictMode не дублирует reorder-запрос. Важно: передавайте СТАБИЛЬНУЮ ссылку `items`
// (мемоизируйте на странице), иначе эффект синхронизации будет сбрасывать порядок каждый рендер.

import { useEffect, useRef, useState, type DragEvent } from 'react'

import { move, orderChanged } from '@/lib/reorder'

export interface DragItemProps {
  draggable: true
  onDragStart: (e: DragEvent) => void
  onDragOver: (e: DragEvent) => void
  onDrop: (e: DragEvent) => void
  onDragEnd: () => void
}

export interface UseReorderResult<T> {
  /** Текущий (оптимистичный) порядок для рендера. */
  order: T[]
  /** Пропсы для DnD, навешиваются на строку/карточку по индексу. */
  getItemProps: (index: number) => DragItemProps
  moveUp: (index: number) => void
  moveDown: (index: number) => void
}

export function useReorder<T extends { id: number }>(
  items: T[],
  persist: (orderedIds: number[]) => Promise<void>,
): UseReorderResult<T> {
  const [order, setOrder] = useState<T[]>(items)
  const dragIndex = useRef<number | null>(null)

  // Подхватываем новый серверный порядок (после рефетча). items должен быть стабилен по ссылке.
  useEffect(() => {
    setOrder(items)
  }, [items])

  // Применяет новый порядок оптимистично и шлёт reorder; при ошибке откатывается к снимку.
  const reorderTo = (next: T[]) => {
    if (!orderChanged(order, next)) return
    const snapshot = order
    setOrder(next)
    void persist(next.map((i) => i.id)).catch(() => setOrder(snapshot))
  }

  const getItemProps = (index: number): DragItemProps => ({
    draggable: true,
    onDragStart: (e) => {
      dragIndex.current = index
      e.dataTransfer.effectAllowed = 'move'
    },
    onDragOver: (e) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
    },
    onDrop: (e) => {
      e.preventDefault()
      const from = dragIndex.current
      if (from !== null && from !== index) reorderTo(move(order, from, index))
      dragIndex.current = null
    },
    onDragEnd: () => {
      dragIndex.current = null
    },
  })

  const moveUp = (index: number) => {
    if (index > 0) reorderTo(move(order, index, index - 1))
  }
  const moveDown = (index: number) => {
    if (index < order.length - 1) reorderTo(move(order, index, index + 1))
  }

  return { order, getItemProps, moveUp, moveDown }
}

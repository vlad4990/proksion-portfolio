// Чистые функции перестановки для drag-n-drop сортировки (задача 08, шаг 4).
// Логика отделена от UI и DnD-механики, чтобы покрыть её юнит-тестами: вычисление нового
// порядка и payload для `PATCH /admin/<kind>/reorder` (тело { ids } — упорядоченный список id).

/** Переставляет элемент с позиции `from` на позицию `to`, возвращая НОВЫЙ массив (не мутирует). */
export function move<T>(items: readonly T[], from: number, to: number): T[] {
  const result = items.slice()
  if (from < 0 || from >= result.length) return result
  const [item] = result.splice(from, 1) as [T]
  const target = Math.max(0, Math.min(to, result.length))
  result.splice(target, 0, item)
  return result
}

/** Перестановка по id: переносит `dragId` на позицию `overId`. Неизвестный id → копия без изменений. */
export function moveById<T extends { id: number }>(
  items: readonly T[],
  dragId: number,
  overId: number,
): T[] {
  if (dragId === overId) return items.slice()
  const from = items.findIndex((i) => i.id === dragId)
  const to = items.findIndex((i) => i.id === overId)
  if (from === -1 || to === -1) return items.slice()
  return move(items, from, to)
}

/** Payload для reorder-эндпоинта: упорядоченный список id. */
export function toReorderPayload<T extends { id: number }>(items: readonly T[]): {
  ids: number[]
} {
  return { ids: items.map((i) => i.id) }
}

/** Изменился ли порядок id относительно исходного (чтобы не слать лишний reorder-запрос). */
export function orderChanged<T extends { id: number }>(
  before: readonly T[],
  after: readonly T[],
): boolean {
  if (before.length !== after.length) return true
  return before.some((item, index) => item.id !== after[index]!.id)
}

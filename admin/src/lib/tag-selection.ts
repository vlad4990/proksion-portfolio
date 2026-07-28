// Набор тегов работы: чистая логика мультивыбора чипов. PATCH `/admin/works/:id` заменяет
// набор ЦЕЛИКОМ (`tag_ids`), поэтому UI всегда оперирует полным списком id, а не дельтой.

/** Переключить тег: отсутствующий добавляется в конец, присутствующий — снимается. */
export function toggleTagId(ids: readonly number[], id: number): number[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
}

/** Совпадают ли наборы без учёта порядка (dirty-состояние формы тегов). */
export function sameTagIds(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every((id) => set.has(id))
}

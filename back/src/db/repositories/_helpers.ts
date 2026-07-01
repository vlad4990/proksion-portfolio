// Общие помощники репозиториев. Имена колонок — только литералы из кода (не пользовательский
// ввод), поэтому динамический UPDATE безопасен от инъекций.

import type { Database } from 'bun:sqlite'

export type BindValue = string | number | null

/**
 * Частичный UPDATE: пишет только колонки с заданным (≠ undefined) значением, возвращает
 * обновлённую строку через RETURNING. Пустой patch → строка возвращается без изменений.
 * Отсутствующий `id` → `null`. При `touchUpdatedAt` обновляет `updated_at = datetime('now')`.
 */
export function runUpdate<T>(
  db: Database,
  table: string,
  pairs: ReadonlyArray<readonly [column: string, value: BindValue | undefined]>,
  id: number,
  touchUpdatedAt: boolean,
): T | null {
  const sets: string[] = []
  const values: BindValue[] = []
  for (const [column, value] of pairs) {
    if (value !== undefined) {
      sets.push(`${column} = ?`)
      values.push(value)
    }
  }

  if (sets.length === 0) {
    return db.query<T, [number]>(`SELECT * FROM ${table} WHERE id = ?`).get(id)
  }

  if (touchUpdatedAt) sets.push(`updated_at = datetime('now')`)
  values.push(id)
  return db
    .query<T, BindValue[]>(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = ? RETURNING *`)
    .get(...values)
}

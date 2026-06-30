// Открытие БД (docs/architecture.md §3): bun:sqlite + PRAGMA WAL/FK + прогон миграций.

import { Database } from 'bun:sqlite'
import { join } from 'node:path'
import { migrate } from './migrate.ts'

const MIGRATIONS_DIR = join(import.meta.dir, '..', '..', 'migrations')

/**
 * Открывает (создаёт при отсутствии) БД по `path`, выставляет PRAGMA `journal_mode=WAL`
 * и `foreign_keys=ON`, прогоняет миграции и возвращает готовое соединение.
 * `path` может быть `:memory:` или временным файлом (для тестов).
 */
export function openDb(path: string): Database {
  const db = new Database(path, { create: true })
  db.run('PRAGMA journal_mode = WAL')
  db.run('PRAGMA foreign_keys = ON')
  migrate(db, MIGRATIONS_DIR)
  return db
}

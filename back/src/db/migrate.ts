// Идемпотентный раннер миграций (docs/architecture.md §3): применяет `migrations/*.sql`
// по возрастанию имени файла, фиксируя применённые в таблице `_migrations`.
// Без миграционных фреймворков — только bun:sqlite + node:fs.

import type { Database } from 'bun:sqlite'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function ensureMigrationsTable(db: Database): void {
  db.run(`CREATE TABLE IF NOT EXISTS _migrations (
    name       TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`)
}

/** Имена уже применённых миграций, в порядке применения. */
export function getAppliedMigrations(db: Database): string[] {
  ensureMigrationsTable(db)
  return db
    .query<{ name: string }, []>('SELECT name FROM _migrations ORDER BY name')
    .all()
    .map((row) => row.name)
}

/**
 * Применяет все ещё не применённые `*.sql` из `migrationsDir` (по возрастанию имени).
 * Каждая миграция — в своей транзакции (DDL + запись в `_migrations`).
 * Возвращает имена применённых на этом прогоне (пустой массив, если всё уже накатано).
 */
export function migrate(db: Database, migrationsDir: string): string[] {
  ensureMigrationsTable(db)

  const applied = new Set(getAppliedMigrations(db))
  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort()

  const insert = db.query<unknown, [string]>('INSERT INTO _migrations (name) VALUES (?)')
  const justApplied: string[] = []

  for (const file of files) {
    if (applied.has(file)) continue
    const sql = readFileSync(join(migrationsDir, file), 'utf8')
    db.transaction(() => {
      db.run(sql)
      insert.run(file)
    })()
    justApplied.push(file)
  }

  return justApplied
}

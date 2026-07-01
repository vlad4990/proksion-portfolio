import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getAppliedMigrations, migrate } from './migrate.ts'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'proksion-mig-'))
  writeFileSync(join(dir, '0001_a.sql'), 'CREATE TABLE a (id INTEGER PRIMARY KEY);')
  writeFileSync(join(dir, '0002_b.sql'), 'CREATE TABLE b (id INTEGER PRIMARY KEY);')
  // a non-sql file must be ignored by the runner
  writeFileSync(join(dir, 'README.md'), 'ignore me')
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('migrate', () => {
  test('applies all *.sql from scratch, in lexicographic order', () => {
    const db = new Database(':memory:')
    const applied = migrate(db, dir)
    expect(applied).toEqual(['0001_a.sql', '0002_b.sql'])
    const tables = db
      .query<{ name: string }, []>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('a','b') ORDER BY name",
      )
      .all()
      .map((r) => r.name)
    expect(tables).toEqual(['a', 'b'])
    db.close()
  })

  test('is idempotent: second run applies nothing and does not throw', () => {
    const db = new Database(':memory:')
    migrate(db, dir)
    const again = migrate(db, dir)
    expect(again).toEqual([])
    expect(getAppliedMigrations(db)).toEqual(['0001_a.sql', '0002_b.sql'])
    db.close()
  })

  test('applies only newly added migrations on a later run', () => {
    const db = new Database(':memory:')
    migrate(db, dir)
    writeFileSync(join(dir, '0003_c.sql'), 'CREATE TABLE c (id INTEGER PRIMARY KEY);')
    const applied = migrate(db, dir)
    expect(applied).toEqual(['0003_c.sql'])
    expect(getAppliedMigrations(db)).toEqual(['0001_a.sql', '0002_b.sql', '0003_c.sql'])
    db.close()
  })
})

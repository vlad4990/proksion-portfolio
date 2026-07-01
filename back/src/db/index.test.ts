import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDb } from './index.ts'

let seq = 0
let path: string
let db: Database

beforeEach(() => {
  path = join(tmpdir(), `proksion-db-${process.pid}-${seq++}.sqlite`)
  db = openDb(path)
})

afterEach(() => {
  db.close()
  for (const ext of ['', '-wal', '-shm']) rmSync(path + ext, { force: true })
})

function count(sql: string): number {
  return db.query<{ c: number }, []>(sql).get()?.c ?? -1
}

describe('openDb — PRAGMA', () => {
  test('journal_mode = wal, foreign_keys = 1 (on a real file)', () => {
    expect(db.query<{ journal_mode: string }, []>('PRAGMA journal_mode').get()?.journal_mode).toBe('wal')
    expect(db.query<{ foreign_keys: number }, []>('PRAGMA foreign_keys').get()?.foreign_keys).toBe(1)
  })

  test('creates the database file', () => {
    expect(existsSync(path)).toBe(true)
  })
})

describe('openDb — schema (§3)', () => {
  test('creates all 4 tables', () => {
    const names = db
      .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((r) => r.name)
    for (const t of ['category', 'subcategory', 'work', 'image']) {
      expect(names).toContain(t)
    }
  })

  test('creates FK indexes', () => {
    const idx = db
      .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type='index'")
      .all()
      .map((r) => r.name)
    expect(idx).toContain('idx_subcategory_category')
    expect(idx).toContain('idx_work_subcategory')
    expect(idx).toContain('idx_image_work')
  })
})

describe('openDb — invariants (§3)', () => {
  test('category.slug is globally UNIQUE', () => {
    db.run("INSERT INTO category (slug, title) VALUES ('a', 'A')")
    expect(() => db.run("INSERT INTO category (slug, title) VALUES ('a', 'B')")).toThrow()
  })

  test('subcategory slug unique per category, free across categories', () => {
    db.run("INSERT INTO category (id, slug, title) VALUES (1, 'c1', 'C1')")
    db.run("INSERT INTO category (id, slug, title) VALUES (2, 'c2', 'C2')")
    db.run("INSERT INTO subcategory (category_id, slug, title) VALUES (1, 's', 'S')")
    expect(() => db.run("INSERT INTO subcategory (category_id, slug, title) VALUES (1, 's', 'S2')")).toThrow()
    expect(() => db.run("INSERT INTO subcategory (category_id, slug, title) VALUES (2, 's', 'S')")).not.toThrow()
  })

  test('work slug unique per subcategory', () => {
    db.run("INSERT INTO category (id, slug, title) VALUES (1, 'c', 'C')")
    db.run("INSERT INTO subcategory (id, category_id, slug, title) VALUES (1, 1, 's', 'S')")
    db.run("INSERT INTO work (subcategory_id, slug) VALUES (1, 'w')")
    expect(() => db.run("INSERT INTO work (subcategory_id, slug) VALUES (1, 'w')")).toThrow()
  })

  test('FK violation is rejected when parent is missing', () => {
    expect(() => db.run("INSERT INTO subcategory (category_id, slug, title) VALUES (999, 'x', 'X')")).toThrow()
  })

  test('deleting a category cascades to subcategory / work / image', () => {
    db.run("INSERT INTO category (id, slug, title) VALUES (1, 'c', 'C')")
    db.run("INSERT INTO subcategory (id, category_id, slug, title) VALUES (1, 1, 's', 'S')")
    db.run("INSERT INTO work (id, subcategory_id, slug) VALUES (1, 1, 'w')")
    db.run("INSERT INTO image (id, work_id, key_base, width, height) VALUES (1, 1, 'images/1/1', 100, 80)")
    db.run('DELETE FROM category WHERE id = 1')
    expect(count('SELECT count(*) AS c FROM subcategory')).toBe(0)
    expect(count('SELECT count(*) AS c FROM work')).toBe(0)
    expect(count('SELECT count(*) AS c FROM image')).toBe(0)
  })

  test('deleting an image referenced by work.cover_image_id sets it NULL (no error)', () => {
    db.run("INSERT INTO category (id, slug, title) VALUES (1, 'c', 'C')")
    db.run("INSERT INTO subcategory (id, category_id, slug, title) VALUES (1, 1, 's', 'S')")
    db.run("INSERT INTO work (id, subcategory_id, slug) VALUES (1, 1, 'w')")
    db.run("INSERT INTO image (id, work_id, key_base, width, height) VALUES (1, 1, 'images/1/1', 100, 80)")
    db.run('UPDATE work SET cover_image_id = 1 WHERE id = 1')
    expect(() => db.run('DELETE FROM image WHERE id = 1')).not.toThrow()
    const cover = db.query<{ cover_image_id: number | null }, []>('SELECT cover_image_id FROM work WHERE id = 1').get()
    expect(cover?.cover_image_id).toBeNull()
  })

  test('re-opening the same file is idempotent (migrations already applied)', () => {
    db.run("INSERT INTO category (slug, title) VALUES ('persist', 'P')")
    db.close()
    db = openDb(path)
    expect(count("SELECT count(*) AS c FROM category WHERE slug = 'persist'")).toBe(1)
  })
})

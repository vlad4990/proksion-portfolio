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

describe('openDb — schema 0002 (теги, витрина, меты категории)', () => {
  test('all migrations are recorded in _migrations', () => {
    const names = db
      .query<{ name: string }, []>('SELECT name FROM _migrations ORDER BY name')
      .all()
      .map((r) => r.name)
    expect(names).toEqual([
      '0001_init.sql',
      '0002_tags_featured_category_meta.sql',
      '0003_work_seamless.sql',
    ])
  })

  test('creates tag / work_tag tables and their indexes', () => {
    const names = db
      .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((r) => r.name)
    expect(names).toContain('tag')
    expect(names).toContain('work_tag')

    const idx = db
      .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type='index'")
      .all()
      .map((r) => r.name)
    expect(idx).toContain('idx_work_tag_tag')
    expect(idx).toContain('idx_work_featured')
  })

  test('category gets the new content columns; display_variant defaults to showcase', () => {
    db.run("INSERT INTO category (id, slug, title) VALUES (1, 'c', 'C')")
    const row = db
      .query<
        {
          kicker: string | null
          meta_role: string | null
          period: string | null
          description_long: string | null
          display_variant: string
        },
        []
      >('SELECT kicker, meta_role, period, description_long, display_variant FROM category WHERE id = 1')
      .get()
    expect(row?.kicker).toBeNull()
    expect(row?.meta_role).toBeNull()
    expect(row?.period).toBeNull()
    expect(row?.description_long).toBeNull()
    expect(row?.display_variant).toBe('showcase')
  })

  test('display_variant accepts the enum and rejects anything else (CHECK)', () => {
    db.run("INSERT INTO category (id, slug, title) VALUES (1, 'c', 'C')")
    for (const variant of ['showcase', 'strip', 'cards']) {
      expect(() => db.run(`UPDATE category SET display_variant = '${variant}' WHERE id = 1`)).not.toThrow()
    }
    expect(() => db.run("UPDATE category SET display_variant = 'grid' WHERE id = 1")).toThrow()
    expect(() =>
      db.run("INSERT INTO category (slug, title, display_variant) VALUES ('d', 'D', 'nope')"),
    ).toThrow()
  })

  test('work.featured_order is nullable and writable', () => {
    db.run("INSERT INTO category (id, slug, title) VALUES (1, 'c', 'C')")
    db.run("INSERT INTO subcategory (id, category_id, slug, title) VALUES (1, 1, 's', 'S')")
    db.run("INSERT INTO work (id, subcategory_id, slug) VALUES (1, 1, 'w')")
    const read = () =>
      db.query<{ featured_order: number | null }, []>('SELECT featured_order FROM work WHERE id = 1').get()
        ?.featured_order
    expect(read()).toBeNull()
    db.run('UPDATE work SET featured_order = 0 WHERE id = 1')
    expect(read()).toBe(0)
  })

  test('tag.slug is UNIQUE; work_tag rows require existing parents', () => {
    db.run("INSERT INTO tag (slug, title) VALUES ('promo', 'Промо')")
    expect(() => db.run("INSERT INTO tag (slug, title) VALUES ('promo', 'Другой')")).toThrow()
    expect(() => db.run('INSERT INTO work_tag (work_id, tag_id) VALUES (999, 1)')).toThrow()
  })

  test('work_tag cascades on both sides (work deleted / tag deleted)', () => {
    db.run("INSERT INTO category (id, slug, title) VALUES (1, 'c', 'C')")
    db.run("INSERT INTO subcategory (id, category_id, slug, title) VALUES (1, 1, 's', 'S')")
    db.run("INSERT INTO work (id, subcategory_id, slug) VALUES (1, 1, 'w1')")
    db.run("INSERT INTO work (id, subcategory_id, slug) VALUES (2, 1, 'w2')")
    db.run("INSERT INTO tag (id, slug, title) VALUES (1, 't1', 'T1')")
    db.run("INSERT INTO tag (id, slug, title) VALUES (2, 't2', 'T2')")
    db.run('INSERT INTO work_tag (work_id, tag_id) VALUES (1, 1), (1, 2), (2, 1)')

    db.run('DELETE FROM work WHERE id = 1')
    expect(count('SELECT count(*) AS c FROM work_tag')).toBe(1)
    db.run('DELETE FROM tag WHERE id = 1')
    expect(count('SELECT count(*) AS c FROM work_tag')).toBe(0)
  })

  test('work_tag pair is unique (PRIMARY KEY)', () => {
    db.run("INSERT INTO category (id, slug, title) VALUES (1, 'c', 'C')")
    db.run("INSERT INTO subcategory (id, category_id, slug, title) VALUES (1, 1, 's', 'S')")
    db.run("INSERT INTO work (id, subcategory_id, slug) VALUES (1, 1, 'w')")
    db.run("INSERT INTO tag (id, slug, title) VALUES (1, 't', 'T')")
    db.run('INSERT INTO work_tag (work_id, tag_id) VALUES (1, 1)')
    expect(() => db.run('INSERT INTO work_tag (work_id, tag_id) VALUES (1, 1)')).toThrow()
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

  test('work.seamless defaults to 0 and accepts only 0/1', () => {
    db.run("INSERT INTO category (id, slug, title) VALUES (1, 'c', 'C')")
    db.run("INSERT INTO subcategory (id, category_id, slug, title) VALUES (1, 1, 's', 'S')")
    db.run("INSERT INTO work (id, subcategory_id, slug) VALUES (1, 1, 'w')")
    const row = db.query<{ seamless: number }, []>('SELECT seamless FROM work WHERE id = 1').get()
    expect(row?.seamless).toBe(0)
    expect(() => db.run('UPDATE work SET seamless = 1 WHERE id = 1')).not.toThrow()
    expect(() => db.run('UPDATE work SET seamless = 2 WHERE id = 1')).toThrow()
  })

  test('re-opening the same file is idempotent (migrations already applied)', () => {
    db.run("INSERT INTO category (slug, title) VALUES ('persist', 'P')")
    db.close()
    db = openDb(path)
    expect(count("SELECT count(*) AS c FROM category WHERE slug = 'persist'")).toBe(1)
  })
})

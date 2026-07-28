import { beforeEach, describe, expect, test } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { openDb } from '../index.ts'
import { createCategoryRepo } from './category.ts'
import { createSubcategoryRepo } from './subcategory.ts'
import { createWorkRepo, type WorkRepo } from './work.ts'
import { createTagRepo, type TagRepo } from './tag.ts'

let db: Database
let repo: TagRepo
let work: WorkRepo
let subId: number

beforeEach(() => {
  db = openDb(':memory:')
  const catId = createCategoryRepo(db).create({ slug: 'c', title: 'C' }).id
  subId = createSubcategoryRepo(db).create({ category_id: catId, slug: 's', title: 'S' }).id
  work = createWorkRepo(db)
  repo = createTagRepo(db)
})

describe('tagRepo', () => {
  test('create returns the full typed row with defaults', () => {
    const t = repo.create({ slug: 'promo', title: 'Промо' })
    expect(t.id).toBeGreaterThan(0)
    expect(t.slug).toBe('promo')
    expect(t.title).toBe('Промо')
    expect(t.sort_order).toBe(0)
    expect(typeof t.created_at).toBe('string')
    expect(typeof t.updated_at).toBe('string')
  })

  test('slug is globally unique — a second create with the same slug throws', () => {
    repo.create({ slug: 'promo', title: 'Промо' })
    expect(() => repo.create({ slug: 'promo', title: 'Другое' })).toThrow()
  })

  test('getById / getBySlug', () => {
    const t = repo.create({ slug: 'a', title: 'A' })
    expect(repo.getById(t.id)?.slug).toBe('a')
    expect(repo.getBySlug('a')?.id).toBe(t.id)
    expect(repo.getById(999)).toBeNull()
    expect(repo.getBySlug('nope')).toBeNull()
  })

  test('list is ordered by sort_order then id', () => {
    repo.create({ slug: 'a', title: 'A', sort_order: 2 })
    repo.create({ slug: 'b', title: 'B', sort_order: 1 })
    repo.create({ slug: 'c', title: 'C', sort_order: 1 })
    expect(repo.list().map((r) => r.slug)).toEqual(['b', 'c', 'a'])
  })

  test('update patches only provided fields', () => {
    const t = repo.create({ slug: 'a', title: 'A' })
    const u = repo.update(t.id, { title: 'AA', sort_order: 5 })
    expect(u?.title).toBe('AA')
    expect(u?.sort_order).toBe(5)
    expect(u?.slug).toBe('a')
    expect(repo.update(t.id, {})?.id).toBe(t.id)
    expect(repo.update(999, { title: 'x' })).toBeNull()
  })

  test('delete removes the row and reports success', () => {
    const t = repo.create({ slug: 'a', title: 'A' })
    expect(repo.delete(t.id)).toBe(true)
    expect(repo.getById(t.id)).toBeNull()
    expect(repo.delete(t.id)).toBe(false)
  })
})

describe('tagRepo — связь работа↔тег', () => {
  test('setWorkTags replaces the whole set', () => {
    const w = work.create({ subcategory_id: subId, slug: 'w' })
    const t1 = repo.create({ slug: 't1', title: 'T1' })
    const t2 = repo.create({ slug: 't2', title: 'T2', sort_order: 1 })
    const t3 = repo.create({ slug: 't3', title: 'T3', sort_order: 2 })

    repo.setWorkTags(w.id, [t1.id, t2.id])
    expect(repo.listTagIdsByWork(w.id)).toEqual([t1.id, t2.id])

    repo.setWorkTags(w.id, [t3.id])
    expect(repo.listTagIdsByWork(w.id)).toEqual([t3.id])
  })

  test('setWorkTags with an empty array clears all tags of the work', () => {
    const w = work.create({ subcategory_id: subId, slug: 'w' })
    const t = repo.create({ slug: 't', title: 'T' })
    repo.setWorkTags(w.id, [t.id])
    repo.setWorkTags(w.id, [])
    expect(repo.listTagIdsByWork(w.id)).toEqual([])
  })

  test('setWorkTags ignores duplicates in the input', () => {
    const w = work.create({ subcategory_id: subId, slug: 'w' })
    const t = repo.create({ slug: 't', title: 'T' })
    repo.setWorkTags(w.id, [t.id, t.id])
    expect(repo.listTagIdsByWork(w.id)).toEqual([t.id])
  })

  test('setWorkTags touches only the given work', () => {
    const w1 = work.create({ subcategory_id: subId, slug: 'w1' })
    const w2 = work.create({ subcategory_id: subId, slug: 'w2' })
    const t = repo.create({ slug: 't', title: 'T' })
    repo.setWorkTags(w1.id, [t.id])
    repo.setWorkTags(w2.id, [t.id])
    repo.setWorkTags(w1.id, [])
    expect(repo.listTagIdsByWork(w2.id)).toEqual([t.id])
  })

  test('setWorkTags with an unknown tag id throws and leaves the previous set intact', () => {
    const w = work.create({ subcategory_id: subId, slug: 'w' })
    const t = repo.create({ slug: 't', title: 'T' })
    repo.setWorkTags(w.id, [t.id])
    expect(() => repo.setWorkTags(w.id, [t.id, 999])).toThrow()
    expect(repo.listTagIdsByWork(w.id)).toEqual([t.id])
  })

  test('listTagIdsByWork is ordered by tag sort_order then id', () => {
    const w = work.create({ subcategory_id: subId, slug: 'w' })
    const late = repo.create({ slug: 'late', title: 'Late', sort_order: 5 })
    const early = repo.create({ slug: 'early', title: 'Early', sort_order: 1 })
    repo.setWorkTags(w.id, [late.id, early.id])
    expect(repo.listTagIdsByWork(w.id)).toEqual([early.id, late.id])
  })

  test('listWorkIdsByTag returns works of the tag, ordered by work sort_order then id', () => {
    const w1 = work.create({ subcategory_id: subId, slug: 'w1', sort_order: 2 })
    const w2 = work.create({ subcategory_id: subId, slug: 'w2', sort_order: 1 })
    const w3 = work.create({ subcategory_id: subId, slug: 'w3', sort_order: 3 })
    const t = repo.create({ slug: 't', title: 'T' })
    repo.setWorkTags(w1.id, [t.id])
    repo.setWorkTags(w3.id, [t.id])
    expect(repo.listWorkIdsByTag(t.id)).toEqual([w1.id, w3.id])
    repo.setWorkTags(w2.id, [t.id])
    expect(repo.listWorkIdsByTag(t.id)).toEqual([w2.id, w1.id, w3.id])
    expect(repo.listWorkIdsByTag(999)).toEqual([])
  })

  test('deleting a work / a tag drops the link rows', () => {
    const w = work.create({ subcategory_id: subId, slug: 'w' })
    const t = repo.create({ slug: 't', title: 'T' })
    repo.setWorkTags(w.id, [t.id])
    work.delete(w.id)
    expect(repo.listWorkIdsByTag(t.id)).toEqual([])

    const w2 = work.create({ subcategory_id: subId, slug: 'w2' })
    repo.setWorkTags(w2.id, [t.id])
    repo.delete(t.id)
    expect(repo.listTagIdsByWork(w2.id)).toEqual([])
  })
})

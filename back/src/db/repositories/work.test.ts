import { beforeEach, describe, expect, test } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { openDb } from '../index.ts'
import { createCategoryRepo } from './category.ts'
import { createSubcategoryRepo } from './subcategory.ts'
import { createImageRepo } from './image.ts'
import { createWorkRepo, type WorkRepo } from './work.ts'

let db: Database
let repo: WorkRepo
let subId: number

beforeEach(() => {
  db = openDb(':memory:')
  const catId = createCategoryRepo(db).create({ slug: 'c', title: 'C' }).id
  subId = createSubcategoryRepo(db).create({ category_id: catId, slug: 's', title: 'S' }).id
  repo = createWorkRepo(db)
})

describe('workRepo', () => {
  test('create allows null title and starts with no cover', () => {
    const w = repo.create({ subcategory_id: subId, slug: 'w' })
    expect(w.slug).toBe('w')
    expect(w.title).toBeNull()
    expect(w.cover_image_id).toBeNull()
    expect(w.sort_order).toBe(0)
  })

  test('circular ref: create without cover, then set cover after first image', () => {
    const w = repo.create({ subcategory_id: subId, slug: 'w', title: 'Работа' })
    expect(w.cover_image_id).toBeNull()
    const img = createImageRepo(db).create({
      work_id: w.id,
      key_base: `images/${w.id}/1`,
      width: 100,
      height: 80,
    })
    const updated = repo.update(w.id, { cover_image_id: img.id })
    expect(updated?.cover_image_id).toBe(img.id)
    // cover can be cleared back to null
    expect(repo.update(w.id, { cover_image_id: null })?.cover_image_id).toBeNull()
  })

  test('getBySlug is scoped to subcategory + list ordered by sort_order', () => {
    repo.create({ subcategory_id: subId, slug: 'a', sort_order: 2 })
    repo.create({ subcategory_id: subId, slug: 'b', sort_order: 1 })
    expect(repo.getBySlug(subId, 'a')?.slug).toBe('a')
    expect(repo.getBySlug(subId, 'zzz')).toBeNull()
    expect(repo.list(subId).map((r) => r.slug)).toEqual(['b', 'a'])
  })

  test('delete removes the work', () => {
    const w = repo.create({ subcategory_id: subId, slug: 'w' })
    expect(repo.delete(w.id)).toBe(true)
    expect(repo.getById(w.id)).toBeNull()
  })
})

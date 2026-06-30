import { beforeEach, describe, expect, test } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { openDb } from '../index.ts'
import { createCategoryRepo } from './category.ts'
import { createSubcategoryRepo, type SubcategoryRepo } from './subcategory.ts'

let db: Database
let repo: SubcategoryRepo
let catId: number
let otherCatId: number

beforeEach(() => {
  db = openDb(':memory:')
  const cats = createCategoryRepo(db)
  catId = cats.create({ slug: 'c1', title: 'C1' }).id
  otherCatId = cats.create({ slug: 'c2', title: 'C2' }).id
  repo = createSubcategoryRepo(db)
})

describe('subcategoryRepo', () => {
  test('create + getById + getBySlug (scoped to category)', () => {
    const s = repo.create({ category_id: catId, slug: 'banners', title: 'Баннеры' })
    expect(s.category_id).toBe(catId)
    expect(repo.getById(s.id)?.slug).toBe('banners')
    expect(repo.getBySlug(catId, 'banners')?.id).toBe(s.id)
    // same slug under a different category is a different (or absent) row
    expect(repo.getBySlug(otherCatId, 'banners')).toBeNull()
  })

  test('list is scoped to a category and ordered', () => {
    repo.create({ category_id: catId, slug: 'a', title: 'A', sort_order: 2 })
    repo.create({ category_id: catId, slug: 'b', title: 'B', sort_order: 1 })
    repo.create({ category_id: otherCatId, slug: 'x', title: 'X', sort_order: 0 })
    expect(repo.list(catId).map((r) => r.slug)).toEqual(['b', 'a'])
    expect(repo.list(otherCatId).map((r) => r.slug)).toEqual(['x'])
  })

  test('update + delete', () => {
    const s = repo.create({ category_id: catId, slug: 'a', title: 'A' })
    expect(repo.update(s.id, { title: 'AA' })?.title).toBe('AA')
    expect(repo.delete(s.id)).toBe(true)
    expect(repo.getById(s.id)).toBeNull()
  })

  test('same slug in two different categories coexist', () => {
    expect(() => repo.create({ category_id: catId, slug: 's', title: 'S' })).not.toThrow()
    expect(() => repo.create({ category_id: otherCatId, slug: 's', title: 'S' })).not.toThrow()
  })
})

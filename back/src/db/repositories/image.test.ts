import { beforeEach, describe, expect, test } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { openDb } from '../index.ts'
import { createCategoryRepo } from './category.ts'
import { createSubcategoryRepo } from './subcategory.ts'
import { createWorkRepo } from './work.ts'
import { createImageRepo, type ImageRepo } from './image.ts'

let db: Database
let repo: ImageRepo
let workId: number
let otherWorkId: number

beforeEach(() => {
  db = openDb(':memory:')
  const catId = createCategoryRepo(db).create({ slug: 'c', title: 'C' }).id
  const subId = createSubcategoryRepo(db).create({ category_id: catId, slug: 's', title: 'S' }).id
  const works = createWorkRepo(db)
  workId = works.create({ subcategory_id: subId, slug: 'w1' }).id
  otherWorkId = works.create({ subcategory_id: subId, slug: 'w2' }).id
  repo = createImageRepo(db)
})

describe('imageRepo', () => {
  test('create returns the full typed row with defaults', () => {
    const img = repo.create({ work_id: workId, key_base: `images/${workId}/1`, width: 1200, height: 900 })
    expect(img.id).toBeGreaterThan(0)
    expect(img.work_id).toBe(workId)
    expect(img.key_base).toBe(`images/${workId}/1`)
    expect(img.width).toBe(1200)
    expect(img.height).toBe(900)
    expect(img.alt).toBeNull()
    expect(img.lqip).toBeNull()
    expect(img.sort_order).toBe(0)
    expect(typeof img.created_at).toBe('string')
  })

  test('getById and list scoped to a work, ordered by sort_order', () => {
    repo.create({ work_id: workId, key_base: 'a', width: 1, height: 1, sort_order: 2 })
    repo.create({ work_id: workId, key_base: 'b', width: 1, height: 1, sort_order: 1 })
    repo.create({ work_id: otherWorkId, key_base: 'c', width: 1, height: 1, sort_order: 0 })
    expect(repo.list(workId).map((r) => r.key_base)).toEqual(['b', 'a'])
    expect(repo.list(otherWorkId).map((r) => r.key_base)).toEqual(['c'])
  })

  test('update alt / sort_order', () => {
    const img = repo.create({ work_id: workId, key_base: 'k', width: 1, height: 1 })
    const u = repo.update(img.id, { alt: 'описание', sort_order: 5 })
    expect(u?.alt).toBe('описание')
    expect(u?.sort_order).toBe(5)
  })

  test('delete removes the row', () => {
    const img = repo.create({ work_id: workId, key_base: 'k', width: 1, height: 1 })
    expect(repo.delete(img.id)).toBe(true)
    expect(repo.getById(img.id)).toBeNull()
  })

  test('deleting the parent work cascades its images', () => {
    repo.create({ work_id: workId, key_base: 'k', width: 1, height: 1 })
    createWorkRepo(db).delete(workId)
    expect(repo.list(workId)).toEqual([])
  })
})

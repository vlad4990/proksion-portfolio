import { beforeEach, describe, expect, test } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { openDb } from '../index.ts'
import { createCategoryRepo } from './category.ts'
import { createSubcategoryRepo } from './subcategory.ts'
import { createImageRepo } from './image.ts'
import { createWorkRepo, type WorkRepo } from './work.ts'
import type { WorkPatch } from '../../types.ts'

let db: Database
let repo: WorkRepo
let catId: number
let subId: number

beforeEach(() => {
  db = openDb(':memory:')
  catId = createCategoryRepo(db).create({ slug: 'c', title: 'C' }).id
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

  test('seamless: create defaults to 0, update toggles the flag both ways', () => {
    const w = repo.create({ subcategory_id: subId, slug: 'w' })
    expect(w.seamless).toBe(0)
    expect(repo.update(w.id, { seamless: 1 })?.seamless).toBe(1)
    expect(repo.getById(w.id)?.seamless).toBe(1)
    expect(repo.update(w.id, { seamless: 0 })?.seamless).toBe(0)
  })

  test('seamless: create can turn the flag on right away', () => {
    expect(repo.create({ subcategory_id: subId, slug: 'w', seamless: 1 }).seamless).toBe(1)
  })

  test('create leaves the work out of the showcase (featured_order = NULL)', () => {
    expect(repo.create({ subcategory_id: subId, slug: 'w' }).featured_order).toBeNull()
  })
})

describe('workRepo — витрина категории', () => {
  let otherCatId: number
  let otherSubId: number

  beforeEach(() => {
    otherCatId = createCategoryRepo(db).create({ slug: 'c2', title: 'C2', sort_order: 1 }).id
    otherSubId = createSubcategoryRepo(db).create({ category_id: otherCatId, slug: 's2', title: 'S2' }).id
  })

  test('setFeatured writes array positions (0 = hero) and clears the rest of the category', () => {
    const w1 = repo.create({ subcategory_id: subId, slug: 'w1' })
    const w2 = repo.create({ subcategory_id: subId, slug: 'w2' })
    const w3 = repo.create({ subcategory_id: subId, slug: 'w3' })

    repo.setFeatured(catId, [w3.id, w1.id])
    expect(repo.getById(w3.id)?.featured_order).toBe(0)
    expect(repo.getById(w1.id)?.featured_order).toBe(1)
    expect(repo.getById(w2.id)?.featured_order).toBeNull()
  })

  test('setFeatured spans all subcategories of the category and resets the previous list', () => {
    const otherSubInSameCat = createSubcategoryRepo(db).create({
      category_id: catId,
      slug: 's-b',
      title: 'S-B',
      sort_order: 1,
    })
    const w1 = repo.create({ subcategory_id: subId, slug: 'w1' })
    const w2 = repo.create({ subcategory_id: otherSubInSameCat.id, slug: 'w2' })

    repo.setFeatured(catId, [w1.id, w2.id])
    expect(repo.listFeatured(catId).map((w) => w.id)).toEqual([w1.id, w2.id])

    repo.setFeatured(catId, [w2.id])
    expect(repo.listFeatured(catId).map((w) => w.id)).toEqual([w2.id])
    expect(repo.getById(w1.id)?.featured_order).toBeNull()
  })

  test('setFeatured with an empty list clears the showcase of the category', () => {
    const w = repo.create({ subcategory_id: subId, slug: 'w' })
    repo.setFeatured(catId, [w.id])
    repo.setFeatured(catId, [])
    expect(repo.listFeatured(catId)).toEqual([])
    expect(repo.getById(w.id)?.featured_order).toBeNull()
  })

  test('setFeatured does not touch works of other categories', () => {
    const mine = repo.create({ subcategory_id: subId, slug: 'w' })
    const theirs = repo.create({ subcategory_id: otherSubId, slug: 'w' })
    repo.setFeatured(otherCatId, [theirs.id])
    repo.setFeatured(catId, [mine.id])

    expect(repo.getById(theirs.id)?.featured_order).toBe(0)
    expect(repo.listFeatured(otherCatId).map((w) => w.id)).toEqual([theirs.id])
    expect(repo.listFeatured(catId).map((w) => w.id)).toEqual([mine.id])
  })

  test('listFeatured returns works ordered by featured_order, not by sort_order', () => {
    const w1 = repo.create({ subcategory_id: subId, slug: 'w1', sort_order: 0 })
    const w2 = repo.create({ subcategory_id: subId, slug: 'w2', sort_order: 1 })
    const w3 = repo.create({ subcategory_id: subId, slug: 'w3', sort_order: 2 })
    repo.setFeatured(catId, [w2.id, w3.id, w1.id])
    expect(repo.listFeatured(catId).map((w) => w.slug)).toEqual(['w2', 'w3', 'w1'])
    expect(repo.listFeatured(catId).map((w) => w.featured_order)).toEqual([0, 1, 2])
  })

  test('listFeatured of a category with an empty showcase is empty', () => {
    repo.create({ subcategory_id: subId, slug: 'w' })
    expect(repo.listFeatured(catId)).toEqual([])
  })

  test('featured_order is not writable through the partial update', () => {
    const w = repo.create({ subcategory_id: subId, slug: 'w' })
    repo.setFeatured(catId, [w.id])
    const patch = { slug: 'w-renamed', featured_order: 7 } as WorkPatch
    expect(repo.update(w.id, patch)?.featured_order).toBe(0)
    expect(repo.getById(w.id)?.slug).toBe('w-renamed')
  })
})

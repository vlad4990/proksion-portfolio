import { beforeEach, describe, expect, test } from 'bun:test'
import { openDb } from '../index.ts'
import { createCategoryRepo, type CategoryRepo } from './category.ts'

let repo: CategoryRepo

beforeEach(() => {
  repo = createCategoryRepo(openDb(':memory:'))
})

describe('categoryRepo', () => {
  test('create returns the full typed row with defaults', () => {
    const c = repo.create({ slug: 'brending', title: 'Брендинг' })
    expect(c.id).toBeGreaterThan(0)
    expect(c.slug).toBe('brending')
    expect(c.title).toBe('Брендинг')
    expect(c.description).toBeNull()
    expect(c.sort_order).toBe(0)
    expect(typeof c.created_at).toBe('string')
    expect(typeof c.updated_at).toBe('string')
  })

  test('getById / getBySlug', () => {
    const c = repo.create({ slug: 'a', title: 'A' })
    expect(repo.getById(c.id)?.slug).toBe('a')
    expect(repo.getBySlug('a')?.id).toBe(c.id)
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
    const c = repo.create({ slug: 'a', title: 'A' })
    const u = repo.update(c.id, { title: 'AA', description: 'd' })
    expect(u?.title).toBe('AA')
    expect(u?.description).toBe('d')
    expect(u?.slug).toBe('a')
  })

  test('update with empty patch returns the unchanged row', () => {
    const c = repo.create({ slug: 'a', title: 'A' })
    expect(repo.update(c.id, {})?.id).toBe(c.id)
  })

  test('update of a missing id returns null', () => {
    expect(repo.update(999, { title: 'x' })).toBeNull()
  })

  test('delete removes the row and reports success', () => {
    const c = repo.create({ slug: 'a', title: 'A' })
    expect(repo.delete(c.id)).toBe(true)
    expect(repo.getById(c.id)).toBeNull()
    expect(repo.delete(c.id)).toBe(false)
  })
})

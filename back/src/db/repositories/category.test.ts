import { beforeEach, describe, expect, test } from 'bun:test'
import { openDb } from '../index.ts'
import { createCategoryRepo, type CategoryRepo } from './category.ts'
import type { CategoryPatch } from '../../types.ts'

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

describe('categoryRepo — контентные поля секции (миграция 0002)', () => {
  test('create leaves the new fields empty and picks the showcase variant', () => {
    const c = repo.create({ slug: 'a', title: 'A' })
    expect(c.kicker).toBeNull()
    expect(c.meta_role).toBeNull()
    expect(c.period).toBeNull()
    expect(c.description_long).toBeNull()
    expect(c.display_variant).toBe('showcase')
  })

  test('update patches the new fields', () => {
    const c = repo.create({ slug: 'a', title: 'A' })
    const u = repo.update(c.id, {
      kicker: 'КОММЕРЧЕСКАЯ ГРАФИКА',
      meta_role: 'SMM · ПРОМО-ГРАФИКА',
      period: '2023 — 2026',
      description_long: 'Длинное описание страницы категории.',
      display_variant: 'strip',
    })
    expect(u?.kicker).toBe('КОММЕРЧЕСКАЯ ГРАФИКА')
    expect(u?.meta_role).toBe('SMM · ПРОМО-ГРАФИКА')
    expect(u?.period).toBe('2023 — 2026')
    expect(u?.description_long).toBe('Длинное описание страницы категории.')
    expect(u?.display_variant).toBe('strip')
    expect(u?.title).toBe('A')
  })

  test('update clears a content field back to null', () => {
    const c = repo.create({ slug: 'a', title: 'A' })
    repo.update(c.id, { kicker: 'X' })
    expect(repo.update(c.id, { kicker: null })?.kicker).toBeNull()
  })

  test('update rejects a display_variant outside the enum (CHECK)', () => {
    const c = repo.create({ slug: 'a', title: 'A' })
    // значение из-за пределов union'а может прийти только из нетипизированного источника
    const patch = { display_variant: 'grid' } as unknown as CategoryPatch
    expect(() => repo.update(c.id, patch)).toThrow()
  })
})

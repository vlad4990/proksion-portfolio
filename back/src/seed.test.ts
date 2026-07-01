import { beforeEach, describe, expect, test } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { openDb } from './db/index.ts'
import { createRepos } from './repos.ts'
import { seed } from './seed.ts'

let db: Database

beforeEach(() => {
  db = openDb(':memory:')
})

describe('seed', () => {
  test('populates the full tree (categories → subcategories → works → images)', () => {
    const summary = seed(db)
    expect(summary.categories).toBeGreaterThan(0)
    expect(summary.subcategories).toBeGreaterThan(0)
    expect(summary.works).toBeGreaterThan(0)
    expect(summary.images).toBeGreaterThan(0)

    const repos = createRepos(db)
    const cats = repos.category.list()
    expect(cats.length).toBe(summary.categories)
    expect(cats[0]).toBeTruthy()
  })

  test('every work gets a cover and realistic key_base images/{workId}/{imageId}', () => {
    seed(db)
    const repos = createRepos(db)
    for (const cat of repos.category.list()) {
      for (const sub of repos.subcategory.list(cat.id)) {
        for (const work of repos.work.list(sub.id)) {
          const images = repos.image.list(work.id)
          expect(images.length).toBeGreaterThan(0)
          expect(work.cover_image_id).not.toBeNull()
          for (const img of images) {
            expect(img.key_base).toBe(`images/${work.id}/${img.id}`)
            expect(img.width).toBeGreaterThan(0)
            expect(img.height).toBeGreaterThan(0)
          }
        }
      }
    }
  })

  test('is idempotent — re-running yields identical counts and no duplicates', () => {
    const first = seed(db)
    const second = seed(db)
    expect(second).toEqual(first)
    const repos = createRepos(db)
    expect(repos.category.list().length).toBe(first.categories)
  })
})

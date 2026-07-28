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

describe('seed — данные редизайна листинга (теги, витрина, меты категории)', () => {
  function count(sql: string): number {
    return db.query<{ c: number }, []>(sql).get()?.c ?? -1
  }

  test('creates tags and marks part of the works with them', () => {
    const summary = seed(db)
    const repos = createRepos(db)
    const tags = repos.tag.list()
    expect(tags.length).toBe(summary.tags)
    expect(tags.length).toBeGreaterThanOrEqual(2)
    for (const tag of tags) {
      expect(tag.slug).toMatch(/^[a-z0-9-]+$/)
      expect(tag.title.length).toBeGreaterThan(0)
    }

    const tagged = count('SELECT count(DISTINCT work_id) AS c FROM work_tag')
    expect(tagged).toBeGreaterThan(0)
    expect(tagged).toBeLessThan(count('SELECT count(*) AS c FROM work'))
    // каждый тег реально используется — иначе чипы-фильтры выйдут пустыми
    for (const tag of tags) {
      expect(repos.tag.listWorkIdsByTag(tag.id).length).toBeGreaterThan(0)
    }
  })

  test('fills the showcase of at least one category with a contiguous order from 0', () => {
    seed(db)
    const repos = createRepos(db)
    const withShowcase = repos.category
      .list()
      .map((c) => repos.work.listFeatured(c.id))
      .filter((works) => works.length > 0)

    expect(withShowcase.length).toBeGreaterThan(0)
    for (const works of withShowcase) {
      expect(works.map((w) => w.featured_order)).toEqual(works.map((_, i) => i))
    }
    // витрина — кураторская выборка, а не «все работы категории»
    expect(count('SELECT count(*) AS c FROM work WHERE featured_order IS NOT NULL')).toBeLessThan(
      count('SELECT count(*) AS c FROM work'),
    )
  })

  test('fills the content fields of at least one category', () => {
    seed(db)
    const repos = createRepos(db)
    const filled = repos.category.list().filter((c) => c.kicker !== null)
    expect(filled.length).toBeGreaterThan(0)
    const category = filled[0]
    expect(category?.meta_role).not.toBeNull()
    expect(category?.period).not.toBeNull()
    expect(category?.description_long).not.toBeNull()
    expect(['showcase', 'strip', 'cards']).toContain(category?.display_variant)
    // варианты секций должны быть представлены больше чем одним значением
    expect(new Set(repos.category.list().map((c) => c.display_variant)).size).toBeGreaterThan(1)
  })

  test('re-running does not duplicate tags, links or showcase entries', () => {
    seed(db)
    const before = {
      tags: count('SELECT count(*) AS c FROM tag'),
      links: count('SELECT count(*) AS c FROM work_tag'),
      featured: count('SELECT count(*) AS c FROM work WHERE featured_order IS NOT NULL'),
    }
    seed(db)
    expect({
      tags: count('SELECT count(*) AS c FROM tag'),
      links: count('SELECT count(*) AS c FROM work_tag'),
      featured: count('SELECT count(*) AS c FROM work WHERE featured_order IS NOT NULL'),
    }).toEqual(before)
  })
})

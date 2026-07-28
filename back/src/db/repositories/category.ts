import type { Database } from 'bun:sqlite'
import type { Category, CategoryPatch, NewCategory } from '../../types.ts'
import { runUpdate } from './_helpers.ts'

export interface CategoryRepo {
  create(input: NewCategory): Category
  getById(id: number): Category | null
  getBySlug(slug: string): Category | null
  list(): Category[]
  update(id: number, patch: CategoryPatch): Category | null
  delete(id: number): boolean
}

export function createCategoryRepo(db: Database): CategoryRepo {
  const insert = db.query<Category, [string, string, string | null, number]>(
    `INSERT INTO category (slug, title, description, sort_order)
     VALUES (?, ?, ?, ?) RETURNING *`,
  )
  const byId = db.query<Category, [number]>('SELECT * FROM category WHERE id = ?')
  const bySlug = db.query<Category, [string]>('SELECT * FROM category WHERE slug = ?')
  const all = db.query<Category, []>('SELECT * FROM category ORDER BY sort_order, id')
  const del = db.query<unknown, [number]>('DELETE FROM category WHERE id = ?')

  return {
    create(input) {
      const row = insert.get(input.slug, input.title, input.description ?? null, input.sort_order ?? 0)
      if (!row) throw new Error('category: INSERT ... RETURNING returned no row')
      return row
    },
    getById: (id) => byId.get(id),
    getBySlug: (slug) => bySlug.get(slug),
    list: () => all.all(),
    update: (id, patch) =>
      runUpdate<Category>(
        db,
        'category',
        [
          ['slug', patch.slug],
          ['title', patch.title],
          ['description', patch.description],
          ['sort_order', patch.sort_order],
          ['kicker', patch.kicker],
          ['meta_role', patch.meta_role],
          ['period', patch.period],
          ['description_long', patch.description_long],
          ['display_variant', patch.display_variant],
        ],
        id,
        true,
      ),
    delete: (id) => del.run(id).changes > 0,
  }
}

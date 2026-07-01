import type { Database } from 'bun:sqlite'
import type { NewSubcategory, Subcategory, SubcategoryPatch } from '../../types.ts'
import { runUpdate } from './_helpers.ts'

export interface SubcategoryRepo {
  create(input: NewSubcategory): Subcategory
  getById(id: number): Subcategory | null
  /** Слаг уникален в рамках категории, поэтому выборка скоупится по `categoryId`. */
  getBySlug(categoryId: number, slug: string): Subcategory | null
  list(categoryId: number): Subcategory[]
  update(id: number, patch: SubcategoryPatch): Subcategory | null
  delete(id: number): boolean
}

export function createSubcategoryRepo(db: Database): SubcategoryRepo {
  const insert = db.query<Subcategory, [number, string, string, string | null, number]>(
    `INSERT INTO subcategory (category_id, slug, title, description, sort_order)
     VALUES (?, ?, ?, ?, ?) RETURNING *`,
  )
  const byId = db.query<Subcategory, [number]>('SELECT * FROM subcategory WHERE id = ?')
  const bySlug = db.query<Subcategory, [number, string]>(
    'SELECT * FROM subcategory WHERE category_id = ? AND slug = ?',
  )
  const byCategory = db.query<Subcategory, [number]>(
    'SELECT * FROM subcategory WHERE category_id = ? ORDER BY sort_order, id',
  )
  const del = db.query<unknown, [number]>('DELETE FROM subcategory WHERE id = ?')

  return {
    create(input) {
      const row = insert.get(
        input.category_id,
        input.slug,
        input.title,
        input.description ?? null,
        input.sort_order ?? 0,
      )
      if (!row) throw new Error('subcategory: INSERT ... RETURNING returned no row')
      return row
    },
    getById: (id) => byId.get(id),
    getBySlug: (categoryId, slug) => bySlug.get(categoryId, slug),
    list: (categoryId) => byCategory.all(categoryId),
    update: (id, patch) =>
      runUpdate<Subcategory>(
        db,
        'subcategory',
        [
          ['slug', patch.slug],
          ['title', patch.title],
          ['description', patch.description],
          ['sort_order', patch.sort_order],
        ],
        id,
        true,
      ),
    delete: (id) => del.run(id).changes > 0,
  }
}

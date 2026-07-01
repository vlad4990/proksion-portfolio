import type { Database } from 'bun:sqlite'
import type { NewWork, Work, WorkPatch } from '../../types.ts'
import { runUpdate } from './_helpers.ts'

export interface WorkRepo {
  create(input: NewWork): Work
  getById(id: number): Work | null
  /** Слаг уникален в рамках подкатегории, поэтому выборка скоупится по `subcategoryId`. */
  getBySlug(subcategoryId: number, slug: string): Work | null
  list(subcategoryId: number): Work[]
  update(id: number, patch: WorkPatch): Work | null
  delete(id: number): boolean
}

export function createWorkRepo(db: Database): WorkRepo {
  // Циклическая ссылка work.cover_image_id ↔ image: работа создаётся без cover,
  // cover проставляется через update(...) после загрузки первой картинки.
  const insert = db.query<Work, [number, string, string | null, string | null, number | null, number]>(
    `INSERT INTO work (subcategory_id, slug, title, description, cover_image_id, sort_order)
     VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
  )
  const byId = db.query<Work, [number]>('SELECT * FROM work WHERE id = ?')
  const bySlug = db.query<Work, [number, string]>(
    'SELECT * FROM work WHERE subcategory_id = ? AND slug = ?',
  )
  const bySubcategory = db.query<Work, [number]>(
    'SELECT * FROM work WHERE subcategory_id = ? ORDER BY sort_order, id',
  )
  const del = db.query<unknown, [number]>('DELETE FROM work WHERE id = ?')

  return {
    create(input) {
      const row = insert.get(
        input.subcategory_id,
        input.slug,
        input.title ?? null,
        input.description ?? null,
        input.cover_image_id ?? null,
        input.sort_order ?? 0,
      )
      if (!row) throw new Error('work: INSERT ... RETURNING returned no row')
      return row
    },
    getById: (id) => byId.get(id),
    getBySlug: (subcategoryId, slug) => bySlug.get(subcategoryId, slug),
    list: (subcategoryId) => bySubcategory.all(subcategoryId),
    update: (id, patch) =>
      runUpdate<Work>(
        db,
        'work',
        [
          ['slug', patch.slug],
          ['title', patch.title],
          ['description', patch.description],
          ['cover_image_id', patch.cover_image_id],
          ['sort_order', patch.sort_order],
        ],
        id,
        true,
      ),
    delete: (id) => del.run(id).changes > 0,
  }
}

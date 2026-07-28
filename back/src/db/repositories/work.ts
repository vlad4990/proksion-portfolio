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
  /**
   * Кураторская витрина категории (docs/projects-redesign.md §4): одной транзакцией
   * снимает `featured_order` со всех работ категории и проставляет работам из `workIds`
   * их индекс в массиве (0 = hero-слот). Пустой массив очищает витрину. Проверка того,
   * что работы принадлежат категории — на уровне API (задача 15); здесь только механика,
   * поэтому чужая работа просто получит порядок, а витрина категории останется без неё.
   */
  setFeatured(categoryId: number, workIds: number[]): void
  /** Работы витрины категории по возрастанию `featured_order`. */
  listFeatured(categoryId: number): Work[]
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

  // Витрина: категория работы известна только через её подкатегорию, поэтому и сброс,
  // и чтение идут через subcategory. `updated_at` витрина не трогает — это раскладка
  // листинга, а не правка контента работы.
  const clearFeatured = db.query<unknown, [number]>(
    `UPDATE work SET featured_order = NULL
      WHERE featured_order IS NOT NULL
        AND subcategory_id IN (SELECT id FROM subcategory WHERE category_id = ?)`,
  )
  const setFeaturedOrder = db.query<unknown, [number, number]>(
    'UPDATE work SET featured_order = ? WHERE id = ?',
  )
  const featuredByCategory = db.query<Work, [number]>(
    `SELECT w.* FROM work w
       JOIN subcategory s ON s.id = w.subcategory_id
      WHERE s.category_id = ? AND w.featured_order IS NOT NULL
      ORDER BY w.featured_order`,
  )
  const replaceFeatured = db.transaction((categoryId: number, workIds: number[]) => {
    clearFeatured.run(categoryId)
    workIds.forEach((workId, index) => setFeaturedOrder.run(index, workId))
  })

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

    setFeatured: (categoryId, workIds) => replaceFeatured(categoryId, workIds),
    listFeatured: (categoryId) => featuredByCategory.all(categoryId),
  }
}

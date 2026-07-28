import type { Database } from 'bun:sqlite'
import type { NewTag, Tag, TagPatch } from '../../types.ts'
import { runUpdate } from './_helpers.ts'

export interface TagRepo {
  create(input: NewTag): Tag
  getById(id: number): Tag | null
  getBySlug(slug: string): Tag | null
  list(): Tag[]
  update(id: number, patch: TagPatch): Tag | null
  delete(id: number): boolean
  /**
   * Полная замена набора тегов работы одной транзакцией (порядок не значим, дубликаты
   * во входе игнорируются). Пустой массив снимает все теги. Несуществующий тег →
   * ошибка FK и откат: прежний набор остаётся нетронутым.
   */
  setWorkTags(workId: number, tagIds: number[]): void
  /** Теги работы в порядке `tag.sort_order`, `tag.id`. */
  listTagIdsByWork(workId: number): number[]
  /** Работы тега в порядке `work.sort_order`, `work.id`. */
  listWorkIdsByTag(tagId: number): number[]
}

export function createTagRepo(db: Database): TagRepo {
  const insert = db.query<Tag, [string, string, number]>(
    `INSERT INTO tag (slug, title, sort_order) VALUES (?, ?, ?) RETURNING *`,
  )
  const byId = db.query<Tag, [number]>('SELECT * FROM tag WHERE id = ?')
  const bySlug = db.query<Tag, [string]>('SELECT * FROM tag WHERE slug = ?')
  const all = db.query<Tag, []>('SELECT * FROM tag ORDER BY sort_order, id')
  const del = db.query<unknown, [number]>('DELETE FROM tag WHERE id = ?')

  const clearWorkTags = db.query<unknown, [number]>('DELETE FROM work_tag WHERE work_id = ?')
  const linkWorkTag = db.query<unknown, [number, number]>(
    'INSERT INTO work_tag (work_id, tag_id) VALUES (?, ?)',
  )
  const tagIdsByWork = db.query<{ tag_id: number }, [number]>(
    `SELECT wt.tag_id FROM work_tag wt
       JOIN tag t ON t.id = wt.tag_id
      WHERE wt.work_id = ?
      ORDER BY t.sort_order, t.id`,
  )
  const workIdsByTag = db.query<{ work_id: number }, [number]>(
    `SELECT wt.work_id FROM work_tag wt
       JOIN work w ON w.id = wt.work_id
      WHERE wt.tag_id = ?
      ORDER BY w.sort_order, w.id`,
  )

  const replaceWorkTags = db.transaction((workId: number, tagIds: number[]) => {
    clearWorkTags.run(workId)
    for (const tagId of new Set(tagIds)) linkWorkTag.run(workId, tagId)
  })

  return {
    create(input) {
      const row = insert.get(input.slug, input.title, input.sort_order ?? 0)
      if (!row) throw new Error('tag: INSERT ... RETURNING returned no row')
      return row
    },
    getById: (id) => byId.get(id),
    getBySlug: (slug) => bySlug.get(slug),
    list: () => all.all(),
    update: (id, patch) =>
      runUpdate<Tag>(
        db,
        'tag',
        [
          ['slug', patch.slug],
          ['title', patch.title],
          ['sort_order', patch.sort_order],
        ],
        id,
        true,
      ),
    delete: (id) => del.run(id).changes > 0,

    setWorkTags: (workId, tagIds) => replaceWorkTags(workId, tagIds),
    listTagIdsByWork: (workId) => tagIdsByWork.all(workId).map((r) => r.tag_id),
    listWorkIdsByTag: (tagId) => workIdsByTag.all(tagId).map((r) => r.work_id),
  }
}

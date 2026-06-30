import type { Database } from 'bun:sqlite'
import type { Image, ImagePatch, NewImage } from '../../types.ts'
import { runUpdate } from './_helpers.ts'

// У `image` нет ни slug, ни updated_at (см. §3), поэтому getBySlug отсутствует,
// а update не трогает updated_at.
export interface ImageRepo {
  create(input: NewImage): Image
  getById(id: number): Image | null
  list(workId: number): Image[]
  update(id: number, patch: ImagePatch): Image | null
  delete(id: number): boolean
}

export function createImageRepo(db: Database): ImageRepo {
  const insert = db.query<
    Image,
    [number, string, number, number, string | null, string | null, number]
  >(
    `INSERT INTO image (work_id, key_base, width, height, alt, lqip, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
  )
  const byId = db.query<Image, [number]>('SELECT * FROM image WHERE id = ?')
  const byWork = db.query<Image, [number]>(
    'SELECT * FROM image WHERE work_id = ? ORDER BY sort_order, id',
  )
  const del = db.query<unknown, [number]>('DELETE FROM image WHERE id = ?')

  return {
    create(input) {
      const row = insert.get(
        input.work_id,
        input.key_base,
        input.width,
        input.height,
        input.alt ?? null,
        input.lqip ?? null,
        input.sort_order ?? 0,
      )
      if (!row) throw new Error('image: INSERT ... RETURNING returned no row')
      return row
    },
    getById: (id) => byId.get(id),
    list: (workId) => byWork.all(workId),
    update: (id, patch) =>
      runUpdate<Image>(
        db,
        'image',
        [
          ['key_base', patch.key_base],
          ['width', patch.width],
          ['height', patch.height],
          ['alt', patch.alt],
          ['lqip', patch.lqip],
          ['sort_order', patch.sort_order],
        ],
        id,
        false,
      ),
    delete: (id) => del.run(id).changes > 0,
  }
}

import { beforeEach, describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { adminImageRoutes } from './images.ts'
import { authHeaders, failingStore, makeCtx, req, type TestCtx } from './_support.ts'
import { createObjectStore, type ObjectStore } from '../../storage/s3.ts'
import { bootstrapStorage } from '../../storage/bootstrap.ts'
import { reachableS3Config } from '../../storage/_support.ts'
import { imageKeyBase } from '../../images/store.ts'
import { IMAGE_FORMATS, IMAGE_VARIANTS } from '../../media-url.ts'

const FIXTURE = join(import.meta.dir, '..', '..', 'images', '__fixtures__', 'sample.png')
const fixtureBuffer = await Bun.file(FIXTURE).arrayBuffer()

function fileForm(alt?: string): FormData {
  const form = new FormData()
  form.append('file', new File([fixtureBuffer], 'sample.png', { type: 'image/png' }))
  if (alt !== undefined) form.append('alt', alt)
  return form
}

/** Создаёт работу с подкатегорией/категорией напрямую через репозитории. */
function seedWork(ctx: TestCtx): number {
  const cat = ctx.repos.category.create({ slug: 'cat', title: 'Кат' })
  const sub = ctx.repos.subcategory.create({ category_id: cat.id, slug: 'sub', title: 'Под' })
  return ctx.repos.work.create({ subcategory_id: sub.id, slug: 'w', title: 'W' }).id
}

// ── Атомарность загрузки (без MinIO: фейковый store с падающей заливкой) ─────────────
describe('image upload atomicity (no S3)', () => {
  let ctx: TestCtx
  let app: ReturnType<typeof adminImageRoutes>
  let workId: number

  beforeEach(() => {
    ctx = makeCtx(failingStore())
    app = adminImageRoutes(ctx.deps)
    workId = seedWork(ctx)
  })

  test('a failed S3 upload leaves no dangling `image` row and does not fire onMutation', async () => {
    const res = await app.handle(
      req(`/admin/works/${workId}/images`, {
        method: 'POST',
        headers: authHeaders(),
        body: fileForm(),
      }),
    )
    expect(res.status).toBe(500)
    expect(ctx.repos.image.list(workId).length).toBe(0) // rolled back
    expect(ctx.repos.work.getById(workId)!.cover_image_id).toBeNull()
    expect(ctx.mutationCount()).toBe(0)
  })

  test('upload to a non-existent work → 404', async () => {
    const res = await app.handle(
      req('/admin/works/9999/images', {
        method: 'POST',
        headers: authHeaders(),
        body: fileForm(),
      }),
    )
    expect(res.status).toBe(404)
  })

  test('upload without a file field → 400', async () => {
    const res = await app.handle(
      req(`/admin/works/${workId}/images`, {
        method: 'POST',
        headers: authHeaders(),
        body: new FormData(),
      }),
    )
    expect(res.status).toBe(400)
  })
})

// ── PATCH / DELETE / cover-логика (без MinIO: store=null) ────────────────────────────
describe('image patch & delete & cover (no S3)', () => {
  let ctx: TestCtx
  let app: ReturnType<typeof adminImageRoutes>
  let workId: number

  beforeEach(() => {
    ctx = makeCtx(null)
    app = adminImageRoutes(ctx.deps)
    workId = seedWork(ctx)
  })

  const mkImage = (sortOrder: number) => {
    const img = ctx.repos.image.create({
      work_id: workId,
      key_base: '',
      width: 1,
      height: 1,
      sort_order: sortOrder,
    })
    ctx.repos.image.update(img.id, { key_base: imageKeyBase(workId, img.id) })
    return img.id
  }

  test('PATCH updates alt and sort_order', async () => {
    const id = mkImage(0)
    const res = await app.handle(
      req(`/admin/images/${id}`, {
        method: 'PATCH',
        headers: authHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({ alt: 'Описание', sort_order: 5 }),
      }),
    )
    expect(res.status).toBe(200)
    const row = (await res.json()) as { alt: string; sort_order: number }
    expect(row.alt).toBe('Описание')
    expect(row.sort_order).toBe(5)
  })

  test('DELETE removes the row; deleting the cover reassigns it to the next image', async () => {
    const first = mkImage(0)
    const second = mkImage(1)
    ctx.repos.work.update(workId, { cover_image_id: first })

    const res = await app.handle(
      req(`/admin/images/${first}`, { method: 'DELETE', headers: authHeaders() }),
    )
    expect(res.status).toBe(200)
    expect(ctx.repos.image.getById(first)).toBeNull()
    // cover reassigned to the remaining image
    expect(ctx.repos.work.getById(workId)!.cover_image_id).toBe(second)
  })

  test('deleting the last (cover) image leaves cover NULL', async () => {
    const only = mkImage(0)
    ctx.repos.work.update(workId, { cover_image_id: only })
    await app.handle(req(`/admin/images/${only}`, { method: 'DELETE', headers: authHeaders() }))
    expect(ctx.repos.work.getById(workId)!.cover_image_id).toBeNull()
  })

  test('DELETE unknown id → 404', async () => {
    const res = await app.handle(
      req('/admin/images/9999', { method: 'DELETE', headers: authHeaders() }),
    )
    expect(res.status).toBe(404)
  })
})

// ── Интеграция с MinIO (gate по доступности) ────────────────────────────────────────
const s3config = await reachableS3Config()

describe.skipIf(!s3config)('image upload ↔ MinIO (integration)', () => {
  const cfg = s3config!
  let store: ObjectStore
  let ctx: TestCtx
  let app: ReturnType<typeof adminImageRoutes>
  let workId: number

  beforeEach(async () => {
    store = createObjectStore(cfg)
    await bootstrapStorage(cfg)
    ctx = makeCtx(store)
    app = adminImageRoutes(ctx.deps)
    workId = seedWork(ctx)
  })

  test('upload creates an `image` row + all variants in MinIO; first image becomes cover', async () => {
    const res = await app.handle(
      req(`/admin/works/${workId}/images`, {
        method: 'POST',
        headers: authHeaders(),
        body: fileForm('Главная картинка'),
      }),
    )
    expect(res.status).toBe(201)
    const img = (await res.json()) as {
      id: number
      key_base: string
      width: number
      height: number
      alt: string | null
      lqip: string | null
    }
    expect(img.key_base).toBe(imageKeyBase(workId, img.id))
    expect(img.width).toBe(3000)
    expect(img.height).toBe(2000)
    expect(img.alt).toBe('Главная картинка')
    expect(img.lqip).toMatch(/^data:image\/webp;base64,/)

    // all 6 variant objects exist
    for (const variant of IMAGE_VARIANTS) {
      for (const format of IMAGE_FORMATS) {
        expect(await store.exists(`${img.key_base}/${variant}.${format}`)).toBe(true)
      }
    }
    // first image of a coverless work → cover
    expect(ctx.repos.work.getById(workId)!.cover_image_id).toBe(img.id)
    expect(ctx.mutationCount()).toBe(1)

    await store.deletePrefix(`images/${workId}/`)
  })

  test('DELETE removes both the row AND the S3 objects, and reassigns the cover', async () => {
    const first = (await (
      await app.handle(
        req(`/admin/works/${workId}/images`, {
          method: 'POST',
          headers: authHeaders(),
          body: fileForm(),
        }),
      )
    ).json()) as { id: number; key_base: string }
    const second = (await (
      await app.handle(
        req(`/admin/works/${workId}/images`, {
          method: 'POST',
          headers: authHeaders(),
          body: fileForm(),
        }),
      )
    ).json()) as { id: number }
    // first one is the cover
    expect(ctx.repos.work.getById(workId)!.cover_image_id).toBe(first.id)

    const res = await app.handle(
      req(`/admin/images/${first.id}`, { method: 'DELETE', headers: authHeaders() }),
    )
    expect(res.status).toBe(200)
    expect(ctx.repos.image.getById(first.id)).toBeNull()
    expect(await store.count(first.key_base)).toBe(0) // S3 objects gone
    // cover reassigned to the surviving image
    expect(ctx.repos.work.getById(workId)!.cover_image_id).toBe(second.id)

    await store.deletePrefix(`images/${workId}/`)
  })
})

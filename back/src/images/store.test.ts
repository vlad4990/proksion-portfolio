// Интеграционный тест оркестратора store: pipeline → заливка всех вариантов в MinIO.
// Гейт по доступности MinIO (как и прочие S3-тесты). unit-часть (imageKeyBase) идёт всегда.

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { imageKeyBase, storeImage } from './store.ts'
import { createObjectStore, type ObjectStore } from '../storage/s3.ts'
import { bootstrapStorage } from '../storage/bootstrap.ts'
import { reachableS3Config } from '../storage/_support.ts'
import { IMAGE_FORMATS, IMAGE_VARIANTS } from '../media-url.ts'

describe('imageKeyBase', () => {
  test('строит images/{workId}/{imageId}', () => {
    expect(imageKeyBase(3, 7)).toBe('images/3/7')
  })
})

const FIXTURE = join(import.meta.dir, '__fixtures__', 'sample.png')
const input = new Uint8Array(await Bun.file(FIXTURE).arrayBuffer())
const config = await reachableS3Config()

describe.skipIf(!config)('storeImage ↔ MinIO (integration)', () => {
  const cfg = config!
  let store: ObjectStore // создаётся в beforeAll (см. пояснение в s3.test.ts)
  // Уникальные id на прогон, чтобы не пересекаться с другими объектами.
  const workId = Math.floor(Date.now() / 1000)
  const imageId = 1
  const keyBase = imageKeyBase(workId, imageId)

  beforeAll(async () => {
    store = createObjectStore(cfg)
    await bootstrapStorage(cfg)
  })
  afterAll(async () => {
    await store.deletePrefix(keyBase)
  })

  test('заливает все варианты и возвращает корректные метаданные', async () => {
    const result = await storeImage(store, workId, imageId, input)

    expect(result.key_base).toBe(keyBase)
    expect(result.width).toBe(3000)
    expect(result.height).toBe(2000)
    expect(result.lqip).toMatch(/^data:image\/webp;base64,/)

    // Все 6 ключей (thumb/full × avif/webp/jpg) существуют.
    for (const variant of IMAGE_VARIANTS) {
      for (const format of IMAGE_FORMATS) {
        expect(await store.exists(`${keyBase}/${variant}.${format}`)).toBe(true)
      }
    }
    expect(await store.count(keyBase)).toBe(IMAGE_VARIANTS.length * IMAGE_FORMATS.length)
  })

  test('идемпотентность: повторная заливка не плодит ключи (тот же key_base)', async () => {
    await storeImage(store, workId, imageId, input)
    expect(await store.count(keyBase)).toBe(IMAGE_VARIANTS.length * IMAGE_FORMATS.length)
  })

  test('public-read: анонимный GET залитого thumb.webp → 200 с image/webp', async () => {
    const url = `${cfg.endpoint.replace(/\/$/, '')}/${cfg.bucket}/${keyBase}/thumb.webp`
    const res = await fetch(url)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/webp')
  })
})

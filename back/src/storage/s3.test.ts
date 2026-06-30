// Интеграционные тесты объектного слоя (Bun.s3 ↔ MinIO). Гейт: если S3_* не заданы или MinIO
// недоступен — весь сьют skipped (не падает). Локально: поднять MinIO и задать S3_* (см. verify.md).

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createObjectStore, loadS3Config, type ObjectStore } from './s3.ts'
import { ensureBucket } from './bootstrap.ts'
import { reachableS3Config } from './_support.ts'

describe('loadS3Config', () => {
  test('дефолты и оверрайды из env', () => {
    const def = loadS3Config({})
    expect(def.endpoint).toBe('http://minio:9000')
    expect(def.bucket).toBe('media')
    expect(def.region).toBe('us-east-1')

    const ovr = loadS3Config({
      S3_ENDPOINT: 'http://localhost:9110',
      S3_BUCKET: 'b',
      S3_ACCESS_KEY: 'ak',
      S3_SECRET_KEY: 'sk',
      S3_REGION: 'eu-1',
    })
    expect(ovr).toEqual({
      endpoint: 'http://localhost:9110',
      bucket: 'b',
      accessKey: 'ak',
      secretKey: 'sk',
      region: 'eu-1',
    })
  })
})

const config = await reachableS3Config()

describe.skipIf(!config)('ObjectStore ↔ MinIO (integration)', () => {
  const cfg = config!
  // Клиент создаём в beforeAll, а не на этапе сбора: при skip колбэк describe всё равно
  // выполняется, но beforeAll/тела тестов — нет, поэтому null-конфиг не разыменовывается.
  let store: ObjectStore
  // Уникальный префикс на прогон — изоляция от прочих объектов и детерминированный count.
  const base = `images/it-${Date.now()}`

  beforeAll(async () => {
    store = createObjectStore(cfg)
    await ensureBucket(cfg)
  })
  afterAll(async () => {
    await store.deletePrefix(base)
  })

  test('round-trip: put → exists → count → delete', async () => {
    const key = `${base}/a.bin`
    expect(await store.exists(key)).toBe(false)

    await store.put(key, new Uint8Array([1, 2, 3, 4]), 'application/octet-stream')
    expect(await store.exists(key)).toBe(true)
    expect(await store.count(base)).toBe(1)

    await store.delete(key)
    expect(await store.exists(key)).toBe(false)
    expect(await store.count(base)).toBe(0)
  })

  test('deletePrefix удаляет все объекты под префиксом', async () => {
    const prefix = `${base}/grp`
    await store.put(`${prefix}/x.bin`, new Uint8Array([1]), 'application/octet-stream')
    await store.put(`${prefix}/y.bin`, new Uint8Array([2]), 'application/octet-stream')
    await store.put(`${prefix}/z.bin`, new Uint8Array([3]), 'application/octet-stream')
    expect(await store.count(prefix)).toBe(3)

    const removed = await store.deletePrefix(prefix)
    expect(removed).toBe(3)
    expect(await store.count(prefix)).toBe(0)
  })
})

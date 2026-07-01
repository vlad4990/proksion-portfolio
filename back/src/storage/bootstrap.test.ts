// Тесты bootstrap'а бакета: unit (сборка политики) + интеграция (создание бакета + public-read).
// Интеграция гейтится доступностью MinIO; unit-часть идёт всегда.

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { buildPublicReadPolicy, ensureBucket, putBucketPolicy } from './bootstrap.ts'
import { createObjectStore, type ObjectStore } from './s3.ts'
import { reachableS3Config } from './_support.ts'

describe('buildPublicReadPolicy', () => {
  test('разрешает анонимный GetObject ТОЛЬКО на images/* указанного бакета', () => {
    const policy = JSON.parse(buildPublicReadPolicy('media'))
    expect(policy.Statement).toHaveLength(1)
    const stmt = policy.Statement[0]
    expect(stmt.Effect).toBe('Allow')
    expect(stmt.Principal).toEqual({ AWS: ['*'] })
    expect(stmt.Action).toEqual(['s3:GetObject'])
    expect(stmt.Resource).toEqual(['arn:aws:s3:::media/images/*'])
  })
})

const config = await reachableS3Config()

describe.skipIf(!config)('bootstrap ↔ MinIO (integration)', () => {
  const cfg = config!
  let store: ObjectStore // создаётся в beforeAll (см. пояснение в s3.test.ts)
  const stamp = Date.now()
  const publicKey = `images/bootstrap-${stamp}/thumb.webp`
  const privateKey = `private/bootstrap-${stamp}/secret.bin`
  const objUrl = (key: string) => `${cfg.endpoint.replace(/\/$/, '')}/${cfg.bucket}/${key}`

  beforeAll(async () => {
    store = createObjectStore(cfg)
    await ensureBucket(cfg)
    await putBucketPolicy(cfg)
    await store.put(publicKey, new Uint8Array([10, 20, 30]), 'image/webp')
    await store.put(privateKey, new Uint8Array([40, 50, 60]), 'application/octet-stream')
  })
  afterAll(async () => {
    await store.deletePrefix(`images/bootstrap-${stamp}`)
    await store.deletePrefix(`private/bootstrap-${stamp}`)
  })

  test('ensureBucket идемпотентен (повторный вызов — без ошибок)', async () => {
    await ensureBucket(cfg) // бакет уже создан в beforeAll → HEAD 200, no-op
    await ensureBucket(cfg)
    // если бы упало — тест бы зафейлился; явная проверка: объект на месте
    expect(await store.exists(publicKey)).toBe(true)
  })

  test('public-read: анонимный GET объекта под images/* → 200', async () => {
    const res = await fetch(objUrl(publicKey))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/webp')
  })

  test('объект вне images/* анонимно НЕ доступен (403)', async () => {
    const res = await fetch(objUrl(privateKey))
    expect(res.status).toBe(403)
  })
})

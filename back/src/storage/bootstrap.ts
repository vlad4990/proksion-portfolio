// Bootstrap бакета MinIO на старте приложения (docs/architecture.md §5):
//   • ensureBucket()      — создать бакет `media`, если его нет (идемпотентно);
//   • putBucketPolicy()   — public-read (анонимный s3:GetObject) ТОЛЬКО на `images/*`.
//
// Эти две операции Bun.s3 не покрывает → подписанный fetch (sigv4.ts). Объекты — через s3.ts.

import type { S3Config } from './s3.ts'
import { signedFetch } from './sigv4.ts'

/** Префикс публичных объектов (картинки). Всё вне него остаётся приватным. */
export const PUBLIC_PREFIX = 'images/*'

/** JSON-политика: анонимный GET на `arn:aws:s3:::{bucket}/images/*` (и только на него). */
export function buildPublicReadPolicy(bucket: string): string {
  return JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucket}/${PUBLIC_PREFIX}`],
      },
    ],
  })
}

/**
 * Создаёт бакет `config.bucket`, если он ещё не существует. Идемпотентно:
 * HEAD bucket → 200 (есть) — no-op; 404 (нет) — PUT bucket. Гонку создания (409
 * BucketAlreadyOwnedByYou / BucketAlreadyExists) трактуем как успех.
 */
export async function ensureBucket(config: S3Config): Promise<void> {
  const head = await signedFetch(config, { method: 'HEAD', path: `/${config.bucket}` })
  if (head.status === 200) return
  if (head.status !== 404) {
    throw new Error(`ensureBucket: unexpected HEAD status ${head.status} for ${config.bucket}`)
  }
  const put = await signedFetch(config, { method: 'PUT', path: `/${config.bucket}` })
  // 200 OK | 409 уже существует (наш) — обе ситуации означают «бакет на месте».
  if (put.status !== 200 && put.status !== 409) {
    const body = await put.text().catch(() => '')
    throw new Error(`ensureBucket: PUT bucket failed ${put.status}: ${body}`)
  }
}

/** Ставит public-read политику на `images/*` бакета. Повторный вызов перезаписывает (идемпотентно). */
export async function putBucketPolicy(config: S3Config): Promise<void> {
  const policy = buildPublicReadPolicy(config.bucket)
  const res = await signedFetch(config, {
    method: 'PUT',
    path: `/${config.bucket}`,
    query: { policy: '' },
    body: policy,
    contentType: 'application/json',
  })
  if (res.status !== 200 && res.status !== 204) {
    const body = await res.text().catch(() => '')
    throw new Error(`putBucketPolicy: failed ${res.status}: ${body}`)
  }
}

/** Полный bootstrap хранилища: бакет + public-read политика. Вызывается на старте `back`. */
export async function bootstrapStorage(config: S3Config): Promise<void> {
  await ensureBucket(config)
  await putBucketPolicy(config)
}

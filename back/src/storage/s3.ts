// S3-клиент к MinIO на встроенном `Bun.S3Client` (docs/architecture.md §5) — БЕЗ AWS SDK.
// Объектные операции (put/exists/count/delete) идут здесь через Bun.s3; create-bucket и
// bucket-policy Bun.s3 не покрывает — они в bootstrap.ts через подписанный fetch (sigv4.ts).
//
// MinIO работает в path-style (`endpoint` + `virtualHostedStyle: false` по умолчанию) — то,
// что нужно для `http://minio:9000/<bucket>/<key>`.

import { S3Client } from 'bun'

export interface S3Config {
  /** URL S3-эндпоинта, напр. `http://minio:9000`. */
  endpoint: string
  /** Имя бакета (`media`). */
  bucket: string
  /** Access key (ключ приложения или root MinIO). */
  accessKey: string
  /** Secret key. */
  secretKey: string
  /** Регион для подписи SigV4 (MinIO принимает любой; дефолт `us-east-1`). */
  region: string
}

const DEFAULTS = {
  endpoint: 'http://minio:9000',
  bucket: 'media',
  region: 'us-east-1',
} as const

type Env = Record<string, string | undefined>

/** Читает конфиг S3 из env (`S3_ENDPOINT/S3_BUCKET/S3_ACCESS_KEY/S3_SECRET_KEY/S3_REGION`). */
export function loadS3Config(env: Env = process.env): S3Config {
  return {
    endpoint: env.S3_ENDPOINT ?? DEFAULTS.endpoint,
    bucket: env.S3_BUCKET ?? DEFAULTS.bucket,
    accessKey: env.S3_ACCESS_KEY ?? '',
    secretKey: env.S3_SECRET_KEY ?? '',
    region: env.S3_REGION ?? DEFAULTS.region,
  }
}

/** Создаёт низкоуровневый `Bun.S3Client`, привязанный к бакету/кредам из конфига. */
export function createS3Client(config: S3Config): S3Client {
  return new S3Client({
    endpoint: config.endpoint,
    bucket: config.bucket,
    accessKeyId: config.accessKey,
    secretAccessKey: config.secretKey,
    region: config.region,
  })
}

/** Узкий объектный интерфейс хранилища — то, чем пользуются store.ts и admin-api (задача 06). */
export interface ObjectStore {
  /** Заливает (перезаписывает) объект `key` с заданным content-type. */
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>
  /** Существует ли объект `key`. */
  exists(key: string): Promise<boolean>
  /** Сколько объектов под префиксом `prefix` (с пагинацией). */
  count(prefix: string): Promise<number>
  /** Удаляет один объект по ключу. */
  delete(key: string): Promise<void>
  /** Удаляет все объекты под префиксом; возвращает число удалённых. */
  deletePrefix(prefix: string): Promise<number>
}

/** Перечисляет ВСЕ ключи под префиксом (разворачивает пагинацию ListObjectsV2). */
async function listAllKeys(client: S3Client, prefix: string): Promise<string[]> {
  const keys: string[] = []
  let continuationToken: string | undefined
  do {
    const page = await client.list({ prefix, maxKeys: 1000, continuationToken })
    for (const entry of page.contents ?? []) keys.push(entry.key)
    continuationToken = page.isTruncated ? page.nextContinuationToken : undefined
  } while (continuationToken)
  return keys
}

/** Объектное хранилище поверх `Bun.S3Client`. */
export function createObjectStore(config: S3Config): ObjectStore {
  const client = createS3Client(config)
  return {
    async put(key, bytes, contentType) {
      await client.write(key, bytes, { type: contentType })
    },
    exists: (key) => client.exists(key),
    count: async (prefix) => (await listAllKeys(client, prefix)).length,
    async delete(key) {
      await client.delete(key)
    },
    async deletePrefix(prefix) {
      const keys = await listAllKeys(client, prefix)
      await Promise.all(keys.map((key) => client.delete(key)))
      return keys.length
    },
  }
}

// Поддержка интеграционных тестов хранилища: конфиг из env + гейт по доступности MinIO.
// Файл НЕ матчится раннером bun test (нет `.test.`/`_test.` в имени) — это хелпер, не сьют.
//
// Гейтинг (task.md / verify.md): интеграционные тесты идут ТОЛЬКО когда заданы S3_* и MinIO
// доступен; иначе помечаются skipped (не падают). Никаких креденшелов в репозитории — всё из env.

import { loadS3Config, type S3Config } from './s3.ts'

/** Конфиг для интеграции из env, либо `null` если S3_* не заданы (тогда тесты skip). */
export function testS3Config(): S3Config | null {
  const { S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY } = process.env
  if (!S3_ENDPOINT || !S3_ACCESS_KEY || !S3_SECRET_KEY) return null
  return loadS3Config()
}

/** Доступен ли MinIO по health-эндпоинту (короткий таймаут — чтобы не висеть в CI без MinIO). */
export async function minioReachable(config: S3Config): Promise<boolean> {
  try {
    const origin = new URL(config.endpoint).origin
    const res = await fetch(`${origin}/minio/health/live`, {
      signal: AbortSignal.timeout(1500),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Удобный one-shot: вернуть конфиг, если MinIO реально доступен, иначе `null`. */
export async function reachableS3Config(): Promise<S3Config | null> {
  const config = testS3Config()
  if (!config) return null
  return (await minioReachable(config)) ? config : null
}

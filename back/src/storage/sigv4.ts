// Минимальный AWS SigV4-подписыватель для bucket-level операций MinIO.
//
// ПОЧЕМУ это здесь, а не через Bun.s3: встроенный `Bun.S3Client` покрывает только операции с
// объектами (put/exists/list/delete), но НЕ умеет create-bucket и put-bucket-policy. Это и есть
// задокументированный край «Bun.s3 упрётся в совместимость» (task.md / spec §5): объекты — через
// Bun.s3, а две административные операции бакета — здесь, подписанным `fetch` без AWS SDK.
//
// Используется ТОЛЬКО bootstrap.ts (ensureBucket / putBucketPolicy). На объектном пути не нужен.

import { createHash, createHmac } from 'node:crypto'
import type { S3Config } from './s3.ts'

const SERVICE = 's3'
const ALGORITHM = 'AWS4-HMAC-SHA256'
const EMPTY_SHA256 = createHash('sha256').update('').digest('hex')

function sha256Hex(data: string | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex')
}
function hmac(key: string | Buffer, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest()
}

/** YYYYMMDD'T'HHMMSS'Z' (x-amz-date) и YYYYMMDD (для credential scope). */
function amzDate(now: Date): { amz: string; stamp: string } {
  const amz = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  return { amz, stamp: amz.slice(0, 8) }
}

/** RFC3986-кодирование сегмента пути/значения (S3-канон: кодируем всё, кроме unreserved). */
function uriEncode(value: string, encodeSlash: boolean): string {
  let out = ''
  for (const ch of value) {
    if (/[A-Za-z0-9_.~-]/.test(ch)) out += ch
    else if (ch === '/') out += encodeSlash ? '%2F' : '/'
    else out += encodeURIComponent(ch).replace(/[!*'()]/g, (c) =>
      `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
    )
  }
  return out
}

export interface SignedRequest {
  method: 'GET' | 'PUT' | 'HEAD' | 'DELETE'
  /** Путь от корня endpoint, начиная со `/` (например `/media`). */
  path: string
  /** Канонические query-параметры (например `{ policy: '' }`). */
  query?: Record<string, string>
  /** Тело запроса (строка/байты) — для put-policy. */
  body?: string | Uint8Array
  contentType?: string
}

/**
 * Подписывает и выполняет SigV4-запрос к endpoint'у MinIO. Возвращает `Response` как есть —
 * вызывающая сторона сама трактует коды (200/404/409). `now` инъектируется для тестируемости.
 */
export async function signedFetch(
  config: S3Config,
  req: SignedRequest,
  now: Date = new Date(),
): Promise<Response> {
  const url = new URL(config.endpoint)
  const host = url.host
  const { amz, stamp } = amzDate(now)
  const scope = `${stamp}/${config.region}/${SERVICE}/aws4_request`

  // Копируем в свежий ArrayBuffer-бэкинг (Uint8Array<ArrayBuffer>) — так тип проходит как BodyInit.
  const bodyBytes: Uint8Array<ArrayBuffer> =
    req.body === undefined
      ? new Uint8Array(0)
      : typeof req.body === 'string'
        ? new Uint8Array(new TextEncoder().encode(req.body))
        : new Uint8Array(req.body)
  const payloadHash = req.body === undefined ? EMPTY_SHA256 : sha256Hex(bodyBytes)

  // Канонический путь: кодируем сегменты, '/' сохраняем.
  const canonicalUri = uriEncode(req.path, false)

  // Канонические query: сортировка по ключу, кодирование ключа и значения.
  const query = req.query ?? {}
  const canonicalQuery = Object.keys(query)
    .sort()
    .map((k) => `${uriEncode(k, true)}=${uriEncode(query[k] ?? '', true)}`)
    .join('&')

  // Заголовки, входящие в подпись (отсортированы, имена в нижнем регистре).
  const headers: Record<string, string> = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amz,
  }
  if (req.contentType) headers['content-type'] = req.contentType
  const signedHeaderNames = Object.keys(headers).sort()
  const canonicalHeaders = signedHeaderNames.map((n) => `${n}:${headers[n]}\n`).join('')
  const signedHeaders = signedHeaderNames.join(';')

  const canonicalRequest = [
    req.method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  const stringToSign = [ALGORITHM, amz, scope, sha256Hex(canonicalRequest)].join('\n')

  const kDate = hmac(`AWS4${config.secretKey}`, stamp)
  const kRegion = hmac(kDate, config.region)
  const kService = hmac(kRegion, SERVICE)
  const kSigning = hmac(kService, 'aws4_request')
  const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex')

  const authorization =
    `${ALGORITHM} Credential=${config.accessKey}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`

  const target = `${config.endpoint.replace(/\/$/, '')}${req.path}` +
    (canonicalQuery ? `?${canonicalQuery}` : '')

  const fetchHeaders: Record<string, string> = {
    Authorization: authorization,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amz,
  }
  if (req.contentType) fetchHeaders['content-type'] = req.contentType

  return fetch(target, {
    method: req.method,
    headers: fetchHeaders,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : bodyBytes,
  })
}

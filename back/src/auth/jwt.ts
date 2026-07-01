// Минимальный JWT HS256 без зависимостей (docs/architecture.md §7).
// В проекте принято катать криптографию на стандартном `node:crypto` (см. storage/sigv4.ts),
// а CLAUDE.md запрещает лишние зависимости — поэтому подпись/проверка токена тут свои,
// а не через @elysiajs/jwt. Алгоритм фиксирован HS256; секрет — `JWT_SECRET` из env.

import { createHmac, timingSafeEqual } from 'node:crypto'

export interface JwtClaims {
  /** Subject — для одного редактора это просто 'admin'. */
  sub: string
}

export interface JwtPayload extends JwtClaims {
  /** issued-at (unix seconds) */
  iat: number
  /** expiry (unix seconds) */
  exp: number
}

const HEADER = { alg: 'HS256', typ: 'JWT' } as const

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url')
}

function hmac(data: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(data).digest()
}

/** Подписать токен с TTL (секунды). `nowMs` инъектируется в тестах. */
export function signToken(
  claims: JwtClaims,
  secret: string,
  ttlSeconds: number,
  nowMs: number = Date.now(),
): string {
  const iat = Math.floor(nowMs / 1000)
  const payload: JwtPayload = { sub: claims.sub, iat, exp: iat + ttlSeconds }
  const head = b64url(JSON.stringify(HEADER))
  const body = b64url(JSON.stringify(payload))
  const sig = b64url(hmac(`${head}.${body}`, secret))
  return `${head}.${body}.${sig}`
}

function isPayload(value: unknown): value is JwtPayload {
  if (typeof value !== 'object' || value === null) return false
  const o = value as Record<string, unknown>
  return typeof o.sub === 'string' && typeof o.iat === 'number' && typeof o.exp === 'number'
}

/**
 * Проверить токен: формат, подпись (constant-time) и срок. Любой сбой → `null`,
 * никогда не бросает.
 */
export function verifyToken(
  token: string,
  secret: string,
  nowMs: number = Date.now(),
): JwtPayload | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [head, body, sig] = parts

  const expected = hmac(`${head}.${body}`, secret)
  const given = Buffer.from(sig, 'base64url')
  if (given.length === 0 || given.length !== expected.length) return null
  if (!timingSafeEqual(given, expected)) return null

  let payload: unknown
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (!isPayload(payload)) return null
  if (payload.exp <= Math.floor(nowMs / 1000)) return null
  return payload
}

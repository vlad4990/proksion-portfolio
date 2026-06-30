// Guard для admin-эндпоинтов (docs/architecture.md §7): проверка cookie-JWT.
// Защищает все `/admin/*` КРОМЕ `/admin/login` (login сам выставляет cookie).
//
// Здесь — чистые помощники (парс cookie, извлечение identity) + фабрика beforeHandle-хука
// для Elysia. Чистые функции переиспользует задача 06 для своих admin-CRUD роутов.

import { verifyToken } from './jwt.ts'

/** Идентичность редактора, извлечённая из валидного токена. */
export interface Identity {
  sub: string
}

/** Имя cookie с JWT-сессией админки. */
export const AUTH_COOKIE = 'proksion_admin'

/** Распарсить заголовок `Cookie` в map (терпит пробелы/пустые сегменты). */
export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) return out
  for (const segment of header.split(';')) {
    const eq = segment.indexOf('=')
    if (eq < 0) continue
    const key = segment.slice(0, eq).trim()
    const value = segment.slice(eq + 1).trim()
    if (key) out[key] = value
  }
  return out
}

/** Достать identity из заголовков запроса, если auth-cookie валидна; иначе `null`. */
export function identityFromRequest(headers: Headers, jwtSecret: string): Identity | null {
  const token = parseCookies(headers.get('cookie'))[AUTH_COOKIE]
  if (!token) return null
  const payload = verifyToken(token, jwtSecret)
  return payload ? { sub: payload.sub } : null
}

/** Минимальный контекст, который читает/мутирует guard (совместим с Elysia Context). */
interface GuardContext {
  request: Request
  set: { status?: number | string }
}

/**
 * beforeHandle-хук: 401, если нет валидной auth-cookie. Возврат значения короткозамыкает
 * запрос в Elysia; `undefined` — пропустить дальше.
 */
export function makeAuthGuard(jwtSecret: string) {
  return (ctx: GuardContext): { error: string } | undefined => {
    if (identityFromRequest(ctx.request.headers, jwtSecret)) return undefined
    ctx.set.status = 401
    return { error: 'unauthorized' }
  }
}

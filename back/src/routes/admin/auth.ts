// Auth-роуты админки (docs/architecture.md §7): login / logout / me.
// Объявляются ОТ КОРНЯ как `/admin/*` — снаружи это `/api/admin/*` (Caddy срезает `/api`).
// Guard защищает всё `/admin/*` КРОМЕ `/admin/login`; мутации требуют CSRF-заголовок;
// `/admin/login` под rate-limit. Admin-CRUD (задача 06) подключится к тем же guard/csrf-хукам.

import { Elysia } from 'elysia'
import type { AuthConfig } from '../../auth/config.ts'
import { verifyPassword } from '../../auth/password.ts'
import { signToken } from '../../auth/jwt.ts'
import { AUTH_COOKIE, identityFromRequest, makeAuthGuard } from '../../auth/guard.ts'
import { makeCsrfGuard } from '../../auth/csrf.ts'
import { createRateLimiter } from '../../auth/rate-limit.ts'

/** Subject в токене — у нас один редактор. */
const SUBJECT = 'admin'

/** Опции для тестов (инъекция времени в подпись токена). */
export interface AdminAuthOptions {
  now?: () => number
}

function readPassword(body: unknown): string | null {
  if (typeof body === 'object' && body !== null && 'password' in body) {
    const value = (body as Record<string, unknown>).password
    if (typeof value === 'string') return value
  }
  return null
}

/** Ключ rate-limit: реальный клиент за Caddy приходит в `X-Forwarded-For`. */
function clientKey(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return 'local'
}

function sessionCookie(token: string, cfg: AuthConfig): string {
  const parts = [
    `${AUTH_COOKIE}=${token}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${cfg.tokenTtlSeconds}`,
  ]
  if (cfg.cookieSecure) parts.push('Secure')
  return parts.join('; ')
}

function clearedCookie(cfg: AuthConfig): string {
  const parts = [`${AUTH_COOKIE}=`, 'HttpOnly', 'Path=/', 'SameSite=Lax', 'Max-Age=0']
  if (cfg.cookieSecure) parts.push('Secure')
  return parts.join('; ')
}

export function adminAuthRoutes(cfg: AuthConfig, opts: AdminAuthOptions = {}) {
  const now = opts.now ?? Date.now
  const limiter = createRateLimiter({ ...cfg.loginRateLimit, now })
  const authGuard = makeAuthGuard(cfg.jwtSecret)
  const csrfGuard = makeCsrfGuard()

  return new Elysia()
    // Логин — без guard, под rate-limit. Сообщение об ошибке не раскрывает деталей.
    .post('/admin/login', async ({ request, body, set }) => {
      if (!limiter.check(clientKey(request.headers))) {
        set.status = 429
        return { error: 'too_many_requests' }
      }
      const password = readPassword(body)
      if (password === null || !(await verifyPassword(password, cfg.passwordHash))) {
        set.status = 401
        return { error: 'unauthorized' }
      }
      const token = signToken({ sub: SUBJECT }, cfg.jwtSecret, cfg.tokenTtlSeconds, now())
      set.headers['set-cookie'] = sessionCookie(token, cfg)
      return { ok: true }
    })

    // Проверка сессии — за guard.
    .get('/admin/me', ({ request, set }) => {
      const identity = identityFromRequest(request.headers, cfg.jwtSecret)
      if (!identity) {
        set.status = 401
        return { error: 'unauthorized' }
      }
      return identity
    }, { beforeHandle: authGuard })

    // Logout — мутация: guard (401) затем CSRF (403), потом чистим cookie.
    .post('/admin/logout', ({ set }) => {
      set.headers['set-cookie'] = clearedCookie(cfg)
      return { ok: true }
    }, { beforeHandle: [authGuard, csrfGuard] })
}

// CSRF-защита мутаций admin-API (docs/architecture.md §7).
// Cookie-сессия + SameSite=Lax уже отсекают cross-site POST из форм; в дополнение требуем
// кастомный заголовок `X-Requested-With` на мутирующих методах. Простой fetch его не
// выставляет (cross-origin XHR без CORS-preflight такой заголовок не пошлёт), а наш админ-фронт
// шлёт его явно. Read-методы (GET/HEAD/OPTIONS) не трогаем.

/** Заголовок-маркер «запрос инициирован нашим фронтом». */
export const CSRF_HEADER = 'x-requested-with'

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/** true, если метод безопасен (read) либо несёт CSRF-заголовок. */
export function isCsrfSafe(method: string, headers: Headers): boolean {
  if (!MUTATING.has(method.toUpperCase())) return true
  return headers.get(CSRF_HEADER) !== null
}

interface CsrfContext {
  request: Request
  set: { status?: number | string }
}

/** beforeHandle-хук: 403, если мутация без CSRF-заголовка. */
export function makeCsrfGuard() {
  return (ctx: CsrfContext): { error: string } | undefined => {
    if (isCsrfSafe(ctx.request.method, ctx.request.headers)) return undefined
    ctx.set.status = 403
    return { error: 'csrf_required' }
  }
}

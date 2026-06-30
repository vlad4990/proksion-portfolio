// Типизированный API-клиент админки (docs/architecture.md §7, §8).
// База — `/api` (в dev проксируется на back:3001 с rewrite `/api` → корень; в проде Caddy
// срезает `/api`). Cookie-сессия → `credentials: 'include'`. Мутации (POST/PUT/PATCH/DELETE)
// несут CSRF-заголовок `X-Requested-With` (совместимо с задачей 05). 401 дёргает глобальный
// обработчик (разлогин/редирект на /admin/login).

/** Базовый префикс API. Совпадает с тем, что срезает Caddy (`handle_path /api/*`). */
export const API_BASE = '/api'

/** CSRF-маркер: кастомный заголовок, который простой cross-site fetch не выставит (задача 05). */
export const CSRF_HEADER = 'X-Requested-With'
const CSRF_VALUE = 'fetch'

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** Тело ошибки бэкенда (`{ error, detail? }`). */
export interface ApiErrorBody {
  error: string
  detail?: string
}

/** Ошибка HTTP-ответа: несёт статус и распарсенное тело (если было JSON). */
export class ApiError extends Error {
  readonly status: number
  readonly body: ApiErrorBody | null

  constructor(status: number, body: ApiErrorBody | null) {
    super(body?.error ?? `HTTP ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export interface RequestOptions {
  method?: HttpMethod
  /** JSON-сериализуемое тело (для мутаций). */
  body?: unknown
  signal?: AbortSignal
}

// ── Глобальный обработчик 401 ──────────────────────────────────────────────────────
// Сессия-стор регистрирует колбэк (сброс состояния + редирект на login), чтобы любой
// протухший запрос централизованно разлогинивал.

type UnauthorizedHandler = () => void
let unauthorizedHandler: UnauthorizedHandler | null = null

/** Зарегистрировать обработчик 401 (вызывается до бросания ApiError). `null` снимает его. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text()
  if (text === '') return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as Record<string, unknown>).error === 'string'
  )
}

/** Низкоуровневый запрос: собирает заголовки/тело, шлёт fetch, разбирает ответ/ошибки. */
export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const method = opts.method ?? 'GET'
  const headers: Record<string, string> = {}

  let body: BodyInit | undefined
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.body)
  }
  if (MUTATING_METHODS.has(method)) {
    headers[CSRF_HEADER] = CSRF_VALUE
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body,
    credentials: 'include',
    signal: opts.signal,
  })

  if (res.status === 401) {
    unauthorizedHandler?.()
  }

  if (!res.ok) {
    const parsed = await parseJson(res)
    throw new ApiError(res.status, isErrorBody(parsed) ? parsed : null)
  }

  return (await parseJson(res)) as T
}

/** Удобные методы поверх `apiRequest`. */
export const api = {
  get: <T>(path: string, signal?: AbortSignal): Promise<T> =>
    apiRequest<T>(path, { method: 'GET', signal }),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> =>
    apiRequest<T>(path, { method: 'POST', body, signal }),
  patch: <T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> =>
    apiRequest<T>(path, { method: 'PATCH', body, signal }),
  delete: <T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> =>
    apiRequest<T>(path, { method: 'DELETE', body, signal }),
}

// Простой in-memory rate-limiter с фиксированным окном (docs/architecture.md §7, §10).
// Используется на `/admin/login` для защиты от перебора пароля. Состояние — в памяти процесса
// (одного редактора и одного инстанса бэка достаточно; распределённый лимит вне скоупа).

export interface RateLimiterOptions {
  /** Максимум разрешённых попыток в окне. */
  max: number
  /** Длина окна в миллисекундах. */
  windowMs: number
  /** Источник времени (инъекция для тестов). */
  now?: () => number
}

export interface RateLimiter {
  /** Зарегистрировать попытку. `true` — разрешено; `false` — лимит превышен. */
  check(key: string): boolean
}

export function createRateLimiter(opts: RateLimiterOptions): RateLimiter {
  const { max, windowMs } = opts
  const now = opts.now ?? Date.now
  const hits = new Map<string, number[]>()

  return {
    check(key: string): boolean {
      const t = now()
      const recent = (hits.get(key) ?? []).filter((ts) => t - ts < windowMs)
      if (recent.length >= max) {
        hits.set(key, recent)
        return false
      }
      recent.push(t)
      hits.set(key, recent)
      return true
    },
  }
}

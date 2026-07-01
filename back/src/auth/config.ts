// Конфиг auth-слоя из env (docs/architecture.md §11). По образцу storage/s3.ts: отдельный
// загрузчик, чтобы основной config.ts не разрастался. Секреты — только из env, дефолты безопасны.

export interface AuthConfig {
  /** argon2id-хэш пароля редактора (`ADMIN_PASSWORD_HASH`). Пусто → логин невозможен. */
  passwordHash: string
  /** Секрет подписи JWT (`JWT_SECRET`). */
  jwtSecret: string
  /** Время жизни токена/cookie в секундах (`AUTH_TTL_SECONDS`). Короткий по умолчанию. */
  tokenTtlSeconds: number
  /** Флаг Secure на cookie (`COOKIE_SECURE`). Дефолт — true (безопасно); в dev по HTTP → false. */
  cookieSecure: boolean
  /** Лимит попыток логина (`AUTH_LOGIN_MAX` / `AUTH_LOGIN_WINDOW_MINUTES`). */
  loginRateLimit: { max: number; windowMs: number }
}

type Env = Record<string, string | undefined>

const DEFAULTS = {
  tokenTtlSeconds: 60 * 60 * 2, // 2 часа — «короткий TTL» (§7)
  loginMax: 5,
  loginWindowMinutes: 5,
} as const

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : fallback
}

export function loadAuthConfig(env: Env = process.env): AuthConfig {
  return {
    passwordHash: env.ADMIN_PASSWORD_HASH ?? '',
    jwtSecret: env.JWT_SECRET ?? '',
    tokenTtlSeconds: parsePositiveInt(env.AUTH_TTL_SECONDS, DEFAULTS.tokenTtlSeconds),
    // Безопасный дефолт — Secure включён; явный COOKIE_SECURE=false снимает его для dev по HTTP.
    cookieSecure: env.COOKIE_SECURE !== 'false',
    loginRateLimit: {
      max: parsePositiveInt(env.AUTH_LOGIN_MAX, DEFAULTS.loginMax),
      windowMs: parsePositiveInt(env.AUTH_LOGIN_WINDOW_MINUTES, DEFAULTS.loginWindowMinutes) * 60_000,
    },
  }
}

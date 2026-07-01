// Типизированное чтение env с дефолтами (docs/architecture.md §11).
// Здесь — только то, что нужно слою данных/каркасу (DATABASE_PATH, BACK_PORT).
// Переменные MinIO/JWT/бэкапа появятся в своих задачах (03/05/06).

export interface Config {
  /** Путь к файлу SQLite (`:memory:` для тестов). */
  databasePath: string
  /** TCP-порт HTTP-сервера бэкенда. */
  backPort: number
}

type Env = Record<string, string | undefined>

const DEFAULTS = {
  databasePath: '/data/db.sqlite',
  backPort: 3001,
} as const

function parsePort(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : fallback
}

export function loadConfig(env: Env = process.env): Config {
  return {
    databasePath: env.DATABASE_PATH ?? DEFAULTS.databasePath,
    backPort: parsePort(env.BACK_PORT, DEFAULTS.backPort),
  }
}

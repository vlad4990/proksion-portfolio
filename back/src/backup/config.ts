// Конфиг off-site бэкапа из env (docs/architecture.md §11). rclone-раннер вызывает
// вендоренный в образ `rclone` (задача 11); токен облака живёт в rclone.conf, НЕ здесь.

export interface BackupConfig {
  /** Включён ли автобэкап. Opt-in: только при BACKUP_ENABLED="true". */
  enabled: boolean
  /** Дебаунс push после изменения, в миллисекундах. */
  debounceMs: number
  /** Базовый remote-путь облака в rclone.conf, напр. `cloud:proksion`. */
  remote: string
  /** Путь к `rclone.conf` (флаг `--config`); монтируется секретом/volume. */
  rcloneConfig: string
  /** Сколько версий БД хранить в `history/` (retention). */
  historyKeep: number
}

type Env = Record<string, string | undefined>

const DEFAULTS = {
  debounceMinutes: 10,
  remote: 'cloud:proksion',
  rcloneConfig: '/config/rclone.conf',
  historyKeep: 14,
} as const

/** Положительное целое из env, иначе fallback (не-число / ≤0 → fallback). */
function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : fallback
}

export function loadBackupConfig(env: Env = process.env): BackupConfig {
  return {
    enabled: env.BACKUP_ENABLED === 'true',
    debounceMs: parsePositiveInt(env.BACKUP_DEBOUNCE_MINUTES, DEFAULTS.debounceMinutes) * 60_000,
    remote: env.BACKUP_REMOTE ?? DEFAULTS.remote,
    rcloneConfig: env.RCLONE_CONFIG ?? DEFAULTS.rcloneConfig,
    historyKeep: parsePositiveInt(env.BACKUP_HISTORY_KEEP, DEFAULTS.historyKeep),
  }
}

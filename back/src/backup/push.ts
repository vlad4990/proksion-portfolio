// Push-бэкап (docs/architecture.md §9): консистентный снимок БД → зеркалирование картинок в
// облако (ПЕРВЫМИ) → заливка БД + версия в history → retention. Порядок «картинки → БД»
// критичен: облачная БД не должна ссылаться на ещё не залитые картинки.

import type { Database } from 'bun:sqlite'
import { dirname, join } from 'node:path'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import type { Rclone } from './runner.ts'

/** Готовые пути push (локальный стейдж + remote-адреса). */
export interface BackupPaths {
  /** Локальный путь снимка БД (VACUUM INTO), напр. `/data/backup-stage/db.sqlite`. */
  stageDbPath: string
  /** Источник картинок в MinIO, напр. `minio:media`. */
  minioMedia: string
  /** Зеркало картинок в облаке, напр. `cloud:proksion/media`. */
  cloudMedia: string
  /** Каноничный файл БД в облаке, напр. `cloud:proksion/db/db.sqlite`. */
  cloudDb: string
  /** Каталог версий БД в облаке, напр. `cloud:proksion/db/history`. */
  cloudHistory: string
}

/** Раскладывает пути push из БД/бакета/remote. `minioRemote` — имя s3-remote в rclone.conf. */
export function resolveBackupPaths(opts: {
  databasePath: string
  bucket: string
  remote: string
  minioRemote?: string
}): BackupPaths {
  const minioRemote = opts.minioRemote ?? 'minio'
  return {
    stageDbPath: join(dirname(opts.databasePath), 'backup-stage', 'db.sqlite'),
    minioMedia: `${minioRemote}:${opts.bucket}`,
    cloudMedia: `${opts.remote}/media`,
    cloudDb: `${opts.remote}/db/db.sqlite`,
    cloudHistory: `${opts.remote}/db/history`,
  }
}

/**
 * Консистентный снимок БД через `VACUUM INTO` (корректно с WAL, §3). Создаёт каталог назначения
 * и удаляет прежний снимок (VACUUM INTO требует, чтобы целевого файла не было). Синхронно.
 */
export function snapshotDatabase(db: Database, destPath: string): void {
  mkdirSync(dirname(destPath), { recursive: true })
  if (existsSync(destPath)) rmSync(destPath)
  const escaped = destPath.replace(/'/g, "''") // destPath из конфига (доверенный), экранируем кавычки
  db.run(`VACUUM INTO '${escaped}'`)
}

const VERSION_RE = /^db-.*\.sqlite$/

/**
 * Какие версии из `filenames` удалить, оставив `keep` НОВЕЙШИХ. Имена вида `db-<ts>.sqlite`,
 * где `<ts>` — сортируемая метка (ISO с заменой `:`/`.` на `-`). Посторонние файлы игнорируются.
 */
export function selectVersionsToDelete(filenames: readonly string[], keep: number): string[] {
  const keepN = Math.max(0, keep)
  const versions = filenames.filter((name) => VERSION_RE.test(name)).sort() // старейшие первыми
  return versions.slice(0, Math.max(0, versions.length - keepN)) // отрезаем самые старые
}

export interface PushDeps {
  /** Снимок БД в стейдж-файл (VACUUM INTO). Инъекция: в проде — snapshotDatabase(db, …). */
  snapshotDb: (destPath: string) => void | Promise<void>
  rclone: Rclone
  paths: BackupPaths
  /** Сколько версий БД хранить в history/. */
  historyKeep: number
  /** Сортируемая метка версии (ISO без `:`/`.`). Инъекция для детерминизма в тестах. */
  timestamp: () => string
  log?: (msg: string) => void
}

/**
 * Один прогон push. Строгий порядок (§9):
 *   1) VACUUM INTO снимок БД;
 *   2) rclone sync minio→cloud (КАРТИНКИ ПЕРВЫМИ);
 *   3) rclone copyto db→cloud (каноничная) + версия в history/;
 *   4) retention: удалить версии сверх historyKeep.
 */
export async function runPush(deps: PushDeps): Promise<void> {
  const { rclone, paths } = deps

  await deps.snapshotDb(paths.stageDbPath)

  // 2) Картинки — раньше БД.
  await rclone.sync(paths.minioMedia, paths.cloudMedia)

  // 3) БД: каноничная копия + версия в history.
  await rclone.copyto(paths.stageDbPath, paths.cloudDb)
  const versionPath = `${paths.cloudHistory}/db-${deps.timestamp()}.sqlite`
  await rclone.copyto(paths.stageDbPath, versionPath)

  // 4) Retention.
  const existing = await rclone.lsf(paths.cloudHistory)
  const stale = selectVersionsToDelete(existing, deps.historyKeep)
  for (const name of stale) {
    await rclone.deletefile(`${paths.cloudHistory}/${name}`)
  }
  if (stale.length > 0) deps.log?.(`retention: удалено старых версий БД — ${stale.length}`)
}

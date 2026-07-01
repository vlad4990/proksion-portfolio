import { afterAll, describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Rclone } from './runner.ts'
import {
  resolveBackupPaths,
  runPush,
  selectVersionsToDelete,
  snapshotDatabase,
  type BackupPaths,
} from './push.ts'

const PATHS: BackupPaths = {
  stageDbPath: '/data/backup-stage/db.sqlite',
  minioMedia: 'minio:media',
  cloudMedia: 'cloud:proksion/media',
  cloudDb: 'cloud:proksion/db/db.sqlite',
  cloudHistory: 'cloud:proksion/db/history',
}

// Мок-rclone: записывает события в общий журнал (для проверки порядка шагов).
function recordingRclone(events: string[], historyList: string[] = []): Rclone {
  return {
    sync: async (src, dst) => void events.push(`sync:${src}->${dst}`),
    copyto: async (src, dst) => void events.push(`copyto:${src}->${dst}`),
    lsf: async (remote) => {
      events.push(`lsf:${remote}`)
      return historyList
    },
    deletefile: async (remote) => void events.push(`del:${remote}`),
  }
}

describe('resolveBackupPaths', () => {
  test('раскладывает пути push из databasePath/bucket/remote', () => {
    const p = resolveBackupPaths({
      databasePath: '/data/db.sqlite',
      bucket: 'media',
      remote: 'cloud:proksion',
    })
    expect(p.stageDbPath).toBe('/data/backup-stage/db.sqlite')
    expect(p.minioMedia).toBe('minio:media')
    expect(p.cloudMedia).toBe('cloud:proksion/media')
    expect(p.cloudDb).toBe('cloud:proksion/db/db.sqlite')
    expect(p.cloudHistory).toBe('cloud:proksion/db/history')
  })

  test('учитывает кастомное имя s3-remote', () => {
    const p = resolveBackupPaths({
      databasePath: '/data/db.sqlite',
      bucket: 'media',
      remote: 'cloud:proksion',
      minioRemote: 's3store',
    })
    expect(p.minioMedia).toBe('s3store:media')
  })
})

describe('selectVersionsToDelete (retention)', () => {
  const files = ['db-2026-01-01.sqlite', 'db-2026-03-01.sqlite', 'db-2026-02-01.sqlite']

  test('оставляет N новейших, к удалению — старейшие', () => {
    expect(selectVersionsToDelete(files, 2)).toEqual(['db-2026-01-01.sqlite'])
    expect(selectVersionsToDelete(files, 1)).toEqual(['db-2026-01-01.sqlite', 'db-2026-02-01.sqlite'])
  })

  test('keep >= число версий → удалять нечего', () => {
    expect(selectVersionsToDelete(files, 3)).toEqual([])
    expect(selectVersionsToDelete(files, 99)).toEqual([])
  })

  test('игнорирует посторонние файлы (не db-*.sqlite)', () => {
    expect(selectVersionsToDelete(['db-a.sqlite', 'notes.txt', 'README'], 0)).toEqual(['db-a.sqlite'])
  })
})

describe('runPush — порядок шагов (verify: картинки раньше БД)', () => {
  test('snapshot → sync(картинки) → copyto(БД) → copyto(history) → retention', async () => {
    const events: string[] = []
    // 4 версии в history; keep=3 → удалить 1 старейшую
    const history = [
      'db-2026-01.sqlite',
      'db-2026-02.sqlite',
      'db-2026-03.sqlite',
      'db-2026-04.sqlite',
    ]
    await runPush({
      snapshotDb: (dest) => void events.push(`snapshot:${dest}`),
      rclone: recordingRclone(events, history),
      paths: PATHS,
      historyKeep: 3,
      timestamp: () => '2026-07-01T00-00-00-000Z',
    })

    expect(events).toEqual([
      'snapshot:/data/backup-stage/db.sqlite',
      'sync:minio:media->cloud:proksion/media',
      'copyto:/data/backup-stage/db.sqlite->cloud:proksion/db/db.sqlite',
      'copyto:/data/backup-stage/db.sqlite->cloud:proksion/db/history/db-2026-07-01T00-00-00-000Z.sqlite',
      'lsf:cloud:proksion/db/history',
      'del:cloud:proksion/db/history/db-2026-01.sqlite',
    ])

    // Явно: картинки (sync) залиты раньше БД (первый copyto).
    const iSync = events.findIndex((e) => e.startsWith('sync:'))
    const iDb = events.findIndex((e) => e.startsWith('copyto:'))
    expect(iSync).toBeLessThan(iDb)
  })

  test('без превышения истории — никаких deletefile', async () => {
    const events: string[] = []
    await runPush({
      snapshotDb: () => {},
      rclone: recordingRclone(events, ['db-2026-07-01T00-00-00-000Z.sqlite']),
      paths: PATHS,
      historyKeep: 14,
      timestamp: () => '2026-07-01T00-00-00-000Z',
    })
    expect(events.some((e) => e.startsWith('del:'))).toBe(false)
  })
})

describe('snapshotDatabase (реальный VACUUM INTO через bun:sqlite)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'snap-'))
  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  test('создаёт консистентную копию БД (создавая недостающие каталоги)', () => {
    const srcPath = join(dir, 'src.sqlite')
    const src = new Database(srcPath, { create: true })
    src.run('PRAGMA journal_mode = WAL')
    src.run('CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)')
    src.run("INSERT INTO t (v) VALUES ('hello')")

    const dest = join(dir, 'nested', 'stage', 'db.sqlite') // вложенный путь → проверяем mkdir
    snapshotDatabase(src, dest)
    expect(existsSync(dest)).toBe(true)

    const copy = new Database(dest, { readonly: true })
    const row = copy.query('SELECT v FROM t WHERE id = 1').get() as { v: string } | null
    expect(row?.v).toBe('hello')
    copy.close()

    // Идемпотентность: повторный снимок перезаписывает уже существующий файл без ошибки.
    src.run("INSERT INTO t (v) VALUES ('world')")
    snapshotDatabase(src, dest)
    const copy2 = new Database(dest, { readonly: true })
    const count = copy2.query('SELECT COUNT(*) AS n FROM t').get() as { n: number }
    expect(count.n).toBe(2)
    copy2.close()
    src.close()
  })
})

// Интеграция против РЕАЛЬНОГО rclone-бинаря на local-remote (обычные пути — облако не нужно,
// verify.md: «cloud-remote может быть тестовым/local»). Гейтится наличием rclone на машине.
//
// Раннер оборачиваем записывающим прокси: команды исполняет настоящий rclone, а argv пишем —
// так проверяем И реальный эффект на ФС, И строгий порядок «картинки → БД».

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createCommandRunner, createRclone, type CommandRunner } from './runner.ts'
import { runPush, snapshotDatabase, type BackupPaths } from './push.ts'
import { restoreOnBoot } from './restore.ts'

const rcloneBin = Bun.which('rclone')

describe.skipIf(!rcloneBin)('backup push/restore ↔ real rclone (local-remote integration)', () => {
  let root: string
  let cfgPath: string
  let db: Database
  let paths: BackupPaths

  // Записывающий прокси поверх реального раннера: фиксирует argv, исполняет по-настоящему.
  const calls: string[][] = []
  const recordingRunner: CommandRunner = async (argv) => {
    calls.push([...argv])
    return createCommandRunner()(argv)
  }
  const subcommands = () => calls.map((c) => c[3]) // ['rclone','--config',cfg,<subcmd>,...]

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'bkp-it-'))
    cfgPath = join(root, 'rclone.conf')
    writeFileSync(cfgPath, '') // local-путям remote не нужен

    // «Бакет MinIO» с картинками (локальный каталог как s3-источник для sync).
    const minioMedia = join(root, 'minio-media')
    mkdirSync(join(minioMedia, 'images', '1', '10'), { recursive: true })
    writeFileSync(join(minioMedia, 'images', '1', '10', 'thumb.webp'), 'IMG-BYTES')

    // Локальная БД с данными (снимок делает реальный VACUUM INTO).
    const dbPath = join(root, 'db.sqlite')
    db = new Database(dbPath, { create: true })
    db.run('PRAGMA journal_mode = WAL')
    db.run('CREATE TABLE work (id INTEGER PRIMARY KEY, title TEXT)')
    db.run("INSERT INTO work (title) VALUES ('Афиша')")

    paths = {
      stageDbPath: join(root, 'backup-stage', 'db.sqlite'),
      minioMedia,
      cloudMedia: join(root, 'cloud', 'media'),
      cloudDb: join(root, 'cloud', 'db', 'db.sqlite'),
      cloudHistory: join(root, 'cloud', 'db', 'history'),
    }
  })
  afterAll(() => {
    db?.close()
    rmSync(root, { recursive: true, force: true })
  })

  test('push кладёт в облако картинки + БД + версию в history; картинки залиты раньше БД', async () => {
    let n = 0
    const rclone = createRclone(recordingRunner, cfgPath)
    await runPush({
      snapshotDb: (dest) => snapshotDatabase(db, dest),
      rclone,
      paths,
      historyKeep: 14,
      timestamp: () => `2026-07-01T00-00-0${n++}-000Z`,
    })

    // Реальный эффект на ФС.
    expect(existsSync(paths.cloudDb)).toBe(true)
    expect(existsSync(join(paths.cloudMedia, 'images', '1', '10', 'thumb.webp'))).toBe(true)
    const versions = readdirSync(paths.cloudHistory)
    expect(versions).toHaveLength(1)
    expect(versions[0]).toMatch(/^db-.*\.sqlite$/)

    // Облачная БД валидна и содержит данные (снимок консистентен).
    const cloudDb = new Database(paths.cloudDb, { readonly: true })
    const row = cloudDb.query('SELECT title FROM work WHERE id = 1').get() as { title: string } | null
    expect(row?.title).toBe('Афиша')
    cloudDb.close()

    // Строгий порядок: sync (картинки) раньше первого copyto (БД).
    const subs = subcommands()
    expect(subs.indexOf('sync')).toBeLessThan(subs.indexOf('copyto'))
  })

  test('retention: версии сверх BACKUP_HISTORY_KEEP реально удаляются', async () => {
    calls.length = 0
    let n = 10
    const rclone = createRclone(recordingRunner, cfgPath)
    // Три прогона с keep=2 → в history должно остаться ровно 2 (новейшие).
    for (let i = 0; i < 3; i++) {
      await runPush({
        snapshotDb: (dest) => snapshotDatabase(db, dest),
        rclone,
        paths,
        historyKeep: 2,
        timestamp: () => `2026-07-01T00-00-${n++}-000Z`,
      })
    }
    const versions = readdirSync(paths.cloudHistory).sort()
    expect(versions).toHaveLength(2)
    expect(subcommands()).toContain('deletefile') // старые реально удалялись
  })

  test('restore на пустом окружении: сначала картинки в MinIO, затем БД — оба восстановлены', async () => {
    calls.length = 0
    const freshMinio = join(root, 'fresh-minio')
    const freshDb = join(root, 'fresh', 'db.sqlite')
    const rclone = createRclone(recordingRunner, cfgPath)

    const out = await restoreOnBoot({
      waitForMinio: async () => true,
      prepareStorage: async () => {
        mkdirSync(freshMinio, { recursive: true })
      },
      isBucketEmpty: async () =>
        !existsSync(freshMinio) || readdirSync(freshMinio).length === 0,
      dbExists: () => existsSync(freshDb),
      restoreImages: () => rclone.sync(paths.cloudMedia, freshMinio),
      restoreDb: () => rclone.copyto(paths.cloudDb, freshDb),
    })

    expect(out).toEqual({ minioReady: true, imagesRestored: true, dbRestored: true })
    expect(existsSync(join(freshMinio, 'images', '1', '10', 'thumb.webp'))).toBe(true)
    expect(existsSync(freshDb)).toBe(true)

    const restored = new Database(freshDb, { readonly: true })
    const row = restored.query('SELECT title FROM work WHERE id = 1').get() as { title: string } | null
    expect(row?.title).toBe('Афиша')
    restored.close()

    // Порядок восстановления: картинки (sync) раньше БД (copyto).
    const subs = subcommands()
    expect(subs.indexOf('sync')).toBeLessThan(subs.indexOf('copyto'))
  })

  test('restore идемпотентен: на непустом окружении rclone не вызывается', async () => {
    calls.length = 0
    const rclone = createRclone(recordingRunner, cfgPath)
    const out = await restoreOnBoot({
      waitForMinio: async () => true,
      isBucketEmpty: async () => false, // картинки на месте
      dbExists: () => true, // и БД на месте
      restoreImages: () => rclone.sync(paths.cloudMedia, join(root, 'never')),
      restoreDb: () => rclone.copyto(paths.cloudDb, join(root, 'never.sqlite')),
    })
    expect(out).toEqual({ minioReady: true, imagesRestored: false, dbRestored: false })
    expect(calls).toHaveLength(0) // ни одной rclone-команды
  })
})

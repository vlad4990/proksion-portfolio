import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createCommandRunner, createRclone, type CommandResult, type CommandRunner } from './runner.ts'

// Мок-раннер: записывает argv каждого вызова, отдаёт заданный результат.
function mockRunner(result: Partial<CommandResult> = {}) {
  const calls: string[][] = []
  const runner: CommandRunner = async (argv) => {
    calls.push([...argv])
    return { exitCode: 0, stdout: '', stderr: '', ...result }
  }
  return { runner, calls }
}

describe('createRclone — формирование команд (verify: внешние команды через инъектируемый раннер)', () => {
  test('sync: rclone --config <cfg> sync <src> <dst>', async () => {
    const m = mockRunner()
    const rc = createRclone(m.runner, '/config/rclone.conf')
    await rc.sync('minio:media', 'cloud:proksion/media')
    expect(m.calls[0]).toEqual([
      'rclone',
      '--config',
      '/config/rclone.conf',
      'sync',
      'minio:media',
      'cloud:proksion/media',
    ])
  })

  test('copyto: rclone --config <cfg> copyto <src> <dst>', async () => {
    const m = mockRunner()
    const rc = createRclone(m.runner, '/config/rclone.conf')
    await rc.copyto('/data/backup-stage/db.sqlite', 'cloud:proksion/db/db.sqlite')
    expect(m.calls[0]).toEqual([
      'rclone',
      '--config',
      '/config/rclone.conf',
      'copyto',
      '/data/backup-stage/db.sqlite',
      'cloud:proksion/db/db.sqlite',
    ])
  })

  test('lsf: команда верна и stdout парсится в имена (пустые строки отброшены)', async () => {
    const m = mockRunner({ stdout: 'db-1.sqlite\ndb-2.sqlite\n\n' })
    const rc = createRclone(m.runner, '/c')
    const names = await rc.lsf('cloud:proksion/db/history')
    expect(m.calls[0]).toEqual(['rclone', '--config', '/c', 'lsf', 'cloud:proksion/db/history'])
    expect(names).toEqual(['db-1.sqlite', 'db-2.sqlite'])
  })

  test('deletefile: rclone --config <cfg> deletefile <remote>', async () => {
    const m = mockRunner()
    const rc = createRclone(m.runner, '/c')
    await rc.deletefile('cloud:proksion/db/history/db-old.sqlite')
    expect(m.calls[0]).toEqual([
      'rclone',
      '--config',
      '/c',
      'deletefile',
      'cloud:proksion/db/history/db-old.sqlite',
    ])
  })

  test('кастомный бинарь rclone учитывается в argv[0]', async () => {
    const m = mockRunner()
    const rc = createRclone(m.runner, '/c', '/usr/local/bin/rclone')
    await rc.sync('a', 'b')
    expect(m.calls[0]?.[0]).toBe('/usr/local/bin/rclone')
  })

  test('ненулевой exit-код → ошибка (со stderr в сообщении)', async () => {
    const m = mockRunner({ exitCode: 1, stderr: 'directory not found' })
    const rc = createRclone(m.runner, '/c')
    await expect(rc.sync('a', 'b')).rejects.toThrow(/directory not found/)
  })
})

// Интеграция против РЕАЛЬНОГО rclone-бинаря (local remote = обычные пути; облако не нужно).
// Гейтится наличием rclone на машине — как storage-тесты гейтятся доступностью MinIO.
const rcloneBin = Bun.which('rclone')

describe.skipIf(!rcloneBin)('createCommandRunner + rclone (integration, local paths)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rclone-it-'))
  const cfgPath = join(dir, 'rclone.conf')
  writeFileSync(cfgPath, '') // пустой конфиг: для local-путей remote не нужен
  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  test('copyto реально копирует файл через настоящий бинарь', async () => {
    const src = join(dir, 'src.txt')
    const dst = join(dir, 'out', 'dst.txt')
    writeFileSync(src, 'payload')
    const rc = createRclone(createCommandRunner(), cfgPath)
    await rc.copyto(src, dst)
    expect(await Bun.file(dst).text()).toBe('payload')
  })

  test('lsf реально перечисляет файлы каталога', async () => {
    const target = mkdtempSync(join(dir, 'lsf-'))
    writeFileSync(join(target, 'db-a.sqlite'), '1')
    writeFileSync(join(target, 'db-b.sqlite'), '2')
    const rc = createRclone(createCommandRunner(), cfgPath)
    const names = (await rc.lsf(target)).sort()
    expect(names).toEqual(['db-a.sqlite', 'db-b.sqlite'])
  })
})

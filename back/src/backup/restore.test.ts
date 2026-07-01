import { describe, expect, test } from 'bun:test'
import { pollUntilReady, restoreOnBoot, type RestoreDeps } from './restore.ts'

// База: «пустое свежее окружение» — MinIO готов, bucket пуст, локальной БД нет.
// Отдельные тесты переопределяют нужные поля.
function deps(over: Partial<RestoreDeps>, events?: string[]): RestoreDeps {
  const push = (e: string): void => {
    events?.push(e)
  }
  return {
    waitForMinio: async () => {
      push('wait')
      return true
    },
    prepareStorage: async () => push('prepare'),
    isBucketEmpty: async () => {
      push('empty?')
      return true
    },
    dbExists: () => {
      push('dbExists?')
      return false
    },
    restoreImages: async () => push('images'),
    restoreDb: async () => push('db'),
    ...over,
  }
}

describe('restoreOnBoot — ветвление пусто/не пусто', () => {
  test('пустое окружение: тянет СНАЧАЛА картинки, ПОТОМ БД', async () => {
    const events: string[] = []
    const out = await restoreOnBoot(deps({}, events))
    expect(out).toEqual({ minioReady: true, imagesRestored: true, dbRestored: true })
    expect(events).toEqual(['wait', 'prepare', 'empty?', 'images', 'dbExists?', 'db'])
    expect(events.indexOf('images')).toBeLessThan(events.indexOf('db'))
  })

  test('непустое окружение: restore НЕ трогает данные (идемпотентный пропуск)', async () => {
    let imagesCalled = false
    let dbCalled = false
    const out = await restoreOnBoot(
      deps({
        isBucketEmpty: async () => false,
        dbExists: () => true,
        restoreImages: async () => void (imagesCalled = true),
        restoreDb: async () => void (dbCalled = true),
      }),
    )
    expect(imagesCalled).toBe(false)
    expect(dbCalled).toBe(false)
    expect(out).toEqual({ minioReady: true, imagesRestored: false, dbRestored: false })
  })

  test('частично: bucket пуст, но БД на месте → только картинки', async () => {
    let dbCalled = false
    const out = await restoreOnBoot(
      deps({ dbExists: () => true, restoreDb: async () => void (dbCalled = true) }),
    )
    expect(out.imagesRestored).toBe(true)
    expect(out.dbRestored).toBe(false)
    expect(dbCalled).toBe(false)
  })

  test('частично: картинки на месте, но БД нет → только БД', async () => {
    let imagesCalled = false
    const out = await restoreOnBoot(
      deps({ isBucketEmpty: async () => false, restoreImages: async () => void (imagesCalled = true) }),
    )
    expect(out.imagesRestored).toBe(false)
    expect(out.dbRestored).toBe(true)
    expect(imagesCalled).toBe(false)
  })
})

describe('restoreOnBoot — MinIO и устойчивость', () => {
  test('ждёт готовности MinIO ДО любых операций с хранилищем', async () => {
    const events: string[] = []
    await restoreOnBoot(deps({}, events))
    expect(events[0]).toBe('wait')
    expect(events.indexOf('wait')).toBeLessThan(events.indexOf('images'))
  })

  test('MinIO не готов → restore полностью пропущен (старт с локальными данными)', async () => {
    let imagesCalled = false
    let dbCalled = false
    const out = await restoreOnBoot(
      deps({
        waitForMinio: async () => false,
        restoreImages: async () => void (imagesCalled = true),
        restoreDb: async () => void (dbCalled = true),
      }),
    )
    expect(out).toEqual({ minioReady: false, imagesRestored: false, dbRestored: false })
    expect(imagesCalled).toBe(false)
    expect(dbCalled).toBe(false)
  })

  test('ошибка restore картинок не фатальна: логируется, БД всё равно проверяется/тянется', async () => {
    const logs: string[] = []
    let dbCalled = false
    const out = await restoreOnBoot(
      deps({
        restoreImages: async () => {
          throw new Error('cloud unreachable')
        },
        restoreDb: async () => void (dbCalled = true),
        log: (m) => void logs.push(m),
      }),
    )
    expect(out.imagesRestored).toBe(false)
    expect(out.dbRestored).toBe(true) // деградация: БД восстановлена, несмотря на сбой картинок
    expect(dbCalled).toBe(true)
    expect(logs.some((m) => /cloud unreachable/.test(m))).toBe(true)
  })
})

describe('pollUntilReady', () => {
  test('возвращает true, как только check() успешен', async () => {
    let n = 0
    const ready = await pollUntilReady(async () => ++n >= 3, {
      attempts: 5,
      delayMs: 1,
      sleep: async () => {},
    })
    expect(ready).toBe(true)
    expect(n).toBe(3)
  })

  test('исчерпав попытки без успеха, возвращает false', async () => {
    let n = 0
    const ready = await pollUntilReady(
      async () => {
        n++
        return false
      },
      { attempts: 3, delayMs: 1, sleep: async () => {} },
    )
    expect(ready).toBe(false)
    expect(n).toBe(3)
  })

  test('исключение в check() трактуется как «не готов» и не роняет опрос', async () => {
    let n = 0
    const ready = await pollUntilReady(
      async () => {
        n++
        if (n < 2) throw new Error('connection refused')
        return true
      },
      { attempts: 4, delayMs: 1, sleep: async () => {} },
    )
    expect(ready).toBe(true)
    expect(n).toBe(2)
  })
})

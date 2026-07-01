import { describe, expect, test } from 'bun:test'
import { loadConfig } from './config.ts'

describe('loadConfig', () => {
  test('defaults when env is empty', () => {
    const cfg = loadConfig({})
    expect(cfg.databasePath).toBe('/data/db.sqlite')
    expect(cfg.backPort).toBe(3001)
  })

  test('overrides from env', () => {
    const cfg = loadConfig({ DATABASE_PATH: '/tmp/x.sqlite', BACK_PORT: '4000' })
    expect(cfg.databasePath).toBe('/tmp/x.sqlite')
    expect(cfg.backPort).toBe(4000)
  })

  test('invalid / non-numeric BACK_PORT falls back to default', () => {
    expect(loadConfig({ BACK_PORT: 'not-a-number' }).backPort).toBe(3001)
    expect(loadConfig({ BACK_PORT: '0' }).backPort).toBe(3001)
    expect(loadConfig({ BACK_PORT: '-5' }).backPort).toBe(3001)
  })
})

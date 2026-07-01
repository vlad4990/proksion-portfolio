import { describe, expect, test } from 'bun:test'
import { loadBackupConfig } from './config.ts'

describe('loadBackupConfig', () => {
  test('defaults when env is empty (backup opt-in → выключен по умолчанию)', () => {
    const cfg = loadBackupConfig({})
    expect(cfg.enabled).toBe(false)
    expect(cfg.debounceMs).toBe(10 * 60_000)
    expect(cfg.remote).toBe('cloud:proksion')
    expect(cfg.rcloneConfig).toBe('/config/rclone.conf')
    expect(cfg.historyKeep).toBe(14)
  })

  test('enabled только при BACKUP_ENABLED="true"', () => {
    expect(loadBackupConfig({ BACKUP_ENABLED: 'true' }).enabled).toBe(true)
    expect(loadBackupConfig({ BACKUP_ENABLED: 'false' }).enabled).toBe(false)
    expect(loadBackupConfig({ BACKUP_ENABLED: '1' }).enabled).toBe(false)
    expect(loadBackupConfig({ BACKUP_ENABLED: 'yes' }).enabled).toBe(false)
  })

  test('overrides from env', () => {
    const cfg = loadBackupConfig({
      BACKUP_ENABLED: 'true',
      BACKUP_DEBOUNCE_MINUTES: '5',
      BACKUP_REMOTE: 'cloud:custom/path',
      RCLONE_CONFIG: '/secrets/rclone.conf',
      BACKUP_HISTORY_KEEP: '7',
    })
    expect(cfg.debounceMs).toBe(5 * 60_000)
    expect(cfg.remote).toBe('cloud:custom/path')
    expect(cfg.rcloneConfig).toBe('/secrets/rclone.conf')
    expect(cfg.historyKeep).toBe(7)
  })

  test('invalid / non-positive numbers fall back to defaults', () => {
    expect(loadBackupConfig({ BACKUP_DEBOUNCE_MINUTES: 'abc' }).debounceMs).toBe(10 * 60_000)
    expect(loadBackupConfig({ BACKUP_DEBOUNCE_MINUTES: '0' }).debounceMs).toBe(10 * 60_000)
    expect(loadBackupConfig({ BACKUP_DEBOUNCE_MINUTES: '-3' }).debounceMs).toBe(10 * 60_000)
    expect(loadBackupConfig({ BACKUP_HISTORY_KEEP: 'nope' }).historyKeep).toBe(14)
    expect(loadBackupConfig({ BACKUP_HISTORY_KEEP: '0' }).historyKeep).toBe(14)
  })
})

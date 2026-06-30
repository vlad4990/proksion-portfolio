import { describe, expect, test } from 'bun:test'
import { loadAuthConfig } from './config.ts'

describe('loadAuthConfig', () => {
  test('safe defaults when env is empty', () => {
    const cfg = loadAuthConfig({})
    expect(cfg.passwordHash).toBe('')
    expect(cfg.jwtSecret).toBe('')
    expect(cfg.tokenTtlSeconds).toBe(60 * 60 * 2)
    expect(cfg.cookieSecure).toBe(true) // безопасно по умолчанию
    expect(cfg.loginRateLimit.max).toBe(5)
    expect(cfg.loginRateLimit.windowMs).toBe(5 * 60_000)
  })

  test('reads secrets and knobs from env', () => {
    const cfg = loadAuthConfig({
      ADMIN_PASSWORD_HASH: '$argon2id$abc',
      JWT_SECRET: 'super-secret',
      AUTH_TTL_SECONDS: '900',
      COOKIE_SECURE: 'false',
      AUTH_LOGIN_MAX: '3',
      AUTH_LOGIN_WINDOW_MINUTES: '10',
    })
    expect(cfg.passwordHash).toBe('$argon2id$abc')
    expect(cfg.jwtSecret).toBe('super-secret')
    expect(cfg.tokenTtlSeconds).toBe(900)
    expect(cfg.cookieSecure).toBe(false)
    expect(cfg.loginRateLimit.max).toBe(3)
    expect(cfg.loginRateLimit.windowMs).toBe(10 * 60_000)
  })

  test('only COOKIE_SECURE=false disables Secure; other values keep it on', () => {
    expect(loadAuthConfig({ COOKIE_SECURE: 'true' }).cookieSecure).toBe(true)
    expect(loadAuthConfig({ COOKIE_SECURE: '' }).cookieSecure).toBe(true)
    expect(loadAuthConfig({ COOKIE_SECURE: 'false' }).cookieSecure).toBe(false)
  })

  test('invalid numeric knobs fall back to defaults', () => {
    const cfg = loadAuthConfig({ AUTH_TTL_SECONDS: 'nope', AUTH_LOGIN_MAX: '0' })
    expect(cfg.tokenTtlSeconds).toBe(60 * 60 * 2)
    expect(cfg.loginRateLimit.max).toBe(5)
  })
})

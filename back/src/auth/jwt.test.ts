import { describe, expect, test } from 'bun:test'
import { signToken, verifyToken } from './jwt.ts'

const SECRET = 'test-secret-please-change-0123456789'

describe('jwt HS256 (hand-rolled, no deps)', () => {
  test('round-trips a payload', () => {
    const token = signToken({ sub: 'admin' }, SECRET, 3600)
    const payload = verifyToken(token, SECRET)
    expect(payload?.sub).toBe('admin')
    expect(typeof payload?.iat).toBe('number')
    expect(payload!.exp).toBeGreaterThan(payload!.iat)
  })

  test('produces a three-segment compact JWT', () => {
    const token = signToken({ sub: 'admin' }, SECRET, 3600)
    expect(token.split('.').length).toBe(3)
  })

  test('rejects an expired token', () => {
    const token = signToken({ sub: 'admin' }, SECRET, -10)
    expect(verifyToken(token, SECRET)).toBeNull()
  })

  test('rejects a token signed with another secret', () => {
    const token = signToken({ sub: 'admin' }, 'a-different-secret-value', 3600)
    expect(verifyToken(token, SECRET)).toBeNull()
  })

  test('rejects a tampered token', () => {
    const token = signToken({ sub: 'admin' }, SECRET, 3600)
    const [h, b, s] = token.split('.')
    expect(verifyToken(`${h}.${b}x.${s}`, SECRET)).toBeNull()
    expect(verifyToken(`${h}.${b}.${s}x`, SECRET)).toBeNull()
  })

  test('rejects garbage / malformed input', () => {
    expect(verifyToken('', SECRET)).toBeNull()
    expect(verifyToken('garbage', SECRET)).toBeNull()
    expect(verifyToken('a.b', SECRET)).toBeNull()
    expect(verifyToken('a.b.c.d', SECRET)).toBeNull()
  })
})

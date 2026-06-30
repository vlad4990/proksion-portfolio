import { describe, expect, test } from 'bun:test'
import { createRateLimiter } from './rate-limit.ts'

describe('createRateLimiter (fixed window)', () => {
  test('allows up to max hits then blocks', () => {
    const rl = createRateLimiter({ max: 3, windowMs: 1000, now: () => 0 })
    expect(rl.check('ip')).toBe(true) // 1
    expect(rl.check('ip')).toBe(true) // 2
    expect(rl.check('ip')).toBe(true) // 3
    expect(rl.check('ip')).toBe(false) // 4 → blocked
    expect(rl.check('ip')).toBe(false) // stays blocked
  })

  test('keys have independent buckets', () => {
    const rl = createRateLimiter({ max: 1, windowMs: 1000, now: () => 0 })
    expect(rl.check('a')).toBe(true)
    expect(rl.check('b')).toBe(true)
    expect(rl.check('a')).toBe(false)
  })

  test('the window resets after it elapses', () => {
    let t = 0
    const rl = createRateLimiter({ max: 1, windowMs: 1000, now: () => t })
    expect(rl.check('ip')).toBe(true)
    expect(rl.check('ip')).toBe(false)
    t = 1001
    expect(rl.check('ip')).toBe(true)
  })
})

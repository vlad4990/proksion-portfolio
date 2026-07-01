import { describe, expect, test } from 'bun:test'
import { hashPassword, verifyPassword } from './password.ts'

describe('password (argon2id via Bun.password)', () => {
  test('verifies a correct password against its hash', async () => {
    const hash = await hashPassword('correct horse battery staple')
    expect(hash.startsWith('$argon2id$')).toBe(true)
    expect(await verifyPassword('correct horse battery staple', hash)).toBe(true)
  })

  test('rejects a wrong password', async () => {
    const hash = await hashPassword('s3cret-pass')
    expect(await verifyPassword('not-the-pass', hash)).toBe(false)
  })

  test('rejects against an empty or malformed hash without throwing', async () => {
    expect(await verifyPassword('whatever', '')).toBe(false)
    expect(await verifyPassword('whatever', 'not-a-real-hash')).toBe(false)
  })
})

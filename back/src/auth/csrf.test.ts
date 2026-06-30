import { describe, expect, test } from 'bun:test'
import { CSRF_HEADER, isCsrfSafe } from './csrf.ts'

describe('isCsrfSafe', () => {
  test('read-only methods are always safe', () => {
    expect(isCsrfSafe('GET', new Headers())).toBe(true)
    expect(isCsrfSafe('HEAD', new Headers())).toBe(true)
    expect(isCsrfSafe('OPTIONS', new Headers())).toBe(true)
  })

  test('mutating methods without the header are unsafe', () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(isCsrfSafe(method, new Headers())).toBe(false)
    }
  })

  test('mutating methods with the custom header are safe', () => {
    const headers = new Headers({ [CSRF_HEADER]: 'fetch' })
    expect(isCsrfSafe('POST', headers)).toBe(true)
    expect(isCsrfSafe('delete', headers)).toBe(true)
  })
})

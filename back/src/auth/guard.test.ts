import { describe, expect, test } from 'bun:test'
import { AUTH_COOKIE, identityFromRequest, parseCookies } from './guard.ts'
import { signToken } from './jwt.ts'

const SECRET = 'guard-secret-0123456789abcdef'

describe('parseCookies', () => {
  test('parses multiple cookies', () => {
    expect(parseCookies('a=1; b=2')).toEqual({ a: '1', b: '2' })
  })

  test('tolerates spacing and empty segments', () => {
    expect(parseCookies('  x=foo ;; y=bar  ')).toEqual({ x: 'foo', y: 'bar' })
  })

  test('handles null / empty header', () => {
    expect(parseCookies(null)).toEqual({})
    expect(parseCookies('')).toEqual({})
  })
})

describe('identityFromRequest', () => {
  test('returns identity for a valid auth cookie', () => {
    const token = signToken({ sub: 'admin' }, SECRET, 3600)
    const headers = new Headers({ cookie: `${AUTH_COOKIE}=${token}` })
    expect(identityFromRequest(headers, SECRET)?.sub).toBe('admin')
  })

  test('returns null when the auth cookie is missing', () => {
    expect(identityFromRequest(new Headers(), SECRET)).toBeNull()
    expect(identityFromRequest(new Headers({ cookie: 'other=1' }), SECRET)).toBeNull()
  })

  test('returns null when the token is invalid / wrong secret', () => {
    const headers = new Headers({ cookie: `${AUTH_COOKIE}=bad.token.value` })
    expect(identityFromRequest(headers, SECRET)).toBeNull()

    const foreign = signToken({ sub: 'admin' }, 'some-other-secret', 3600)
    const h2 = new Headers({ cookie: `${AUTH_COOKIE}=${foreign}` })
    expect(identityFromRequest(h2, SECRET)).toBeNull()
  })
})

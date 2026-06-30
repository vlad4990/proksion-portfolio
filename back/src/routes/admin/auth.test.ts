import { beforeAll, describe, expect, test } from 'bun:test'
import { hashPassword } from '../../auth/password.ts'
import { adminAuthRoutes } from './auth.ts'
import type { AuthConfig } from '../../auth/config.ts'

const PASSWORD = 'test-pass-123'
const SECRET = 'integration-secret-0123456789abcdef'

let HASH = ''
beforeAll(async () => {
  HASH = await hashPassword(PASSWORD)
})

function makeApp(overrides: Partial<AuthConfig> = {}) {
  const cfg: AuthConfig = {
    passwordHash: HASH,
    jwtSecret: SECRET,
    tokenTtlSeconds: 3600,
    cookieSecure: true,
    loginRateLimit: { max: 5, windowMs: 60_000 },
    ...overrides,
  }
  return adminAuthRoutes(cfg)
}

type App = ReturnType<typeof adminAuthRoutes>

function login(app: App, password: string, headers: Record<string, string> = {}) {
  return app.handle(
    new Request('http://localhost/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify({ password }),
    }),
  )
}

/** Extract the `name=value` pair from a Set-Cookie header, for replay as a Cookie header. */
function cookieFrom(res: Response): string {
  const setCookie = res.headers.get('set-cookie') ?? ''
  return setCookie.split(';')[0] ?? ''
}

describe('POST /admin/login', () => {
  test('correct password → 200 + hardened Set-Cookie', async () => {
    const res = await login(makeApp(), PASSWORD)
    expect(res.status).toBe(200)
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('Path=/')
    expect(setCookie).toContain('SameSite=Lax')
    expect(setCookie).toContain('Secure')
  })

  test('cookieSecure=false omits the Secure flag (dev over http)', async () => {
    const res = await login(makeApp({ cookieSecure: false }), PASSWORD)
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).not.toContain('Secure')
  })

  test('wrong password → 401 and no cookie', async () => {
    const res = await login(makeApp(), 'wrong-password')
    expect(res.status).toBe(401)
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  test('missing / non-string password → 401 (no leak of which is wrong)', async () => {
    const app = makeApp()
    const res = await app.handle(
      new Request('http://localhost/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
    )
    expect(res.status).toBe(401)
  })
})

describe('GET /admin/me + guard', () => {
  test('no cookie → 401', async () => {
    const res = await makeApp().handle(new Request('http://localhost/admin/me'))
    expect(res.status).toBe(401)
  })

  test('garbage cookie → 401', async () => {
    const res = await makeApp().handle(
      new Request('http://localhost/admin/me', { headers: { cookie: 'proksion_admin=bad.tok.en' } }),
    )
    expect(res.status).toBe(401)
  })

  test('valid cookie → 200 + identity', async () => {
    const app = makeApp()
    const cookie = cookieFrom(await login(app, PASSWORD))
    const res = await app.handle(new Request('http://localhost/admin/me', { headers: { cookie } }))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { sub: string }
    expect(body.sub).toBe('admin')
  })
})

describe('POST /admin/logout', () => {
  test('with valid cookie + CSRF header → clears the cookie', async () => {
    const app = makeApp()
    const cookie = cookieFrom(await login(app, PASSWORD))
    const res = await app.handle(
      new Request('http://localhost/admin/logout', {
        method: 'POST',
        headers: { cookie, 'x-requested-with': 'fetch' },
      }),
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie') ?? '').toContain('Max-Age=0')
  })

  test('without a valid token → 401 (guard runs before CSRF)', async () => {
    const res = await makeApp().handle(
      new Request('http://localhost/admin/logout', {
        method: 'POST',
        headers: { 'x-requested-with': 'fetch' },
      }),
    )
    expect(res.status).toBe(401)
  })
})

describe('CSRF protection on mutations', () => {
  test('valid token but missing X-Requested-With → 403', async () => {
    const app = makeApp()
    const cookie = cookieFrom(await login(app, PASSWORD))
    const res = await app.handle(
      new Request('http://localhost/admin/logout', { method: 'POST', headers: { cookie } }),
    )
    expect(res.status).toBe(403)
  })
})

describe('rate-limit on /admin/login', () => {
  test('exceeding the attempt limit → 429', async () => {
    const app = makeApp({ loginRateLimit: { max: 2, windowMs: 60_000 } })
    expect((await login(app, 'wrong')).status).toBe(401)
    expect((await login(app, 'wrong')).status).toBe(401)
    expect((await login(app, 'wrong')).status).toBe(429)
  })

  test('rate-limit keys off X-Forwarded-For (per client)', async () => {
    const app = makeApp({ loginRateLimit: { max: 1, windowMs: 60_000 } })
    expect((await login(app, 'wrong', { 'x-forwarded-for': '1.1.1.1' })).status).toBe(401)
    expect((await login(app, 'wrong', { 'x-forwarded-for': '1.1.1.1' })).status).toBe(429)
    // a different client still gets its own allowance
    expect((await login(app, 'wrong', { 'x-forwarded-for': '2.2.2.2' })).status).toBe(401)
  })
})

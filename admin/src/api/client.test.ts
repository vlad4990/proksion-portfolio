import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  api,
  apiRequest,
  ApiError,
  CSRF_HEADER,
  setUnauthorizedHandler,
} from './client'

/** Хелпер: сконструировать Response с JSON-телом и статусом. */
function jsonResponse(status: number, body: unknown): Response {
  const text = body === undefined ? '' : JSON.stringify(body)
  return new Response(text, {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('apiRequest', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    setUnauthorizedHandler(null)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('GET: префиксует base /api, шлёт credentials include, без CSRF и Content-Type', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { sub: 'admin' }))

    const result = await api.get<{ sub: string }>('/admin/me')

    expect(result).toEqual({ sub: 'admin' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/admin/me')
    expect(init?.method).toBe('GET')
    expect(init?.credentials).toBe('include')
    const headers = init?.headers as Record<string, string>
    expect(headers[CSRF_HEADER]).toBeUndefined()
    expect(headers['Content-Type']).toBeUndefined()
  })

  it('POST: выставляет CSRF-заголовок, Content-Type JSON и сериализует тело', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }))

    await api.post('/admin/login', { password: 'secret' })

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/admin/login')
    expect(init?.method).toBe('POST')
    expect(init?.credentials).toBe('include')
    const headers = init?.headers as Record<string, string>
    expect(headers[CSRF_HEADER]).toBe('fetch')
    expect(headers['Content-Type']).toBe('application/json')
    expect(init?.body).toBe(JSON.stringify({ password: 'secret' }))
  })

  it.each(['PATCH', 'DELETE'] as const)('%s тоже несёт CSRF-заголовок', async (method) => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }))
    await apiRequest('/admin/works/1', { method })
    const init = fetchMock.mock.calls[0]![1]
    const headers = init?.headers as Record<string, string>
    expect(headers[CSRF_HEADER]).toBe('fetch')
  })

  it('401: дёргает onUnauthorized и бросает ApiError(401)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: 'unauthorized' }))
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)

    await expect(api.get('/admin/me')).rejects.toMatchObject({
      status: 401,
      body: { error: 'unauthorized' },
    })
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('4xx: бросает ApiError с распарсенным телом', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(400, { error: 'bad_request', detail: 'oops' }))

    const error = await api.post('/admin/categories', {}).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(400)
    expect((error as ApiError).body).toEqual({ error: 'bad_request', detail: 'oops' })
  })

  it('5xx: бросает ApiError(500) даже без валидного JSON-тела', async () => {
    fetchMock.mockResolvedValueOnce(new Response('boom', { status: 500 }))

    const error = await api.get('/admin/me').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(500)
    expect((error as ApiError).body).toBeNull()
  })

  it('успех с пустым телом → null', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
    const result = await api.delete('/admin/images/1')
    expect(result).toBeNull()
  })

  it('не дёргает onUnauthorized на успешном запросе', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }))
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    await api.get('/admin/me')
    expect(onUnauthorized).not.toHaveBeenCalled()
  })
})

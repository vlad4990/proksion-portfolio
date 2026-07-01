import { renderHook, waitFor } from '@testing-library/react'
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

const { get, post, setUnauthorizedHandler } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  setUnauthorizedHandler: vi.fn(),
}))

vi.mock('@/api/client', () => ({
  api: { get, post },
  setUnauthorizedHandler,
}))

import { AuthProvider, useSession } from './session'

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

beforeEach(() => {
  get.mockReset()
  post.mockReset()
  setUnauthorizedHandler.mockReset()
})

describe('AuthProvider / useSession', () => {
  it('восстанавливает сессию на старте через /admin/me', async () => {
    get.mockResolvedValue({ sub: 'admin' })
    const { result } = renderHook(() => useSession(), { wrapper })

    await waitFor(() => expect(result.current.status).toBe('authenticated'))
    expect(result.current.identity).toEqual({ sub: 'admin' })
    expect(get).toHaveBeenCalledWith('/admin/me')
  })

  it('при провале /admin/me становится unauthenticated', async () => {
    get.mockRejectedValue(new Error('401'))
    const { result } = renderHook(() => useSession(), { wrapper })

    await waitFor(() => expect(result.current.status).toBe('unauthenticated'))
    expect(result.current.identity).toBeNull()
  })

  it('login: успех логинит и подтягивает identity из /me', async () => {
    get.mockRejectedValueOnce(new Error('no session')) // mount → unauthenticated
    const { result } = renderHook(() => useSession(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('unauthenticated'))

    post.mockResolvedValueOnce({ ok: true })
    get.mockResolvedValueOnce({ sub: 'admin' }) // refresh после login
    await act(async () => {
      await result.current.login('correct-password')
    })

    expect(post).toHaveBeenCalledWith('/admin/login', { password: 'correct-password' })
    expect(result.current.status).toBe('authenticated')
    expect(result.current.identity).toEqual({ sub: 'admin' })
  })

  it('login: при неверном пароле пробрасывает ошибку и не логинит', async () => {
    get.mockRejectedValueOnce(new Error('no session'))
    const { result } = renderHook(() => useSession(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('unauthenticated'))

    post.mockRejectedValueOnce(new Error('unauthorized'))
    await expect(
      act(async () => {
        await result.current.login('wrong')
      }),
    ).rejects.toThrow('unauthorized')

    expect(result.current.status).toBe('unauthenticated')
    expect(result.current.identity).toBeNull()
  })

  it('logout: сбрасывает сессию', async () => {
    get.mockResolvedValue({ sub: 'admin' })
    const { result } = renderHook(() => useSession(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('authenticated'))

    post.mockResolvedValueOnce({ ok: true })
    await act(async () => {
      await result.current.logout()
    })

    expect(post).toHaveBeenCalledWith('/admin/logout')
    expect(result.current.status).toBe('unauthenticated')
    expect(result.current.identity).toBeNull()
  })

  it('регистрирует глобальный обработчик 401', async () => {
    get.mockResolvedValue({ sub: 'admin' })
    renderHook(() => useSession(), { wrapper })
    await waitFor(() => expect(setUnauthorizedHandler).toHaveBeenCalled())
    expect(setUnauthorizedHandler.mock.calls[0]![0]).toBeTypeOf('function')
  })
})

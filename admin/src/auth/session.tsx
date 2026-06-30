// Сессия-стор админки (docs/architecture.md §7, §8): один редактор, cookie-сессия на бэке.
// Состояние: loading | authenticated | unauthenticated. Восстановление при старте через
// GET /admin/me. login(password) → POST /admin/login (+ подтягивает identity из /me).
// logout() → POST /admin/logout. Любой 401 из клиента централизованно разлогинивает.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import { api, setUnauthorizedHandler } from '@/api/client'

/** Идентичность редактора из GET /admin/me (контракт back: `{ sub }`). */
export interface Identity {
  sub: string
}

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface SessionContextValue {
  status: SessionStatus
  identity: Identity | null
  /** Залогиниться паролем; при неуспехе пробрасывает ApiError (для показа ошибки формой). */
  login: (password: string) => Promise<void>
  logout: () => Promise<void>
  /** Перечитать сессию из /admin/me. */
  refresh: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading')
  const [identity, setIdentity] = useState<Identity | null>(null)

  const refresh = useCallback(async () => {
    try {
      const me = await api.get<Identity>('/admin/me')
      setIdentity(me)
      setStatus('authenticated')
    } catch {
      setIdentity(null)
      setStatus('unauthenticated')
    }
  }, [])

  const login = useCallback(
    async (password: string) => {
      // Успех — { ok: true } без identity; подтягиваем identity отдельным /me.
      await api.post('/admin/login', { password })
      await refresh()
    },
    [refresh],
  )

  const logout = useCallback(async () => {
    try {
      await api.post('/admin/logout')
    } finally {
      setIdentity(null)
      setStatus('unauthenticated')
    }
  }, [])

  // Восстановление сессии на старте.
  useEffect(() => {
    void refresh()
  }, [refresh])

  // Глобальный 401 (протухшая cookie на любом запросе) → сброс сессии.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setIdentity(null)
      setStatus('unauthenticated')
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  return (
    <SessionContext.Provider value={{ status, identity, login, logout, refresh }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) {
    throw new Error('useSession must be used within <AuthProvider>')
  }
  return ctx
}

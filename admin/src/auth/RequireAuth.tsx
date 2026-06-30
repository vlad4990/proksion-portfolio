import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'

import { useSession } from './session'

/**
 * Guard защищённых роутов: пока сессия грузится — лоадер; неаутентифицированных редиректит
 * на /login (replace, чтобы кнопка «назад» не возвращала на защищённую страницу).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useSession()

  if (status === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Загрузка…
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

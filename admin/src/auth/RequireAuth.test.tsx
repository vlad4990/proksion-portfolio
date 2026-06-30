import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }))
vi.mock('./session', () => ({ useSession }))

import { RequireAuth } from './RequireAuth'
import type { SessionStatus } from './session'

function renderGuard(status: SessionStatus) {
  useSession.mockReturnValue({ status, identity: null })
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/login" element={<div>СТРАНИЦА ЛОГИНА</div>} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <div>СЕКРЕТНЫЙ DASHBOARD</div>
            </RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  useSession.mockReset()
})

describe('RequireAuth', () => {
  it('пускает аутентифицированного к защищённому контенту', () => {
    renderGuard('authenticated')
    expect(screen.getByText('СЕКРЕТНЫЙ DASHBOARD')).toBeInTheDocument()
    expect(screen.queryByText('СТРАНИЦА ЛОГИНА')).not.toBeInTheDocument()
  })

  it('редиректит неаутентифицированного на /login', () => {
    renderGuard('unauthenticated')
    expect(screen.getByText('СТРАНИЦА ЛОГИНА')).toBeInTheDocument()
    expect(screen.queryByText('СЕКРЕТНЫЙ DASHBOARD')).not.toBeInTheDocument()
  })

  it('во время загрузки не показывает ни контент, ни логин', () => {
    renderGuard('loading')
    expect(screen.queryByText('СЕКРЕТНЫЙ DASHBOARD')).not.toBeInTheDocument()
    expect(screen.queryByText('СТРАНИЦА ЛОГИНА')).not.toBeInTheDocument()
    expect(screen.getByText('Загрузка…')).toBeInTheDocument()
  })
})

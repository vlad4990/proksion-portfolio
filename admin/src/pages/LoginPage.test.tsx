import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/api/client'

const { useSession, navigate, login } = vi.hoisted(() => ({
  useSession: vi.fn(),
  navigate: vi.fn(),
  login: vi.fn(),
}))

vi.mock('@/auth/session', () => ({ useSession }))
vi.mock('react-router-dom', async (orig) => {
  const actual = await orig<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigate }
})

import LoginPage from './LoginPage'

function renderLogin() {
  useSession.mockReturnValue({ login, status: 'unauthenticated' })
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  useSession.mockReset()
  navigate.mockReset()
  login.mockReset()
})

describe('LoginPage', () => {
  it('рендерит форму с полем пароля и кнопкой', () => {
    renderLogin()
    expect(screen.getByLabelText('Пароль')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument()
  })

  it('валидация: пустой пароль → ошибка, login не вызывается', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: 'Войти' }))

    expect(await screen.findByText('Введите пароль')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('верный пароль → login + редирект в dashboard', async () => {
    const user = userEvent.setup()
    login.mockResolvedValueOnce(undefined)
    renderLogin()

    await user.type(screen.getByLabelText('Пароль'), 'correct-password')
    await user.click(screen.getByRole('button', { name: 'Войти' }))

    await waitFor(() => expect(login).toHaveBeenCalledWith('correct-password'))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/', { replace: true }))
  })

  it('неверный пароль → ошибка, без редиректа', async () => {
    const user = userEvent.setup()
    login.mockRejectedValueOnce(new ApiError(401, { error: 'unauthorized' }))
    renderLogin()

    await user.type(screen.getByLabelText('Пароль'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Войти' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Неверный пароль')
    expect(navigate).not.toHaveBeenCalled()
  })
})

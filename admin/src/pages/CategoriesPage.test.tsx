import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CategoryNav } from '@/api/types'

const mocks = vi.hoisted(() => ({
  getCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  reorderCategories: vi.fn(),
}))
vi.mock('@/api/content', () => mocks)

import CategoriesPage from './CategoriesPage'

const cat = (id: number, slug: string, title: string): CategoryNav => ({
  id,
  slug,
  title,
  description: null,
  sort_order: 0,
  kicker: null,
  meta_role: null,
  period: null,
  display_variant: 'showcase',
  work_count: 0,
  updated_max: null,
  subcategories: [],
})

const renderPage = () =>
  render(
    <MemoryRouter>
      <CategoriesPage />
    </MemoryRouter>,
  )

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset())
})

describe('CategoriesPage', () => {
  it('загружает и показывает список категорий', async () => {
    mocks.getCategories.mockResolvedValue([cat(1, 'alpha', 'Альфа')])
    renderPage()
    expect(await screen.findByText('Альфа')).toBeInTheDocument()
  })

  it('создание: диалог → createCategory с маппингом + рефетч', async () => {
    mocks.getCategories.mockResolvedValue([])
    mocks.createCategory.mockResolvedValue(cat(2, 'beta', 'Бета'))
    renderPage()
    await screen.findByText(/Пока нет категорий/)

    await userEvent.click(screen.getByRole('button', { name: /Новая категория/ }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Название'), 'Бета')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Сохранить' }))

    await waitFor(() =>
      expect(mocks.createCategory).toHaveBeenCalledWith({ title: 'Бета', description: null }),
    )
    await waitFor(() => expect(mocks.getCategories).toHaveBeenCalledTimes(2))
  })

  it('пустое название → валидация, createCategory не вызывается', async () => {
    mocks.getCategories.mockResolvedValue([])
    renderPage()
    await screen.findByText(/Пока нет категорий/)

    await userEvent.click(screen.getByRole('button', { name: /Новая категория/ }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Сохранить' }))

    expect(await within(dialog).findByText('Введите название')).toBeInTheDocument()
    expect(mocks.createCategory).not.toHaveBeenCalled()
  })

  it('удаление: подтверждение → deleteCategory(id)', async () => {
    mocks.getCategories.mockResolvedValue([cat(1, 'alpha', 'Альфа')])
    mocks.deleteCategory.mockResolvedValue({ ok: true })
    renderPage()
    await screen.findByText('Альфа')

    await userEvent.click(screen.getByRole('button', { name: 'Удалить' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Удалить' }))

    await waitFor(() => expect(mocks.deleteCategory).toHaveBeenCalledWith(1))
  })
})

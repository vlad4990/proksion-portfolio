import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CategoryDetail } from '@/api/types'

const mocks = vi.hoisted(() => ({
  getCategory: vi.fn(),
  createSubcategory: vi.fn(),
  updateSubcategory: vi.fn(),
  deleteSubcategory: vi.fn(),
  reorderSubcategories: vi.fn(),
  updateCategory: vi.fn(),
  // используются вложенным блоком «Витрина раздела»
  getFeatured: vi.fn(),
  getWorksByCategory: vi.fn(),
  setCategoryFeatured: vi.fn(),
}))
vi.mock('@/api/content', () => mocks)

import SubcategoriesPage from './SubcategoriesPage'

const category: CategoryDetail = {
  id: 7,
  slug: 'alpha',
  title: 'Альфа',
  description: null,
  sort_order: 0,
  kicker: 'КОММЕРЧЕСКАЯ ГРАФИКА',
  meta_role: null,
  period: null,
  display_variant: 'showcase',
  description_long: null,
  work_count: 2,
  updated_max: null,
  subcategories: [
    {
      id: 11,
      slug: 'bannery',
      title: 'Баннеры',
      description: null,
      sort_order: 0,
      work_count: 2,
    },
  ],
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/categories/alpha']}>
      <Routes>
        <Route path="/categories/:catSlug" element={<SubcategoriesPage />} />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset())
  mocks.getCategory.mockResolvedValue(category)
  mocks.getFeatured.mockResolvedValue([{ cat: 'alpha', curated: false, works: [] }])
  mocks.getWorksByCategory.mockResolvedValue([])
})

describe('SubcategoriesPage', () => {
  it('счётчик работ подкатегории подписан как «работ с картинками»', async () => {
    renderPage()
    expect(await screen.findByText('Баннеры')).toBeInTheDocument()
    expect(screen.getByText('Работ с картинками')).toBeInTheDocument()
  })

  it('форма подкатегории НЕ получила полей категории', async () => {
    renderPage()
    await screen.findByText('Баннеры')

    await userEvent.click(screen.getByRole('button', { name: /Новая подкатегория/ }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Название')).toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Кикер')).not.toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Роль')).not.toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Период')).not.toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Вариант секции')).not.toBeInTheDocument()
  })

  it('«Редактировать раздел» сохраняет контент категории одним PATCH', async () => {
    mocks.updateCategory.mockResolvedValue({})
    renderPage()
    await screen.findByText('Баннеры')

    await userEvent.click(screen.getByRole('button', { name: /Редактировать раздел/ }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Кикер')).toHaveValue('КОММЕРЧЕСКАЯ ГРАФИКА')
    await userEvent.type(within(dialog).getByLabelText('Период'), '2023 — 2026')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Сохранить' }))

    await waitFor(() =>
      expect(mocks.updateCategory).toHaveBeenCalledWith(7, {
        title: 'Альфа',
        slug: 'alpha',
        description: null,
        kicker: 'КОММЕРЧЕСКАЯ ГРАФИКА',
        meta_role: null,
        period: '2023 — 2026',
        description_long: null,
        display_variant: 'showcase',
      }),
    )
  })

  it('блок витрины виден на странице категории', async () => {
    renderPage()
    expect(await screen.findByText('Витрина раздела')).toBeInTheDocument()
    expect(await screen.findByText(/Витрина не настроена/)).toBeInTheDocument()
  })
})

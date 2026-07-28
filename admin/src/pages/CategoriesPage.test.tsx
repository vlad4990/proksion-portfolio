import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CategoryDetail, CategoryNav } from '@/api/types'

const mocks = vi.hoisted(() => ({
  getCategories: vi.fn(),
  getCategory: vi.fn(),
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

const detail = (over: Partial<CategoryDetail> = {}): CategoryDetail => ({
  ...cat(1, 'alpha', 'Альфа'),
  description_long: null,
  ...over,
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

  it('редактирование: форма догружает деталь и показывает контентные поля раздела', async () => {
    mocks.getCategories.mockResolvedValue([cat(1, 'alpha', 'Альфа')])
    mocks.getCategory.mockResolvedValue(
      detail({
        kicker: 'КОММЕРЧЕСКАЯ ГРАФИКА',
        period: '2023 — 2026',
        description_long: 'Длинный текст',
        display_variant: 'cards',
      }),
    )
    renderPage()
    await screen.findByText('Альфа')

    await userEvent.click(screen.getByRole('button', { name: 'Редактировать' }))
    const dialog = await screen.findByRole('dialog')

    await waitFor(() => expect(mocks.getCategory).toHaveBeenCalledWith('alpha', expect.anything()))
    expect(await within(dialog).findByLabelText('Кикер')).toHaveValue('КОММЕРЧЕСКАЯ ГРАФИКА')
    expect(within(dialog).getByLabelText('Период')).toHaveValue('2023 — 2026')
    expect(within(dialog).getByLabelText('Длинное описание')).toHaveValue('Длинный текст')
    expect(within(dialog).getByLabelText('Вариант секции')).toHaveValue('cards')
  })

  it('редактирование: правки контента уходят в updateCategory, очищенные поля → null', async () => {
    mocks.getCategories.mockResolvedValue([cat(1, 'alpha', 'Альфа')])
    mocks.getCategory.mockResolvedValue(detail({ kicker: 'СТАРЫЙ КИКЕР' }))
    mocks.updateCategory.mockResolvedValue({})
    renderPage()
    await screen.findByText('Альфа')

    await userEvent.click(screen.getByRole('button', { name: 'Редактировать' }))
    const dialog = await screen.findByRole('dialog')
    const kicker = await within(dialog).findByLabelText('Кикер')
    await userEvent.clear(kicker)
    await userEvent.type(within(dialog).getByLabelText('Роль'), 'SMM · ПРОМО-ГРАФИКА')
    await userEvent.selectOptions(within(dialog).getByLabelText('Вариант секции'), 'strip')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Сохранить' }))

    await waitFor(() =>
      expect(mocks.updateCategory).toHaveBeenCalledWith(1, {
        title: 'Альфа',
        slug: 'alpha',
        description: null,
        kicker: null,
        meta_role: 'SMM · ПРОМО-ГРАФИКА',
        period: null,
        description_long: null,
        display_variant: 'strip',
      }),
    )
    // список перечитан после сохранения
    await waitFor(() => expect(mocks.getCategories).toHaveBeenCalledTimes(2))
  })

  it('создание: контентных полей раздела в форме нет (их не принимает POST)', async () => {
    mocks.getCategories.mockResolvedValue([])
    renderPage()
    await screen.findByText(/Пока нет категорий/)

    await userEvent.click(screen.getByRole('button', { name: /Новая категория/ }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryByLabelText('Кикер')).not.toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Вариант секции')).not.toBeInTheDocument()
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

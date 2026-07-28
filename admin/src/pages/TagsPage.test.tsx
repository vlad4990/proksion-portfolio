import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/api/client'
import type { TagNav, TagRow } from '@/api/types'

const mocks = vi.hoisted(() => ({
  getTags: vi.fn(),
  createTag: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
  reorderTags: vi.fn(),
}))
vi.mock('@/api/content', () => mocks)

import TagsPage from './TagsPage'

const tag = (id: number, slug: string, title: string, work_count = 0): TagNav => ({
  id,
  slug,
  title,
  sort_order: id,
  work_count,
})

const row = (id: number, slug: string, title: string): TagRow => ({
  id,
  slug,
  title,
  sort_order: id,
  created_at: '2026-07-28T00:00:00Z',
  updated_at: '2026-07-28T00:00:00Z',
})

const renderPage = () =>
  render(
    <MemoryRouter>
      <TagsPage />
    </MemoryRouter>,
  )

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset())
})

describe('TagsPage', () => {
  it('показывает теги со слагом и счётчиком работ', async () => {
    mocks.getTags.mockResolvedValue([tag(1, 'identika', 'Айдентика', 12)])
    renderPage()

    expect(await screen.findByText('Айдентика')).toBeInTheDocument()
    expect(screen.getByText('identika')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('пустой список → подсказка, что чипы на сайте скрыты', async () => {
    mocks.getTags.mockResolvedValue([])
    renderPage()
    expect(await screen.findByText(/Пока нет тегов/)).toBeInTheDocument()
  })

  it('создание: только title → createTag без слага + рефетч', async () => {
    mocks.getTags.mockResolvedValue([])
    mocks.createTag.mockResolvedValue(row(2, 'aidentika', 'Айдентика'))
    renderPage()
    await screen.findByText(/Пока нет тегов/)

    await userEvent.click(screen.getByRole('button', { name: /Новый тег/ }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Название'), 'Айдентика')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(mocks.createTag).toHaveBeenCalledWith({ title: 'Айдентика' }))
    await waitFor(() => expect(mocks.getTags).toHaveBeenCalledTimes(2))
  })

  it('конфликт слага (400) → ошибка в диалоге, диалог не закрывается', async () => {
    mocks.getTags.mockResolvedValue([])
    mocks.createTag.mockRejectedValue(
      new ApiError(400, { error: 'bad_request', detail: 'slug "identika" is taken' }),
    )
    renderPage()
    await screen.findByText(/Пока нет тегов/)

    await userEvent.click(screen.getByRole('button', { name: /Новый тег/ }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Название'), 'Айдентика')
    await userEvent.type(within(dialog).getByLabelText('Слаг'), 'identika')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Сохранить' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/identika/)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // список не перечитывался: мутация провалилась
    expect(mocks.getTags).toHaveBeenCalledTimes(1)
  })

  it('переименование не трогает слаг', async () => {
    mocks.getTags.mockResolvedValue([tag(1, 'identika', 'Айдентика')])
    mocks.updateTag.mockResolvedValue(row(1, 'identika', 'Фирстиль'))
    renderPage()
    await screen.findByText('Айдентика')

    await userEvent.click(screen.getByRole('button', { name: 'Редактировать' }))
    const dialog = await screen.findByRole('dialog')
    const titleInput = within(dialog).getByLabelText('Название')
    await userEvent.clear(titleInput)
    await userEvent.type(titleInput, 'Фирстиль')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(mocks.updateTag).toHaveBeenCalledWith(1, { title: 'Фирстиль' }))
  })

  it('удаление: подтверждение с предупреждением → deleteTag(id)', async () => {
    mocks.getTags.mockResolvedValue([tag(1, 'identika', 'Айдентика')])
    mocks.deleteTag.mockResolvedValue({ ok: true })
    renderPage()
    await screen.findByText('Айдентика')

    await userEvent.click(screen.getByRole('button', { name: 'Удалить' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/снимется со всех работ/)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Удалить' }))

    await waitFor(() => expect(mocks.deleteTag).toHaveBeenCalledWith(1))
  })

  it('перестановка: «ниже» шлёт новый порядок id', async () => {
    mocks.getTags.mockResolvedValue([tag(1, 'a', 'А'), tag(2, 'b', 'Б')])
    mocks.reorderTags.mockResolvedValue({ ok: true })
    renderPage()
    await screen.findByText('А')

    await userEvent.click(screen.getAllByRole('button', { name: 'Переместить ниже' })[0]!)

    await waitFor(() => expect(mocks.reorderTags).toHaveBeenCalledWith([2, 1]))
  })
})

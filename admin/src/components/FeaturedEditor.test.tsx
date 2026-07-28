import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/api/client'
import type { FeaturedSection, FeaturedWork, Tile } from '@/api/types'

const mocks = vi.hoisted(() => ({
  getFeatured: vi.fn(),
  getWorksByCategory: vi.fn(),
  setCategoryFeatured: vi.fn(),
}))
vi.mock('@/api/content', () => mocks)

import { FeaturedEditor } from './FeaturedEditor'

const tile = (id: number, title: string | null = `Работа ${id}`): Tile => ({
  id,
  slug: `w${id}`,
  title,
  src: `/media/images/${id}/1/thumb.jpg`,
  w: 800,
  h: 600,
  cat: 'grafika',
  sub: 'bannery',
  variants: {
    avif: `/media/images/${id}/1/thumb.avif`,
    webp: `/media/images/${id}/1/thumb.webp`,
    jpg: `/media/images/${id}/1/thumb.jpg`,
  },
})

const work = (id: number, title?: string | null): FeaturedWork => ({
  ...tile(id, title === undefined ? `Работа ${id}` : title),
  description: null,
})

const section = (curated: boolean, works: FeaturedWork[]): FeaturedSection[] => [
  { cat: 'grafika', curated, works },
]

const renderEditor = () => render(<FeaturedEditor categoryId={7} catSlug="grafika" />)

/** Строка витрины (li) по названию работы. */
const featuredRow = (title: string) => screen.getByText(title).closest('li') as HTMLElement

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset())
  mocks.setCategoryFeatured.mockResolvedValue({ ok: true })
})

describe('FeaturedEditor', () => {
  it('витрина не настроена (curated: false) → подсказка про fallback, работы не выбраны', async () => {
    mocks.getFeatured.mockResolvedValue(section(false, [work(1), work(2)]))
    mocks.getWorksByCategory.mockResolvedValue([tile(1), tile(2)])
    renderEditor()

    expect(await screen.findByText(/Витрина не настроена/)).toBeInTheDocument()
    // обе работы предлагаются как кандидаты
    expect(screen.getByRole('button', { name: 'Добавить в витрину: Работа 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Добавить в витрину: Работа 2' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Очистить витрину' })).not.toBeInTheDocument()
  })

  it('кураторская витрина: первая работа помечена HERO, кандидаты её не дублируют', async () => {
    mocks.getFeatured.mockResolvedValue(section(true, [work(2), work(3)]))
    mocks.getWorksByCategory.mockResolvedValue([tile(1), tile(2), tile(3)])
    renderEditor()

    await screen.findByText('Работа 2')
    expect(within(featuredRow('Работа 2')).getByText('Hero')).toBeInTheDocument()
    expect(within(featuredRow('Работа 3')).queryByText('Hero')).not.toBeInTheDocument()
    // в кандидатах только работа вне витрины
    expect(screen.getByRole('button', { name: 'Добавить в витрину: Работа 1' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Добавить в витрину: Работа 2' }),
    ).not.toBeInTheDocument()
  })

  it('перестановка меняет порядок в отправляемом work_ids, HERO следует за первым', async () => {
    mocks.getFeatured.mockResolvedValue(section(true, [work(2), work(3)]))
    mocks.getWorksByCategory.mockResolvedValue([tile(2), tile(3)])
    renderEditor()

    await screen.findByText('Работа 2')
    await userEvent.click(
      within(featuredRow('Работа 2')).getByRole('button', { name: 'Переместить ниже' }),
    )

    await waitFor(() => expect(mocks.setCategoryFeatured).toHaveBeenCalledWith(7, [3, 2]))
    expect(within(featuredRow('Работа 3')).getByText('Hero')).toBeInTheDocument()
    expect(within(featuredRow('Работа 2')).queryByText('Hero')).not.toBeInTheDocument()
  })

  it('добавление работы дописывает её в конец витрины и перечитывает /featured', async () => {
    mocks.getFeatured.mockResolvedValue(section(true, [work(2)]))
    mocks.getWorksByCategory.mockResolvedValue([tile(2), tile(5)])
    renderEditor()

    await screen.findByText('Работа 2')
    await userEvent.click(screen.getByRole('button', { name: 'Добавить в витрину: Работа 5' }))

    await waitFor(() => expect(mocks.setCategoryFeatured).toHaveBeenCalledWith(7, [2, 5]))
    await waitFor(() => expect(mocks.getFeatured).toHaveBeenCalledTimes(2))
  })

  it('удаление работы из витрины шлёт оставшийся набор', async () => {
    mocks.getFeatured.mockResolvedValue(section(true, [work(2), work(5)]))
    mocks.getWorksByCategory.mockResolvedValue([tile(2), tile(5)])
    renderEditor()

    await screen.findByText('Работа 2')
    await userEvent.click(screen.getByRole('button', { name: 'Убрать из витрины: Работа 2' }))

    await waitFor(() => expect(mocks.setCategoryFeatured).toHaveBeenCalledWith(7, [5]))
  })

  it('«Очистить витрину» шлёт пустой массив', async () => {
    mocks.getFeatured.mockResolvedValue(section(true, [work(2)]))
    mocks.getWorksByCategory.mockResolvedValue([tile(2)])
    renderEditor()

    await screen.findByText('Работа 2')
    await userEvent.click(screen.getByRole('button', { name: 'Очистить витрину' }))

    await waitFor(() => expect(mocks.setCategoryFeatured).toHaveBeenCalledWith(7, []))
  })

  it('работа из витрины не предлагается к добавлению повторно (дубли в work_ids → 400)', async () => {
    mocks.getFeatured.mockResolvedValue(section(true, [work(2)]))
    mocks.getWorksByCategory.mockResolvedValue([tile(2), tile(5)])
    renderEditor()

    await screen.findByText('Работа 2')
    // единственный кандидат — работа вне витрины; кнопки «добавить» для работы 2 нет вовсе
    expect(screen.getAllByRole('button', { name: /Добавить в витрину/ })).toHaveLength(1)
    expect(
      screen.queryByRole('button', { name: 'Добавить в витрину: Работа 2' }),
    ).not.toBeInTheDocument()
  })

  it('отказ сервера (400) показывает ошибку и перечитывает витрину', async () => {
    mocks.getFeatured.mockResolvedValue(section(true, [work(2)]))
    mocks.getWorksByCategory.mockResolvedValue([tile(2), tile(5)])
    mocks.setCategoryFeatured.mockRejectedValue(
      new ApiError(400, { error: 'bad_request', detail: 'work 5 does not belong to this category' }),
    )
    renderEditor()

    await screen.findByText('Работа 2')
    await userEvent.click(screen.getByRole('button', { name: 'Добавить в витрину: Работа 5' }))

    await waitFor(() => expect(mocks.getFeatured).toHaveBeenCalledTimes(2))
    // витрина осталась прежней: оптимистично список не менялся
    expect(screen.getByText('Работа 2')).toBeInTheDocument()
  })

  it('работа без названия подписана номером', async () => {
    mocks.getFeatured.mockResolvedValue(section(true, [work(4, null)]))
    mocks.getWorksByCategory.mockResolvedValue([tile(4, null)])
    renderEditor()

    expect(await screen.findByText('Работа #4')).toBeInTheDocument()
  })

  it('в разделе нет видимых работ → объясняющая подсказка вместо кандидатов', async () => {
    mocks.getFeatured.mockResolvedValue(section(false, []))
    mocks.getWorksByCategory.mockResolvedValue([])
    renderEditor()

    expect(await screen.findByText(/нет работ с картинками/)).toBeInTheDocument()
  })
})

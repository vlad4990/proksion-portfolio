import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import type { TagNav } from '@/api/types'

import { WorkTagsCard } from './WorkTagsCard'

const tag = (id: number, title: string): TagNav => ({
  id,
  slug: `t${id}`,
  title,
  sort_order: id,
  work_count: 0,
})

const tags = [tag(1, 'Айдентика'), tag(2, 'Плакаты'), tag(3, 'SMM')]

const renderCard = (value: number[], onSave = vi.fn().mockResolvedValue(undefined)) => {
  render(
    <MemoryRouter>
      <WorkTagsCard tags={tags} loading={false} error={null} value={value} onSave={onSave} />
    </MemoryRouter>,
  )
  return onSave
}

const chip = (name: string) => screen.getByRole('button', { name })
const save = () => screen.getByRole('button', { name: 'Сохранить теги' })

describe('WorkTagsCard', () => {
  it('текущий набор помечен нажатыми чипами', () => {
    renderCard([2])
    expect(chip('Плакаты')).toHaveAttribute('aria-pressed', 'true')
    expect(chip('Айдентика')).toHaveAttribute('aria-pressed', 'false')
  })

  it('без изменений кнопка сохранения неактивна', () => {
    renderCard([2])
    expect(save()).toBeDisabled()
  })

  it('включение чипа шлёт ВЕСЬ набор, а не дельту', async () => {
    const onSave = renderCard([2])
    await userEvent.click(chip('SMM'))
    await userEvent.click(save())
    await waitFor(() => expect(onSave).toHaveBeenCalledWith([2, 3]))
  })

  it('снятие чипа убирает его из набора', async () => {
    const onSave = renderCard([1, 2])
    await userEvent.click(chip('Айдентика'))
    await userEvent.click(save())
    await waitFor(() => expect(onSave).toHaveBeenCalledWith([2]))
  })

  it('снятие всех тегов шлёт пустой массив', async () => {
    const onSave = renderCard([1])
    await userEvent.click(chip('Айдентика'))
    await userEvent.click(save())
    await waitFor(() => expect(onSave).toHaveBeenCalledWith([]))
  })

  it('возврат к исходному набору снова гасит кнопку (нет изменений)', async () => {
    renderCard([1])
    await userEvent.click(chip('Плакаты'))
    expect(save()).toBeEnabled()
    await userEvent.click(chip('Плакаты'))
    expect(save()).toBeDisabled()
  })

  it('пустой список тегов → подсказка вместо чипов', () => {
    render(
      <MemoryRouter>
        <WorkTagsCard tags={[]} loading={false} error={null} value={[]} onSave={vi.fn()} />
      </MemoryRouter>,
    )
    expect(screen.getByText(/Тегов пока нет/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Сохранить теги' })).not.toBeInTheDocument()
  })
})

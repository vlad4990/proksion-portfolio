import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ImageRow } from '@/api/types'

const { uploadWorkImage } = vi.hoisted(() => ({ uploadWorkImage: vi.fn() }))
vi.mock('@/api/upload', () => ({ uploadWorkImage }))

import { ImageUploader } from './ImageUploader'

const imageRow = (id: number): ImageRow => ({
  id,
  work_id: 5,
  key_base: `images/5/${id}`,
  width: 800,
  height: 600,
  alt: null,
  lqip: null,
  sort_order: 0,
  created_at: '2026-07-01',
})

const file = (name: string) => new File(['data'], name, { type: 'image/png' })

beforeEach(() => {
  uploadWorkImage.mockReset()
})

describe('ImageUploader', () => {
  it('грузит выбранные файлы последовательно и зовёт onSettled по завершении', async () => {
    let next = 1
    uploadWorkImage.mockImplementation(() => Promise.resolve(imageRow(next++)))
    const onSettled = vi.fn()
    const onUploaded = vi.fn()
    render(<ImageUploader workId={5} onSettled={onSettled} onUploaded={onUploaded} />)

    const input = screen.getByLabelText('Выбрать файлы')
    await userEvent.upload(input, [file('a.png'), file('b.png')])

    await waitFor(() => expect(uploadWorkImage).toHaveBeenCalledTimes(2))
    expect(uploadWorkImage.mock.calls[0]![0]).toBe(5)
    expect(uploadWorkImage.mock.calls[0]![1]).toBeInstanceOf(File)

    await waitFor(() => expect(onSettled).toHaveBeenCalledTimes(1))
    expect(onUploaded).toHaveBeenCalledTimes(2)
    expect(screen.getAllByText('готово')).toHaveLength(2)
  })

  it('показывает ошибку загрузки и не роняет очередь', async () => {
    uploadWorkImage.mockRejectedValueOnce(new Error('сервер недоступен'))
    const onSettled = vi.fn()
    render(<ImageUploader workId={5} onSettled={onSettled} />)

    await userEvent.upload(screen.getByLabelText('Выбрать файлы'), [file('bad.png')])

    await waitFor(() => expect(screen.getByText('ошибка')).toBeInTheDocument())
    expect(screen.getByText('сервер недоступен')).toBeInTheDocument()
    await waitFor(() => expect(onSettled).toHaveBeenCalledTimes(1))
  })
})

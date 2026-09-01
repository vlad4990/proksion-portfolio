import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { emptyWork, type WorkFormValues } from '@/forms/schemas'

import { WorkDialog } from './WorkDialog'

const renderDialog = (initialValues: WorkFormValues = emptyWork) => {
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  render(
    <WorkDialog
      open
      onOpenChange={vi.fn()}
      title="Работа"
      initialValues={initialValues}
      onSubmit={onSubmit}
    />,
  )
  return onSubmit
}

const seamlessBox = () => screen.getByRole('checkbox', { name: /единое полотно/i })
const carouselBox = () => screen.getByRole('checkbox', { name: /карусель на десктопе/i })

describe('WorkDialog — чекбокс «единое полотно»', () => {
  it('снят по умолчанию и уходит в submit как false', async () => {
    const onSubmit = renderDialog()
    expect(seamlessBox()).not.toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ seamless: false })
  })

  it('предзаполняется значением работы и переключается кликом', async () => {
    const onSubmit = renderDialog({ ...emptyWork, title: 'Полотно', seamless: true })
    expect(seamlessBox()).toBeChecked()
    await userEvent.click(seamlessBox())
    expect(seamlessBox()).not.toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ title: 'Полотно', seamless: false })
  })
})

describe('WorkDialog — чекбокс «карусель на десктопе»', () => {
  it('снят по умолчанию и уходит в submit как false', async () => {
    const onSubmit = renderDialog()
    expect(carouselBox()).not.toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ carousel: false })
  })

  it('предзаполняется значением работы и переключается кликом', async () => {
    const onSubmit = renderDialog({ ...emptyWork, title: 'Слайды', carousel: true })
    expect(carouselBox()).toBeChecked()
    await userEvent.click(carouselBox())
    expect(carouselBox()).not.toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ title: 'Слайды', carousel: false })
  })

  it('независим от «единого полотна»: оба флага уходят своими значениями', async () => {
    const onSubmit = renderDialog({ ...emptyWork, seamless: true, carousel: true })
    expect(seamlessBox()).toBeChecked()
    expect(carouselBox()).toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ seamless: true, carousel: true })
  })
})
